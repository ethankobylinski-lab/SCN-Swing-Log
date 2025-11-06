const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from({length: 6}, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

// Create a team (adds creator as coach)
exports.createTeam = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  const name = String(data.name || '').trim();
  if (!name) throw new functions.https.HttpsError('invalid-argument', 'name required');

  const ref = db.collection('teams').doc();
  await ref.set({
    id: ref.id,
    name,
    createdBy: ctx.auth.uid,
    createdAt: Date.now(),
    members: [ctx.auth.uid],
  });

  await db.collection('users').doc(ctx.auth.uid).set(
    {
      uid: ctx.auth.uid,
      createdAt: Date.now(),
      teams: admin.firestore.FieldValue.arrayUnion(ref.id),
      roleByTeam: {[ref.id]: 'coach'},
    },
    {merge: true},
  );

  await db.collection('meta').doc(`lastTeam_${ctx.auth.uid}`).set({teamId: ref.id});
  return {teamId: ref.id};
});

// Generate a join code (defaults to caller's last team)
exports.createJoinCode = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');

  let teamId = data.teamId;
  if (teamId === '__SELF_LAST__' || !teamId) {
    const m = await db.collection('meta').doc(`lastTeam_${ctx.auth.uid}`).get();
    teamId = m.exists ? m.data().teamId : undefined;
  }
  if (!teamId) throw new functions.https.HttpsError('invalid-argument', 'teamId required');

  const ttlMinutes = Number(data.ttlMinutes ?? 60);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const role = (data.role || 'player').toString();

  let code = makeCode();
  let tries = 0;
  while ((await db.collection('joinCodes').doc(code).get()).exists) {
    if (++tries > 5) throw new functions.https.HttpsError('resource-exhausted', 'Try again');
    code = makeCode();
  }

  await db.collection('joinCodes').doc(code).set({
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
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  const code = String(data.code || '').toUpperCase();
  const ref = db.collection('joinCodes').doc(code);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Invalid code');
    const jc = snap.data();
    if (jc.claimedBy) throw new functions.https.HttpsError('failed-precondition', 'Already used');
    if (Date.now() > jc.expiresAt) throw new functions.https.HttpsError('deadline-exceeded', 'Expired');

    const teamRef = db.collection('teams').doc(jc.teamId);
    tx.update(teamRef, {members: admin.firestore.FieldValue.arrayUnion(ctx.auth.uid)});

    const userRef = db.collection('users').doc(ctx.auth.uid);
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
