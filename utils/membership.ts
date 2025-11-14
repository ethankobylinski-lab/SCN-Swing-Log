import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { db, functions } from '../firebaseConfig';
import { Team } from '../types';

export type JoinRole = 'player' | 'coach';

const joinFieldForRole: Record<JoinRole, keyof Pick<Team, 'joinCodePlayer' | 'joinCodeCoach'>> = {
  player: 'joinCodePlayer',
  coach: 'joinCodeCoach',
};

const createTeamFromSnapshot = (docSnap: { id: string; data: () => unknown }): Team => {
  return { id: docSnap.id, ...(docSnap.data() as Omit<Team, 'id'>) };
};

export const resolveTeamFromJoinCode = async (rawCode: string, role: JoinRole): Promise<Team> => {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Enter a valid team code.');
  }

  const callableTeam = await resolveViaCallable(normalized, role);
  if (callableTeam) {
    return callableTeam;
  }

  // Fallback to direct Firestore reads (used for local dev / older environments).
  return resolveViaFirestore(normalized, role);
};

const resolveViaCallable = async (code: string, role: JoinRole): Promise<Team | null> => {
  try {
    const resolver = httpsCallable(functions, 'resolveJoinCode');
    const result = await resolver({ code, role });
    if (result?.data) {
      return result.data as Team;
    }
    return null;
  } catch (error) {
    if (error instanceof FirebaseError) {
      const message = error.message?.toLowerCase() ?? '';
      const isMissingFunction =
        error.code === 'functions/not-found' &&
        message.includes('function') &&
        message.includes('does not exist');
      if (isMissingFunction) {
        return null;
      }
      if (error.code === 'functions/unavailable' || error.code === 'functions/internal') {
        return null;
      }
      // Surface friendly error messages from the callable.
      throw new Error(cleanCallableErrorMessage(error.message) || 'Unable to verify this team code.');
    }
    throw error;
  }
};

const cleanCallableErrorMessage = (raw?: string) => {
  if (!raw) return undefined;
  return raw.replace(/^functions\.httpsCallable.*?:\s*/i, '').trim();
};

const resolveViaFirestore = async (code: string, role: JoinRole): Promise<Team> => {
  const joinField = joinFieldForRole[role];
  let permissionDenied = false;
  try {
    const teamQuery = query(collection(db, 'teams'), where(joinField, '==', code));
    const teamSnapshot = await getDocs(teamQuery);
    if (teamSnapshot.size > 1) {
      throw new Error('Multiple teams share this code. Please ask your coach for a new one.');
    }

    if (teamSnapshot.size === 1) {
      const teamDoc = teamSnapshot.docs[0];
      return createTeamFromSnapshot(teamDoc);
    }
  } catch (error) {
    const maybeFirebaseError = error as { code?: string };
    if (maybeFirebaseError?.code === 'permission-denied') {
      permissionDenied = true;
    } else {
      throw error;
    }
  }

  // Fallback for legacy joinCode documents.
  const fallbackRef = doc(db, 'joinCodes', code);
  const fallbackSnap = await getDoc(fallbackRef);
  if (fallbackSnap.exists()) {
    const fallbackData = fallbackSnap.data() as { teamId?: string; role?: JoinRole };
    if (fallbackData.role && fallbackData.role !== role) {
      throw new Error(role === 'coach' ? 'That code is for players. Ask the head coach for the coach code.' : 'That code is reserved for coaches. Ask for the player code.');
    }
    if (!fallbackData.teamId) {
      throw new Error('Invalid or expired team code.');
    }
    const teamDoc = await getDoc(doc(db, 'teams', fallbackData.teamId));
    if (!teamDoc.exists()) {
      throw new Error('The team for this code no longer exists.');
    }
    return createTeamFromSnapshot(teamDoc);
  }

  if (permissionDenied) {
    throw new Error('Unable to verify that code. Please try again or ask the head coach to invite you.');
  }

  throw new Error(role === 'coach' ? 'Invalid coach join code.' : 'Invalid player join code.');
};
