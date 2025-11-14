const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () =>
  Array.from({length: 6}, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");

const serializeTeamDoc = (docSnap) => {
  const data = docSnap.data() || {};
  return {id: docSnap.id, ...data};
};

const ensureCoachMembership = async (teamId, coachId) => {
  if (!coachId) {
    return;
  }

  const coachRef = db.collection("users").doc(coachId);
  const coachSnap = await coachRef.get();
  const updates = {
    coachTeamIds: admin.firestore.FieldValue.arrayUnion(teamId),
    updatedAt: Date.now(),
  };

  if (!coachSnap.exists) {
    updates.role = "Coach";
    updates.teamIds = [];
  } else if (!coachSnap.data().role) {
    updates.role = "Coach";
  }

  await coachRef.set(updates, {merge: true});
};

// Create a team (adds creator as coach)
exports.createTeam = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in");
  }
  const name = String(data.name || "").trim();
  if (!name) {
    throw new functions.https.HttpsError("invalid-argument", "name required");
  }

  const ref = db.collection("teams").doc();
  await ref.set({
    id: ref.id,
    name,
    createdBy: ctx.auth.uid,
    createdAt: Date.now(),
    members: [ctx.auth.uid],
  });

  await db
      .collection("users")
      .doc(ctx.auth.uid)
      .set(
          {
            uid: ctx.auth.uid,
            createdAt: Date.now(),
            teams: admin.firestore.FieldValue.arrayUnion(ref.id),
            roleByTeam: {[ref.id]: "coach"},
          },
          {merge: true},
      );

  await db
      .collection("meta")
      .doc(`lastTeam_${ctx.auth.uid}`)
      .set({teamId: ref.id});
  await ensureCoachMembership(ref.id, ctx.auth.uid);
  return {teamId: ref.id};
});

// Generate a join code (defaults to caller's last team)
exports.createJoinCode = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in");
  }

  let teamId = data.teamId;
  if (teamId === "__SELF_LAST__" || !teamId) {
    const metaDoc = await db
        .collection("meta")
        .doc(`lastTeam_${ctx.auth.uid}`)
        .get();
    teamId = metaDoc.exists ? metaDoc.data().teamId : undefined;
  }
  if (!teamId) {
    throw new functions.https.HttpsError("invalid-argument", "teamId required");
  }

  const ttlMinutes =
    data.ttlMinutes === undefined || data.ttlMinutes === null ?
      60 :
      Number(data.ttlMinutes);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const role = (data.role || "player").toString();

  let code = makeCode();
  let tries = 0;
  while ((await db.collection("joinCodes").doc(code).get()).exists) {
    if (++tries > 5) {
      throw new functions.https.HttpsError("resource-exhausted", "Try again");
    }
    code = makeCode();
  }

  await db
      .collection("joinCodes")
      .doc(code)
      .set({
        code,
        teamId,
        role,
        createdBy: ctx.auth.uid,
        createdAt: Date.now(),
        expiresAt,
      });

  return {code, teamId, role, expiresAt};
});

// Claim a join code
exports.claimJoinCode = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in");
  }
  const code = String(data.code || "").toUpperCase();
  const ref = db.collection("joinCodes").doc(code);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Invalid code");
    }
    const jc = snap.data();
    if (jc.claimedBy) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "Already used",
      );
    }
    if (Date.now() > jc.expiresAt) {
      throw new functions.https.HttpsError("deadline-exceeded", "Expired");
    }

    const teamRef = db.collection("teams").doc(jc.teamId);
    tx.update(teamRef, {
      members: admin.firestore.FieldValue.arrayUnion(ctx.auth.uid),
    });

    const userRef = db.collection("users").doc(ctx.auth.uid);
    tx.set(
        userRef,
        {
          uid: ctx.auth.uid,
          createdAt: Date.now(),
          teams: admin.firestore.FieldValue.arrayUnion(jc.teamId),
          roleByTeam: {[jc.teamId]: jc.role},
        },
        {merge: true},
    );

    tx.update(ref, {claimedBy: ctx.auth.uid, claimedAt: Date.now()});
    return {teamId: jc.teamId, role: jc.role};
  });
});

// Resolve a join code to its team without exposing team documents publicly.
exports.resolveJoinCode = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in");
  }

  const rawCode = String((data && data.code) || "").trim().toUpperCase();
  const role = String((data && data.role) || "player").toLowerCase();

  if (!rawCode) {
    throw new functions.https.HttpsError("invalid-argument", "code required");
  }
  if (!["player", "coach"].includes(role)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "role must be player or coach",
    );
  }

  const joinField = role === "coach" ? "joinCodeCoach" : "joinCodePlayer";
  const teamQuery = await db
      .collection("teams")
      .where(joinField, "==", rawCode)
      .limit(1)
      .get();
  if (!teamQuery.empty) {
    return serializeTeamDoc(teamQuery.docs[0]);
  }

  // Fallback to legacy joinCodes documents
  const fallbackSnap = await db.collection("joinCodes").doc(rawCode).get();
  if (fallbackSnap.exists) {
    const fallbackData = fallbackSnap.data() || {};
    if (!fallbackData.teamId) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "Invalid or expired team code.",
      );
    }
    const teamDoc = await db.collection("teams").doc(fallbackData.teamId).get();
    if (!teamDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "The team for this code no longer exists.",
      );
    }
    return serializeTeamDoc(teamDoc);
  }

  throw new functions.https.HttpsError(
      "not-found",
    role === "coach" ? "Invalid coach join code." : "Invalid player join code.",
  );
});

// Clean up join codes if a team document is deleted.
exports.cleanupTeamJoinCodes = functions.firestore
    .document("teams/{teamId}")
    .onDelete(async (_, context) => {
      const {teamId} = context.params;
      if (!teamId) {
        return null;
      }

      const codesSnapshot = await db
          .collection("joinCodes")
          .where("teamId", "==", teamId)
          .get();
      if (codesSnapshot.empty) {
        return null;
      }

      const batch = db.batch();
      codesSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      return null;
    });

exports.ensureCoachMembershipOnTeamCreate = functions.firestore
    .document("teams/{teamId}")
    .onCreate(async (snap) => {
      const data = snap.data() || {};
      if (!data.coachId) {
        return null;
      }
      await ensureCoachMembership(snap.id, data.coachId);
      return null;
    });
