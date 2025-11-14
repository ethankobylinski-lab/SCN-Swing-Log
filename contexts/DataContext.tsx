import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, onSnapshot, Timestamp, deleteDoc, Query, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { User, UserRole, Team, Player, Drill, Session, DrillAssignment, DayOfWeek, PersonalGoal, PlayerProfile, TeamGoal, UserPreferences } from '../types';
import { auth, db } from '../firebaseConfig'; // Assuming db is exported from firebaseConfig
import { generateTeamCode } from '../utils/helpers';
import { resolveTeamFromJoinCode } from '../utils/membership';
import { MOCK_COACH, MOCK_PLAYERS, MOCK_TEAM, MOCK_DRILLS, MOCK_SESSIONS, MOCK_ASSIGNMENTS, MOCK_GOALS, MOCK_TEAM_GOALS } from '../utils/mockData';

type SessionUpdatePayload = Partial<Pick<Session, 'name' | 'drillId' | 'sets' | 'feedback' | 'reflection'>>;

// Context interface
interface IDataContext {
  currentUser: User | null;
  loading: boolean;
  databaseStatus: 'connecting' | 'ready' | 'error';
  databaseError?: string | null;
  emailSignUp: (email: string, password: string) => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<void>;
  createUserProfile: (profileData: { name: string; role: UserRole; playerProfile?: PlayerProfile }) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  logout: () => void;
  // --- Data Access ---
  getTeamsForCoach: (coachId: string) => Team[];
  getPlayersInTeam: (teamId: string) => Player[];
  getDrillsForTeam: (teamId: string) => Drill[];
  getSessionsForTeam: (teamId: string) => Session[];
  getSessionsForPlayer: (playerId: string) => Session[];
  getAssignedDrillsForPlayerToday: (playerId: string, teamId: string) => Drill[];
  createDrill: (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => Promise<void>;
  createAssignment: (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => Promise<void>;
  logSession: (sessionData: Omit<Session, 'id'>) => Promise<Session | undefined>;
  updateSession: (sessionId: string, updates: SessionUpdatePayload) => Promise<Session | undefined>;
  createTeam: (
    teamData: Omit<Team, 'id' | 'coachId'>
  ) => Promise<{ teamId: string; playerCode: string; coachCode: string } | undefined>;
  getJoinCodeForTeam: (teamId: string) => Promise<string | null>;
  getJoinCodesForTeam: (teamId: string) => Promise<{ playerCode: string; coachCode: string } | null>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  joinTeamAsPlayer: (joinCode: string) => Promise<Team>;
  joinTeamAsCoach: (joinCode: string) => Promise<Team>;
  leaveTeam: (teamId: string) => Promise<void>;
  getGoalsForPlayer: (playerId: string) => PersonalGoal[];
  createGoal: (goalData: Omit<PersonalGoal, 'id'>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<Omit<PersonalGoal, 'id' | 'playerId' | 'teamId'>>) => Promise<void>;
  getTeamGoals: (teamId: string) => TeamGoal[];
  getTeamsForPlayer: (playerId: string) => Team[];
  getCoachesForTeam: (teamId: string) => User[];
  createTeamGoal: (goalData: Omit<TeamGoal, 'id'>) => Promise<void>;
  deleteTeamGoal: (goalId: string) => Promise<void>;
  removeCoachFromTeam: (coachId: string, teamId: string) => Promise<void>;
  // --- State Management ---
  activeTeam: Team | undefined;
  activeTeamId?: string;
  setActiveTeamId: (teamId: string | undefined) => void;
  currentUserRole: UserRole | null;
  playerTeamIds: string[];
  coachTeamIds: string[];
  setDevUser?: (role: UserRole) => void;
}

// CHANGELOG: Players own their sessions and coaches see consistent team-scoped views; auth-driven role data now drives every subscription.
export const DataContext = createContext<IDataContext | undefined>(undefined);

interface TeamDocSubscriptionConfig<T extends { id: string }> {
    teamIds: string[];
    setState: React.Dispatch<React.SetStateAction<T[]>>;
    buildQuery: (teamId: string) => Query<DocumentData>;
    mapDocs: (snapshot: QuerySnapshot<DocumentData>, teamId: string) => T[];
    logLabel: string;
    onPermissionDenied?: (teamId: string, error: FirebaseError) => Promise<boolean>;
}

type DatabaseStatus = 'connecting' | 'ready' | 'error';

const normalizeUserRole = (roleValue: unknown): UserRole => {
    if (roleValue === UserRole.Coach || roleValue === UserRole.Player) {
        return roleValue;
    }
    if (typeof roleValue === 'string') {
        const normalized = roleValue.trim().toLowerCase();
        if (normalized === 'coach') return UserRole.Coach;
        if (normalized === 'player') return UserRole.Player;
    }
    return UserRole.Player;
};

const coerceStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
};

const coerceFirstStringArray = (...values: unknown[]): string[] => {
    for (const value of values) {
        const coerced = coerceStringArray(value);
        if (coerced.length > 0) {
            return coerced;
        }
    }
    return [];
};

const ensurePlayerProfile = (rawProfile: unknown): PlayerProfile => {
    const currentYear = new Date().getFullYear();
    if (rawProfile && typeof rawProfile === 'object') {
        const profile = rawProfile as Partial<PlayerProfile>;
        const batsOptions: PlayerProfile['bats'][] = ['R', 'L', 'S'];
        const throwsOptions: PlayerProfile['throws'][] = ['R', 'L'];
        return {
            gradYear: typeof profile.gradYear === 'number' ? profile.gradYear : currentYear,
            bats: batsOptions.includes(profile.bats as PlayerProfile['bats']) ? (profile.bats as PlayerProfile['bats']) : 'R',
            throws: throwsOptions.includes(profile.throws as PlayerProfile['throws']) ? (profile.throws as PlayerProfile['throws']) : 'R',
            position: typeof profile.position === 'string' ? profile.position : undefined,
        };
    }
    return {
        gradYear: currentYear,
        bats: 'R',
        throws: 'R',
    };
};

const mapUserDocument = (id: string, data: DocumentData): User => {
    const role = normalizeUserRole(data.role);
    const legacyTeams = 'teams' in data ? coerceStringArray((data as { teams?: unknown }).teams) : [];
    const teamIds = coerceFirstStringArray(data.teamIds, legacyTeams);
    const coachTeamIdsRaw = coerceStringArray(data.coachTeamIds);
    const inferredCoachTeams =
        role === UserRole.Coach ? coerceFirstStringArray(coachTeamIdsRaw, legacyTeams, teamIds) : coachTeamIdsRaw;
    const preferenceMap = typeof data.preferences === 'object' && data.preferences !== null ? (data.preferences as UserPreferences) : {};
    const normalizedCoachIds = inferredCoachTeams.length > 0 ? inferredCoachTeams : undefined;
    const baseUser: User = {
        id,
        name: typeof data.name === 'string' ? data.name : '',
        role,
        teamIds,
        coachTeamIds: normalizedCoachIds,
        isNew: Boolean(data.isNew),
        preferences: preferenceMap,
        ...(typeof data.email === 'string' ? { email: data.email } : {}),
        ...(typeof data.phoneNumber === 'string' ? { phoneNumber: data.phoneNumber } : {}),
    };

    if (role === UserRole.Player) {
        (baseUser as Player).profile = ensurePlayerProfile(data.profile);
    }

    return baseUser;
};

const mapPlayerSnapshot = (docSnap: QueryDocumentSnapshot<DocumentData>): Player | null => {
    const data = docSnap.data();
    const role = normalizeUserRole(data.role);
    if (role !== UserRole.Player) {
        return null;
    }
    const preferenceMap = typeof data.preferences === 'object' && data.preferences !== null ? (data.preferences as UserPreferences) : {};
    return {
        id: docSnap.id,
        name: typeof data.name === 'string' ? data.name : 'Player',
        role,
        profile: ensurePlayerProfile(data.profile),
        teamIds: coerceFirstStringArray(data.teamIds, 'teams' in data ? (data as { teams?: unknown }).teams : undefined),
        preferences: preferenceMap,
        ...(typeof data.email === 'string' ? { email: data.email } : {}),
        ...(typeof data.phoneNumber === 'string' ? { phoneNumber: data.phoneNumber } : {}),
    };
};

const subscribeToTeamDocs = <T extends { id: string }>({
    teamIds,
    setState,
    buildQuery,
    mapDocs,
    logLabel,
    onPermissionDenied,
}: TeamDocSubscriptionConfig<T>) => {
    const buckets = new Map<string, T[]>();

    const recompute = () => {
        const merged = Array.from(
            Array.from(buckets.values())
                .flat()
                .reduce((acc, item) => {
                    acc.set(item.id, item);
                    return acc;
                }, new Map<string, T>())
                .values(),
        );
        setState(merged);
    };

    const createSubscriber = (teamId: string) => {
        let currentUnsubscribe: (() => void) | undefined;

        const attachListener = () => {
            currentUnsubscribe = onSnapshot(
                buildQuery(teamId),
                (snapshot) => {
                    buckets.set(teamId, mapDocs(snapshot, teamId));
                    recompute();
                },
                async (error) => {
                    console.error(`Failed to load ${logLabel} for team ${teamId}:`, error);
                    if (error instanceof FirebaseError && error.code === 'permission-denied' && onPermissionDenied) {
                        try {
                            const repaired = await onPermissionDenied(teamId, error);
                            if (repaired) {
                                currentUnsubscribe?.();
                                attachListener();
                            }
                        } catch (repairError) {
                            console.error(`Unable to repair ${logLabel} subscription for team ${teamId}:`, repairError);
                        }
                    }
                },
            );
        };

        attachListener();

        return () => {
            currentUnsubscribe?.();
        };
    };

    const unsubscribers = teamIds.map(createSubscriber);

    return () => {
        unsubscribers.forEach((unsub) => unsub());
    };
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>('connecting');
    const [databaseError, setDatabaseError] = useState<string | null>(null);

    // Data state
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [teamSessions, setTeamSessions] = useState<Session[]>([]);
    const [personalSessions, setPersonalSessions] = useState<Session[]>([]);
    const [assignments, setAssignments] = useState<DrillAssignment[]>([]);
    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
    const [teamCoachesById, setTeamCoachesById] = useState<Record<string, User[]>>({});
    const [isSimulatedUser, setIsSimulatedUser] = useState(false);

    // Active team state
    const [activeTeamId, setActiveTeamId] = useState<string | undefined>();
    const activeTeam = teams.find(t => t.id === activeTeamId);


    const isDemoMode = isSimulatedUser;
    const playerTeamIds = currentUser?.teamIds ? Array.from(new Set(currentUser.teamIds)) : [];
    const resolvedCoachTeams =
        currentUser?.coachTeamIds && currentUser.coachTeamIds.length > 0
            ? currentUser.coachTeamIds
            : currentUser?.role === UserRole.Coach
                ? playerTeamIds
                : [];
    const coachTeamIds = Array.from(new Set(resolvedCoachTeams));
    const allTeamIds = Array.from(new Set([...playerTeamIds, ...coachTeamIds]));
    const playerTeamIdsKey = playerTeamIds.slice().sort().join('|');
    const coachTeamIdsKey = coachTeamIds.slice().sort().join('|');
    const watchedTeamIdsKey = allTeamIds.slice().sort().join('|');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setIsSimulatedUser(false);
                const fallbackUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName ?? '',
                    role: UserRole.Player,
                    teamIds: [],
                    coachTeamIds: [],
                    isNew: true,
                    preferences: {},
                    ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
                    ...(firebaseUser.phoneNumber ? { phoneNumber: firebaseUser.phoneNumber } : {}),
                };

                try {
                    setDatabaseStatus('connecting');
                    setDatabaseError(null);
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setCurrentUser(mapUserDocument(userSnap.id, userSnap.data()!));
                    } else {
                        setCurrentUser(fallbackUser);
                    }
                    setDatabaseStatus('ready');
                    setDatabaseError(null);
                } catch (err) {
                    console.warn('Unable to load user profile; using fallback.', err);
                    setDatabaseStatus('error');
                    setDatabaseError(err instanceof Error ? err.message : 'Unable to reach the database.');
                    setCurrentUser(fallbackUser);
                }
            } else {
                setIsSimulatedUser(false);
                setCurrentUser(null);
                setDatabaseStatus('ready');
                setDatabaseError(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const emailSignUp = async (email: string, password: string): Promise<void> => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const emailSignIn = async (email: string, password: string): Promise<void> => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const createUserProfile = async (profileData: { name: string; role: UserRole; playerProfile?: PlayerProfile }) => {
        if (!auth.currentUser) throw new Error("No authenticated user found.");
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        const newUser: Omit<User, 'id'> = {
            name: profileData.name,
            role: profileData.role,
            teamIds: [],
            ...(profileData.role === UserRole.Coach ? { coachTeamIds: [] } : {}),
            preferences: {},
            ...(auth.currentUser.email ? { email: auth.currentUser.email } : {}),
            ...(auth.currentUser.phoneNumber ? { phoneNumber: auth.currentUser.phoneNumber } : {}),
            isNew: profileData.role === UserRole.Coach,
        };
        
        if (profileData.role === UserRole.Player && profileData.playerProfile) {
            (newUser as Player).profile = profileData.playerProfile;
        }

        await setDoc(userRef, newUser);

        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            setCurrentUser(mapUserDocument(userSnap.id, userSnap.data()!));
        }
    };

    const completeOnboarding = async () => {
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
            await updateDoc(userRef, { isNew: false });
        } catch (error) {
            const errorCode = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined;
            if (errorCode !== 'permission-denied') {
                console.error('Unable to complete onboarding:', error);
                throw error;
            }
            console.warn('Skipping remote onboarding update due to permission constraints. Proceeding locally.', error);
        }
        setCurrentUser((prev) => (prev ? { ...prev, isNew: false } : prev));
    };

    const logout = () => {
        signOut(auth);
        setTeams([]);
        setPlayers([]);
        setDrills([]);
        setTeamSessions([]);
        setPersonalSessions([]);
        setAssignments([]);
        setGoals([]);
        setTeamGoals([]);
        setActiveTeamId(undefined);
        setIsSimulatedUser(false);
    };

    const setDevUser = (role: UserRole) => {
        setIsSimulatedUser(true);
        setLoading(true);
        setTeams([MOCK_TEAM]);
        setPlayers(MOCK_PLAYERS);
        setDrills(MOCK_DRILLS);
        setTeamSessions(MOCK_SESSIONS);
        setPersonalSessions(MOCK_SESSIONS);
        setAssignments(MOCK_ASSIGNMENTS);
        setGoals(MOCK_GOALS);
        setTeamGoals(MOCK_TEAM_GOALS);
        setTeamCoachesById({ [MOCK_TEAM.id]: [MOCK_COACH] });

        if (role === UserRole.Coach) {
            setCurrentUser(MOCK_COACH);
            setActiveTeamId(MOCK_TEAM.id);
        } else {
            setCurrentUser(MOCK_PLAYERS[0]);
        }
        setDatabaseStatus('ready');
        setDatabaseError(null);
        setLoading(false);
    };

    const coerceTimestampToIso = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        if (value instanceof Timestamp) {
            return value.toDate().toISOString();
        }
        if (typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)) {
            try {
                const maybeTimestamp = value as { toDate: () => Date };
                return maybeTimestamp.toDate().toISOString();
            } catch {
                return undefined;
            }
        }
        return undefined;
    };

    const mapSessionDocument = (docSnap: QueryDocumentSnapshot<DocumentData>): Session | null => {
        const data = docSnap.data();
        if (!data) {
            return null;
        }

        const createdAt = coerceTimestampToIso(data.createdAt);
        const updatedAt = coerceTimestampToIso(data.updatedAt);
        const coercedSets = Array.isArray(data.sets) ? data.sets : [];
        const session: Session = {
            id: docSnap.id,
            playerId: data.playerId,
            drillId: data.drillId,
            name: data.name,
            teamId: data.teamId,
            date: data.date,
            sets: coercedSets,
            feedback: data.feedback,
            reflection: data.reflection,
            createdAt,
            updatedAt: updatedAt ?? createdAt,
            lastEditedBy: data.lastEditedBy,
        };

        if (!session.id || !session.playerId || !session.teamId || !session.date || !session.name) {
            return null;
        }

        return session;
    };

    const sortSessionsByDate = (sessions: Session[]) =>
        sessions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const upsertSessionList = (list: Session[], session: Session) => {
        const withoutCurrent = list.filter((item) => item.id !== session.id);
        const updated = [...withoutCurrent, session];
        updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return updated;
    };

    const applySortedTeamSessions = useCallback<React.Dispatch<React.SetStateAction<Session[]>>>(
        (value) => {
            if (typeof value === 'function') {
                setTeamSessions((prev) => {
                    const next = (value as (prev: Session[]) => Session[])(prev);
                    return sortSessionsByDate(next);
                });
            } else {
                setTeamSessions(sortSessionsByDate(value));
            }
        },
        [],
    );

    useEffect(() => {
        if (!currentUser) {
            setTeams([]);
            setActiveTeamId(undefined);
            return;
        }

        if (isDemoMode) {
            return;
        }

        const teamIds = allTeamIds;
        if (teamIds.length === 0) {
            setTeams([]);
            setActiveTeamId(undefined);
            return;
        }

        const teamSnapshots = new Map<string, Team>();
        const updateTeams = () => {
            const merged = Array.from(teamSnapshots.values());
            setTeams(merged);
            setActiveTeamId((prev) => {
                if (prev && merged.some((team) => team.id === prev)) {
                    return prev;
                }
                return merged[0]?.id;
            });
        };

        const unsubscribers = teamIds.map((teamId) => {
            const teamRef = doc(db, 'teams', teamId);
            return onSnapshot(
                teamRef,
                (docSnap) => {
                    if (docSnap.exists()) {
                        teamSnapshots.set(teamId, { id: docSnap.id, ...(docSnap.data() as Omit<Team, 'id'>) });
                    } else {
                        teamSnapshots.delete(teamId);
                    }
                    updateTeams();
                },
                (error) => {
                    console.error(`Failed to load team ${teamId}:`, error);
                },
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser?.id, isDemoMode, watchedTeamIdsKey]);

    useEffect(() => {
        if (!currentUser || currentUser.role !== UserRole.Coach) {
            return;
        }
        if (isDemoMode) {
            return;
        }
        const existingCoachTeams = currentUser.coachTeamIds ?? [];
        if (existingCoachTeams.length > 0) {
            return;
        }

        let isCancelled = false;

        const backfillCoachTeams = async () => {
            try {
                const coachTeamsSnapshot = await getDocs(query(collection(db, 'teams'), where('coachId', '==', currentUser.id)));
                if (isCancelled || coachTeamsSnapshot.empty) {
                    return;
                }

                const discoveredTeamIds = coachTeamsSnapshot.docs.map((docSnap) => docSnap.id);
                if (discoveredTeamIds.length === 0) {
                    return;
                }

                const mergedIds = Array.from(new Set([...(existingCoachTeams ?? []), ...discoveredTeamIds]));

                setCurrentUser((prev) => {
                    if (!prev || prev.id !== currentUser.id) {
                        return prev;
                    }
                    return { ...prev, coachTeamIds: mergedIds };
                });

                setTeams((prev) => {
                    const merged = new Map(prev.map((team) => [team.id, team]));
                    coachTeamsSnapshot.docs.forEach((docSnap) => {
                        merged.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<Team, 'id'>) });
                    });
                    return Array.from(merged.values());
                });

                setActiveTeamId((prev) => prev ?? discoveredTeamIds[0]);

                try {
                    const userRef = doc(db, 'users', currentUser.id);
                    await updateDoc(userRef, { coachTeamIds: mergedIds });
                } catch (syncError) {
                    console.warn('Unable to sync coachTeamIds for user', currentUser.id, syncError);
                }
            } catch (error) {
                console.error('Failed to backfill coach team memberships for user', currentUser.id, error);
            }
        };

        backfillCoachTeams();

        return () => {
            isCancelled = true;
        };
    }, [currentUser?.id, currentUser?.role, currentUser?.coachTeamIds?.length, isDemoMode]);

    useEffect(() => {
        if (!currentUser) {
            setTeamSessions([]);
            return;
        }

        if (isDemoMode) {
            setTeamSessions(MOCK_SESSIONS);
            return;
        }

        if (currentUser.role !== UserRole.Coach || !activeTeamId) {
            setTeamSessions([]);
            return;
        }

        return subscribeToTeamDocs<Session>({
            teamIds: [activeTeamId],
            setState: applySortedTeamSessions,
            buildQuery: (teamId) => query(collection(db, 'sessions'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs
                    .map(mapSessionDocument)
                    .filter((session): session is Session => Boolean(session)),
            logLabel: 'team sessions',
            onPermissionDenied: (teamId) => handleCoachSubscriptionPermissionDenied(teamId, 'team sessions'),
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    useEffect(() => {
        if (!currentUser) {
            setPersonalSessions([]);
            return;
        }

        if (isDemoMode) {
            setPersonalSessions(MOCK_SESSIONS);
            return;
        }

        const personalQuery = query(collection(db, 'sessions'), where('playerId', '==', currentUser.id));
        const unsubscribe = onSnapshot(
            personalQuery,
            (snapshot) => {
                const playerSessions = snapshot.docs
                    .map(mapSessionDocument)
                    .filter((session): session is Session => Boolean(session));

                setPersonalSessions(sortSessionsByDate(playerSessions));
            },
            (error) => {
                console.error('Failed to load personal sessions:', error);
            },
        );

        return () => unsubscribe();
    }, [currentUser?.id, isDemoMode]);

    useEffect(() => {
        if (!currentUser || currentUser.role !== UserRole.Coach) {
            setPlayers([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        if (!activeTeamId) {
            setPlayers([]);
            return;
        }

        return subscribeToTeamDocs<Player>({
            teamIds: [activeTeamId],
            setState: setPlayers,
            buildQuery: (teamId) => query(collection(db, 'users'), where('teamIds', 'array-contains', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs
                    .map(mapPlayerSnapshot)
                    .filter((player): player is Player => Boolean(player)),
            logLabel: 'players',
            onPermissionDenied: (teamId, error) =>
                handleCoachSubscriptionPermissionDenied(teamId, 'the player roster'),
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    useEffect(() => {
        if (!currentUser || currentUser.role !== UserRole.Coach) {
            setTeamCoachesById({});
            return;
        }

        if (isDemoMode) {
            setTeamCoachesById({ [MOCK_TEAM.id]: [MOCK_COACH] });
            return;
        }

        if (coachTeamIds.length === 0) {
            setTeamCoachesById({});
            return;
        }

        setTeamCoachesById({});

        const unsubscribers = coachTeamIds.map((teamId) => {
            const coachesQuery = query(collection(db, 'users'), where('coachTeamIds', 'array-contains', teamId));
            return onSnapshot(
                coachesQuery,
                (snapshot) => {
                    const coaches = snapshot.docs
                        .map((docSnap) => mapUserDocument(docSnap.id, docSnap.data()))
                        .filter((user) => user.role === UserRole.Coach);
                    setTeamCoachesById((prev) => ({ ...prev, [teamId]: coaches }));
                },
                (error) => console.error(`Failed to load coaches for team ${teamId}:`, error),
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser?.id, currentUser?.role, coachTeamIdsKey, isDemoMode]);

    useEffect(() => {
        if (!currentUser) {
            setDrills([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        const teamIdsForDrills =
            currentUser.role === UserRole.Coach ? (activeTeamId ? [activeTeamId] : []) : playerTeamIds;
        if (teamIdsForDrills.length === 0) {
            setDrills([]);
            return;
        }

        return subscribeToTeamDocs<Drill>({
            teamIds: teamIdsForDrills,
            setState: setDrills,
            buildQuery: (teamId) => query(collection(db, 'drills'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<Drill, 'id'>),
                })),
            logLabel: 'drills',
            onPermissionDenied:
                currentUser.role === UserRole.Coach
                    ? (teamId) => handleCoachSubscriptionPermissionDenied(teamId, 'drills')
                    : undefined,
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    useEffect(() => {
        if (!currentUser) {
            setAssignments([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        const teamIdsForAssignments =
            currentUser.role === UserRole.Coach ? (activeTeamId ? [activeTeamId] : []) : playerTeamIds;
        if (teamIdsForAssignments.length === 0) {
            setAssignments([]);
            return;
        }

        return subscribeToTeamDocs<DrillAssignment>({
            teamIds: teamIdsForAssignments,
            setState: setAssignments,
            buildQuery: (teamId) => query(collection(db, 'assignments'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<DrillAssignment, 'id'>),
                })),
            logLabel: 'assignments',
            onPermissionDenied:
                currentUser.role === UserRole.Coach
                    ? (teamId) => handleCoachSubscriptionPermissionDenied(teamId, 'assignments')
                    : undefined,
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    useEffect(() => {
        if (!currentUser) {
            setGoals([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        if (currentUser.role === UserRole.Player) {
            const playerGoalsQuery = query(collection(db, 'personalGoals'), where('playerId', '==', currentUser.id));
            const unsubscribe = onSnapshot(
                playerGoalsQuery,
                (snapshot) => {
                    const playerGoals = snapshot.docs
                        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<PersonalGoal, 'id'>) }))
                        .filter((goal): goal is PersonalGoal => Boolean(goal.id && goal.playerId && goal.teamId));
                    setGoals(playerGoals);
                },
                (error) => {
                    console.error('Failed to load personal goals:', error);
                },
            );
            return () => unsubscribe();
        }

        if (!activeTeamId) {
            setGoals([]);
            return;
        }

        return subscribeToTeamDocs<PersonalGoal>({
            teamIds: [activeTeamId],
            setState: setGoals,
            buildQuery: (teamId) => query(collection(db, 'personalGoals'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<PersonalGoal, 'id'>) }))
                    .filter((goal): goal is PersonalGoal => Boolean(goal.id && goal.playerId && goal.teamId)),
            logLabel: 'player goals',
            onPermissionDenied: (teamId) => handleCoachSubscriptionPermissionDenied(teamId, 'player goals'),
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    useEffect(() => {
        if (!currentUser) {
            setTeamGoals([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        const teamIdsForGoals =
            currentUser.role === UserRole.Coach ? (activeTeamId ? [activeTeamId] : []) : playerTeamIds;
        if (teamIdsForGoals.length === 0) {
            setTeamGoals([]);
            return;
        }

        return subscribeToTeamDocs<TeamGoal>({
            teamIds: teamIdsForGoals,
            setState: setTeamGoals,
            buildQuery: (teamId) => query(collection(db, 'teamGoals'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<TeamGoal, 'id'>) }))
                    .filter((goal): goal is TeamGoal => Boolean(goal.id && goal.teamId)),
            logLabel: 'team goals',
            onPermissionDenied:
                currentUser.role === UserRole.Coach
                    ? (teamId) => handleCoachSubscriptionPermissionDenied(teamId, 'team goals')
                    : undefined,
        });
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, handleCoachSubscriptionPermissionDenied]);

    const ensureCoachAccess = (teamId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to manage team data.");
        }
        if (currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can perform this action.");
        }

        const hasCoachMembership = coachTeamIds.includes(teamId);
        const isHeadCoach = teams.some((team) => team.id === teamId && team.coachId === currentUser.id);

        if (!hasCoachMembership && !isHeadCoach) {
            throw new Error("You do not have permission to manage this team.");
        }
    };

    const ensureLocalCoachMembership = (teamId: string) => {
        setCurrentUser((prev) => {
            if (!prev) {
                return prev;
            }
            const existingIds = prev.coachTeamIds ?? [];
            if (existingIds.includes(teamId)) {
                return prev;
            }
            return { ...prev, coachTeamIds: [...existingIds, teamId] };
        });
    };

    const isPermissionDeniedError = (error: unknown): error is FirebaseError => {
        if (error instanceof FirebaseError) {
            return error.code === 'permission-denied';
        }
        if (typeof error === 'object' && error !== null && 'code' in error) {
            return (error as { code?: string }).code === 'permission-denied';
        }
        return false;
    };

    const repairCoachMembershipIfNeeded = useCallback(
        async (teamId: string): Promise<boolean> => {
            if (!currentUser || currentUser.role !== UserRole.Coach) {
                return false;
            }
            try {
                const userRef = doc(db, 'users', currentUser.id);
                const userSnap = await getDoc(userRef);
                const remoteCoachTeams = userSnap.exists()
                    ? coerceStringArray((userSnap.data() as { coachTeamIds?: unknown }).coachTeamIds)
                    : [];
                if (!remoteCoachTeams.includes(teamId)) {
                    await updateDoc(userRef, { coachTeamIds: arrayUnion(teamId) });
                }
                ensureLocalCoachMembership(teamId);
                return true;
            } catch (error) {
                console.warn('Unable to repair coach membership for team', teamId, error);
                return false;
            }
        },
        [currentUser],
    );

    const withCoachMembershipRetry = async <T,>(
        teamId: string,
        actionLabel: string,
        operation: () => Promise<T>,
    ): Promise<T> => {
        try {
            return await operation();
        } catch (error) {
            if (isPermissionDeniedError(error)) {
                const repaired = await repairCoachMembershipIfNeeded(teamId);
                if (repaired) {
                    return operation();
                }
            }
            console.error(`Error ${actionLabel}:`, error);
            throw error;
        }
    };

    const handleCoachSubscriptionPermissionDenied = useCallback(
        async (teamId: string, contextLabel: string) => {
            const repaired = await repairCoachMembershipIfNeeded(teamId);
            if (repaired) {
                setDatabaseStatus('ready');
                setDatabaseError(null);
                return true;
            }
            setDatabaseStatus('error');
            setDatabaseError(
                `No permission to load ${contextLabel} for team ${teamId}. Ask the head coach to add you back as a coach.`,
            );
            return false;
        },
        [repairCoachMembershipIfNeeded],
    );

    const upsertTeamCache = (team: Team) => {
        setTeams((prev) => {
            const index = prev.findIndex((existing) => existing.id === team.id);
            if (index === -1) {
                return [...prev, team];
            }
            const next = [...prev];
            next[index] = { ...prev[index], ...team };
            return next;
        });
    };

    const persistJoinCodeRecord = async (code: string, teamId: string, role: 'player' | 'coach') => {
        if (!code) return;
        try {
            const recordRef = doc(db, 'joinCodes', code);
            await setDoc(
                recordRef,
                {
                    teamId,
                    role,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true },
            );
        } catch (error) {
            console.warn(`Unable to persist join code ${code} for team ${teamId}:`, error);
        }
    };

    const syncJoinCodeRecords = async (teamId: string, playerCode?: string, coachCode?: string) => {
        const ops: Promise<void>[] = [];
        if (playerCode) {
            ops.push(persistJoinCodeRecord(playerCode, teamId, 'player'));
        }
        if (coachCode) {
            ops.push(persistJoinCodeRecord(coachCode, teamId, 'coach'));
        }
        if (ops.length > 0) {
            await Promise.all(ops);
        }
    };

    const loadTeamDocument = async (teamId: string): Promise<Team | null> => {
        try {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                return null;
            }
            const teamData = { id: teamSnap.id, ...(teamSnap.data() as Omit<Team, 'id'>) };
            upsertTeamCache(teamData);
            return teamData;
        } catch (error) {
            console.error(`Failed to load team ${teamId}:`, error);
            return null;
        }
    };

    const ensureTeamJoinCodes = async (teamId: string): Promise<{ playerCode: string; coachCode: string } | null> => {
        let team = teams.find((t) => t.id === teamId);
        if (!team) {
            team = await loadTeamDocument(teamId);
            if (!team) {
                return null;
            }
        }

        let { joinCodePlayer, joinCodeCoach } = team;
        const updates: Partial<Team> = {};

        if (!joinCodePlayer) {
            joinCodePlayer = generateTeamCode();
            updates.joinCodePlayer = joinCodePlayer;
        }
        if (!joinCodeCoach) {
            let coachCodeCandidate = generateTeamCode();
            if (joinCodePlayer) {
                while (coachCodeCandidate === joinCodePlayer) {
                    coachCodeCandidate = generateTeamCode();
                }
            }
            joinCodeCoach = coachCodeCandidate;
            updates.joinCodeCoach = joinCodeCoach;
        }

        if (Object.keys(updates).length > 0) {
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, updates);
            upsertTeamCache({ ...team, ...updates });
            team = { ...team, ...updates };
        }

        try {
            await syncJoinCodeRecords(teamId, joinCodePlayer, joinCodeCoach);
        } catch (syncError) {
            console.warn('Unable to sync join code records while ensuring codes for team', teamId, syncError);
        }

        return joinCodePlayer && joinCodeCoach
            ? { playerCode: joinCodePlayer, coachCode: joinCodeCoach }
            : null;
    };

    const updatePreferences = async (prefs: Partial<UserPreferences>) => {
        if (!currentUser) {
            throw new Error("Sign in to update your preferences.");
        }

        const basePrefs: UserPreferences = { ...(currentUser.preferences ?? {}) };
        (Object.entries(prefs) as [keyof UserPreferences, UserPreferences[keyof UserPreferences]][]).forEach(
            ([key, value]) => {
                if (value === undefined) {
                    delete basePrefs[key];
                } else {
                    basePrefs[key] = value;
                }
            },
        );

        await updateDoc(doc(db, 'users', currentUser.id), { preferences: basePrefs });
        setCurrentUser((prev) => (prev ? { ...prev, preferences: basePrefs } : prev));
    };

    // joinTeam ensures the resolved team is added once, cached locally, and becomes active if no team is selected yet.
    const joinTeam = async (joinCode: string, role: 'player' | 'coach'): Promise<Team> => {
        if (!currentUser) {
            throw new Error("Sign in to join a team.");
        }
        if (role === 'coach' && currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can join teams as coaches.");
        }
        if (role === 'player' && currentUser.role !== UserRole.Player) {
            throw new Error("Only players can join teams as players.");
        }

        const normalizedCode = joinCode.trim().toUpperCase();
        if (!normalizedCode) {
            throw new Error("Enter a valid team code.");
        }

        const membershipField = role === 'player' ? 'teamIds' : 'coachTeamIds';
        const existingIds = currentUser[membershipField] ?? [];

        const team = await resolveTeamFromJoinCode(normalizedCode, role);
        if (existingIds.includes(team.id)) {
            throw new Error("You're already a member of this team.");
        }

        await updateDoc(doc(db, 'users', currentUser.id), { [membershipField]: arrayUnion(team.id) });
        setCurrentUser((prev) => {
            if (!prev) return prev;
            const updatedIds = Array.from(new Set([...(prev[membershipField] ?? []), team.id]));
            return { ...prev, [membershipField]: updatedIds };
        });

        upsertTeamCache(team);
        const shouldActivateTeam = role === 'coach' || !activeTeamId;
        if (shouldActivateTeam) {
            setActiveTeamId(team.id);
        }

        return team;
    };

    const joinTeamAsPlayer = (joinCode: string) => joinTeam(joinCode, 'player');
    const joinTeamAsCoach = (joinCode: string) => joinTeam(joinCode, 'coach');

    // leaveTeam removes the membership entry, clears any default team that pointed to it, and drops the cached team info.
    const leaveTeam = async (teamId: string) => {
        if (!currentUser) {
            throw new Error("Sign in to manage teams.");
        }
        const membershipField = currentUser.role === UserRole.Coach ? 'coachTeamIds' : 'teamIds';
        const existingIds = currentUser[membershipField] ?? [];
        if (!existingIds.includes(teamId)) {
            throw new Error("You are not part of that team.");
        }

        const shouldClearDefaultTeam = currentUser.preferences?.defaultTeamId === teamId;
        const preferenceUpdate = shouldClearDefaultTeam
            ? (() => {
                  const cleaned = { ...(currentUser.preferences ?? {}) };
                  delete cleaned.defaultTeamId;
                  return cleaned;
              })()
            : currentUser.preferences;

        const updates: Record<string, unknown> = { [membershipField]: arrayRemove(teamId) };
        if (shouldClearDefaultTeam) {
            updates.preferences = preferenceUpdate ?? {};
        }
        await updateDoc(doc(db, 'users', currentUser.id), updates);

        setCurrentUser((prev) => {
            if (!prev) return prev;
            const filteredIds = (prev[membershipField] ?? []).filter((id) => id !== teamId);
            return {
                ...prev,
                [membershipField]: filteredIds,
                preferences: preferenceUpdate ?? prev.preferences,
            };
        });
        setTeams((prev) => prev.filter((team) => team.id !== teamId));
        if (activeTeamId === teamId) {
            setActiveTeamId(undefined);
        }
    };

    const getTeamsForCoach = (coachId: string) => {
        if (!currentUser || currentUser.id !== coachId) {
            return teams.filter(t => t.coachId === coachId);
        }
        const joinedIds = new Set(coachTeamIds);
        return teams.filter(t => t.coachId === coachId || joinedIds.has(t.id));
    };
    const getTeamsForPlayer = (playerId: string) => {
        const player = players.find(p => p.id === playerId);
        const membershipIds =
            player?.teamIds ??
            (currentUser && currentUser.id === playerId ? currentUser.teamIds : []);
        if (membershipIds.length === 0) {
            return [];
        }
        return teams.filter((team) => membershipIds.includes(team.id));
    };
    const getPlayersInTeam = (teamId: string) => players.filter(p => p.teamIds.includes(teamId));
    const getCoachesForTeam = (teamId: string) => teamCoachesById[teamId] ?? [];
    const getDrillsForTeam = (teamId: string) => drills.filter(d => d.teamId === teamId);
    const getSessionsForTeam = (teamId: string) => teamSessions.filter(s => s.teamId === teamId);
    const getSessionsForPlayer = (playerId: string) => personalSessions.filter(s => s.playerId === playerId);
    const getAssignedDrillsForPlayerToday = (playerId: string, teamId: string): Drill[] => {
        const today = new Date();
        const dayOfWeek: DayOfWeek = today.toLocaleDateString('en-US', { weekday: 'short' }) as DayOfWeek;
        
        const assignedDrillIds = assignments
            .filter(a => a.teamId === teamId && a.playerIds.includes(playerId) && a.isRecurring && a.recurringDays?.includes(dayOfWeek))
            .map(a => a.drillId);

        return drills.filter(d => assignedDrillIds.includes(d.id));
    };
    
    const createDrill = async (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to create a drill.");
        }

        if (isDemoMode) {
            if (currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can create drills.");
            }
            const newDrill: Drill = { id: `drill-${Date.now()}`, teamId, ...drillData };
            setDrills(prev => [...prev, newDrill]);
            return;
        }

        ensureCoachAccess(teamId);

        const persistDrill = async () => {
            const payload = { ...drillData, teamId, coachId: currentUser.id };
            const docRef = await addDoc(collection(db, "drills"), payload);
            setDrills(prev => {
                const withoutCurrent = prev.filter(d => d.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, teamId, ...drillData }];
            });
        };

        await withCoachMembershipRetry(teamId, 'creating drill', persistDrill);
    };
    
    const createAssignment = async (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to assign drills.");
        }

        if (isDemoMode) {
            if (currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can assign drills.");
            }
            const newAssignment: DrillAssignment = { id: `assign-${Date.now()}`, assignedDate: new Date().toISOString(), ...assignmentData };
            setAssignments(prev => [...prev, newAssignment]);
            return;
        }

        ensureCoachAccess(assignmentData.teamId);

        const persistAssignment = async () => {
            const payload = { ...assignmentData, assignedDate: new Date().toISOString(), coachId: currentUser.id };
            const docRef = await addDoc(collection(db, "assignments"), payload);
            setAssignments(prev => {
                const withoutCurrent = prev.filter(a => a.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, ...assignmentData, assignedDate: payload.assignedDate }];
            });
        };

        await withCoachMembershipRetry(assignmentData.teamId, 'creating assignment', persistAssignment);
    };
    
    const logSession = async (sessionData: Omit<Session, 'id'>): Promise<Session | undefined> => {
        if (!currentUser) {
            throw new Error("You need to be signed in to log a session.");
        }

        const timestamp = new Date().toISOString();
        if (isDemoMode && currentUser.role === UserRole.Player) {
            const newSession: Session = {
                id: `session-${Date.now()}`,
                ...sessionData,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastEditedBy: currentUser.id,
            };
            setPersonalSessions((prev) => upsertSessionList(prev, newSession));
            MOCK_SESSIONS.push(newSession);
            return newSession;
        }

        const teamId = sessionData.teamId;
        if (!teamId) {
            throw new Error("A team reference is required to log this session.");
        }

        const playerId = sessionData.playerId || currentUser.id;

        try {
            const payload: Record<string, unknown> = {
                name: sessionData.name,
                date: sessionData.date,
                sets: sessionData.sets,
                playerId,
                teamId,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastEditedBy: currentUser.id,
                loggedBy: currentUser.id,
            };

            if (sessionData.drillId) {
                payload.drillId = sessionData.drillId;
            }

            if (sessionData.feedback) {
                payload.feedback = sessionData.feedback;
            }
            if (sessionData.reflection) {
                payload.reflection = sessionData.reflection;
            }

            const docRef = await addDoc(collection(db, "sessions"), payload);
            const persistedSession: Session = {
                id: docRef.id,
                ...sessionData,
                playerId,
                teamId,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastEditedBy: currentUser.id,
            };

            if (playerId === currentUser.id) {
                setPersonalSessions((prev) => upsertSessionList(prev, persistedSession));
            }

            if (teamId === activeTeamId) {
                setTeamSessions((prev) => upsertSessionList(prev, persistedSession));
            }

            return persistedSession;
        } catch (error) {
            console.error("Error logging session: ", error);
            throw error;
        }
    };
    
    const updateSession = async (sessionId: string, updates: SessionUpdatePayload): Promise<Session | undefined> => {
        if (!currentUser) {
            throw new Error("You need to be signed in to update a session.");
        }

        const existingSession =
            personalSessions.find((session) => session.id === sessionId) ??
            teamSessions.find((session) => session.id === sessionId);
        if (!existingSession) {
            throw new Error("Session not found.");
        }

        const timestamp = new Date().toISOString();
        const mergedSession: Session = {
            ...existingSession,
            ...updates,
            updatedAt: timestamp,
            lastEditedBy: currentUser.id,
        };

        if (isDemoMode && currentUser.role === UserRole.Player) {
            setPersonalSessions((prev) => prev.map((session) => (session.id === sessionId ? mergedSession : session)));
            setTeamSessions((prev) => prev.map((session) => (session.id === sessionId ? mergedSession : session)));
            const mockIndex = MOCK_SESSIONS.findIndex((session) => session.id === sessionId);
            if (mockIndex >= 0) {
                MOCK_SESSIONS[mockIndex] = mergedSession;
            }
            return mergedSession;
        }

        const payload: Record<string, unknown> = {
            updatedAt: timestamp,
            lastEditedBy: currentUser.id,
        };

        if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
            payload.name = updates.name;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'drillId')) {
            payload.drillId = updates.drillId ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'sets')) {
            payload.sets = updates.sets;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'feedback')) {
            payload.feedback = updates.feedback ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reflection')) {
            payload.reflection = updates.reflection ?? '';
        }

        try {
            const sessionRef = doc(db, 'sessions', sessionId);
            await updateDoc(sessionRef, payload);

            setTeamSessions((prev) => prev.map((session) => (session.id === sessionId ? mergedSession : session)));
            if (mergedSession.playerId === currentUser.id) {
                setPersonalSessions((prev) => prev.map((session) => (session.id === sessionId ? mergedSession : session)));
            }
            return mergedSession;
        } catch (error) {
            console.error("Error updating session: ", error);
            throw error;
        }
    };

    const createTeam = async (
        teamData: Omit<Team, 'id' | 'coachId'>
    ): Promise<{ teamId: string; playerCode: string; coachCode: string } | undefined> => {
        const playerJoinCode = generateTeamCode();
        const coachJoinCode = generateTeamCode();

        if (isDemoMode) {
            if (!currentUser || currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can create teams.");
            }
            const newTeam: Team = {
                id: `team-${Date.now()}`,
                coachId: currentUser.id,
                ...teamData,
                joinCodePlayer: playerJoinCode,
                joinCodeCoach: coachJoinCode,
            };
            setTeams((prev) => [...prev, newTeam]);
            setCurrentUser((prev) =>
                prev ? { ...prev, coachTeamIds: [...(prev.coachTeamIds ?? []), newTeam.id] } : prev,
            );
            setActiveTeamId(newTeam.id);
            return { teamId: newTeam.id, playerCode: playerJoinCode, coachCode: coachJoinCode };
        }

        const coachUid = auth.currentUser?.uid;
        if (!coachUid) {
            throw new Error("You must be signed in to create a team.");
        }
        if (currentUser?.role !== UserRole.Coach) {
            throw new Error("Only coaches can create teams.");
        }

        try {
            const payload = {
                ...teamData,
                coachId: coachUid,
                joinCodePlayer: playerJoinCode,
                joinCodeCoach: coachJoinCode,
            };
            const teamDocRef = await addDoc(collection(db, "teams"), payload);
            const newTeam: Team = {
                id: teamDocRef.id,
                coachId: coachUid,
                ...teamData,
                joinCodePlayer: playerJoinCode,
                joinCodeCoach: coachJoinCode,
            };
            setTeams((prev) => [...prev, newTeam]);
            setActiveTeamId(teamDocRef.id);

            const coachRef = doc(db, "users", coachUid);
            const coachSnap = await getDoc(coachRef);
            try {
                if (coachSnap.exists()) {
                    await updateDoc(coachRef, {
                        role: UserRole.Coach,
                        coachTeamIds: arrayUnion(teamDocRef.id),
                    });
                } else {
                    await setDoc(
                        coachRef,
                        {
                            role: UserRole.Coach,
                            teamIds: [],
                            coachTeamIds: [teamDocRef.id],
                            preferences: {},
                        },
                        { merge: true },
                    );
                }
            } catch (membershipError) {
                console.warn('Unable to update coach membership record for new team', teamDocRef.id, membershipError);
            }
            setCurrentUser((prev) => (prev ? { ...prev, coachTeamIds: [...(prev.coachTeamIds ?? []), teamDocRef.id] } : prev));
            try {
                await syncJoinCodeRecords(teamDocRef.id, playerJoinCode, coachJoinCode);
            } catch (syncError) {
                console.warn('Unable to sync join code records for team', teamDocRef.id, syncError);
            }

            return { teamId: teamDocRef.id, playerCode: playerJoinCode, coachCode: coachJoinCode };
        } catch (error) {
            console.error("Error creating team: ", error);
            throw error instanceof Error ? error : new Error("Unable to create team.");
        }
    };
    
    const getJoinCodesForTeam = async (teamId: string): Promise<{ playerCode: string; coachCode: string } | null> => {
        const codes = await ensureTeamJoinCodes(teamId);
        if (codes) {
            return codes;
        }

        // Legacy fallback for older invite codes stored in joinCodes collection
        const fallbackQuery = query(collection(db, 'joinCodes'), where('teamId', '==', teamId));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        if (!fallbackSnapshot.empty) {
            const legacyCode = fallbackSnapshot.docs[0].id;
            return { playerCode: legacyCode, coachCode: legacyCode };
        }

        return null;
    };

    const getJoinCodeForTeam = async (teamId: string): Promise<string | null> => {
        const codes = await getJoinCodesForTeam(teamId);
        return codes?.playerCode ?? null;
    };

    const getGoalsForPlayer = (playerId: string) => goals.filter(g => g.playerId === playerId);
    
    const createGoal = async (goalData: Omit<PersonalGoal, 'id'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to create a goal.");
        }

        if (isDemoMode && currentUser.role === UserRole.Player) {
            const newGoal: PersonalGoal = { id: `goal-${Date.now()}`, ...goalData };
            setGoals(prev => [...prev, newGoal]);
            MOCK_GOALS.push(newGoal);
            return;
        }

        if (!goalData.teamId) {
            throw new Error("Join or select a team before creating a goal.");
        }

        try {
            const docRef = await addDoc(collection(db, "personalGoals"), goalData);
            setGoals(prev => {
                const withoutCurrent = prev.filter(g => g.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, ...goalData }];
            });
        } catch (error) {
            console.error("Error creating goal: ", error);
            throw error;
        }
    };
    
    const deleteGoal = async (goalId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to delete a goal.");
        }

        if (isDemoMode) {
            setGoals(prev => prev.filter(g => g.id !== goalId));
            const index = MOCK_GOALS.findIndex(g => g.id === goalId);
            if(index > -1) MOCK_GOALS.splice(index, 1);
            return;
        }

        try {
            await deleteDoc(doc(db, "personalGoals", goalId));
            setGoals(prev => prev.filter(g => g.id !== goalId));
        } catch (error) {
            console.error("Error deleting goal: ", error);
            throw error;
        }
    };

    const updateGoal = async (
        goalId: string,
        updates: Partial<Omit<PersonalGoal, 'id' | 'playerId' | 'teamId'>>,
    ) => {
        if (!currentUser) {
            throw new Error('You need to be signed in to update a goal.');
        }

        if (isDemoMode) {
            setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)));
            const index = MOCK_GOALS.findIndex((g) => g.id === goalId);
            if (index > -1) {
                MOCK_GOALS[index] = { ...MOCK_GOALS[index], ...updates };
            }
            return;
        }

        try {
            await updateDoc(doc(db, 'personalGoals', goalId), updates);
            setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)));
        } catch (error) {
            console.error('Error updating goal: ', error);
            throw error;
        }
    };

    const getTeamGoals = (teamId: string) => teamGoals.filter(g => g.teamId === teamId);

    const createTeamGoal = async (goalData: Omit<TeamGoal, 'id'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to create a team goal.");
        }

        if (isDemoMode) {
            if (currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can create team goals.");
            }
            const newGoal: TeamGoal = { id: `team-goal-${Date.now()}`, ...goalData };
            setTeamGoals(prev => [...prev, newGoal]);
            MOCK_TEAM_GOALS.push(newGoal);
            return;
        }

        if (!goalData.teamId) {
            throw new Error("Select a team before creating a team goal.");
        }

        ensureCoachAccess(goalData.teamId);

        const persistTeamGoal = async () => {
            const docRef = await addDoc(collection(db, "teamGoals"), goalData);
            setTeamGoals(prev => {
                const withoutCurrent = prev.filter(g => g.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, ...goalData }];
            });
        };

        await withCoachMembershipRetry(goalData.teamId, 'creating team goal', persistTeamGoal);
    };

    const deleteTeamGoal = async (goalId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to delete a team goal.");
        }

        if (isDemoMode) {
            if (currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can delete team goals.");
            }
            setTeamGoals(prev => prev.filter(g => g.id !== goalId));
            const index = MOCK_TEAM_GOALS.findIndex(g => g.id === goalId);
            if (index > -1) MOCK_TEAM_GOALS.splice(index, 1);
            return;
        }

        const goal = teamGoals.find((g) => g.id === goalId);
        const performDelete = async () => {
            await deleteDoc(doc(db, "teamGoals", goalId));
            setTeamGoals(prev => prev.filter(g => g.id !== goalId));
        };

        if (goal?.teamId) {
            await withCoachMembershipRetry(goal.teamId, 'deleting team goal', performDelete);
            return;
        }

        try {
            await performDelete();
        } catch (error) {
            console.error("Error deleting team goal: ", error);
            throw error;
        }
    };

    const removeCoachFromTeam = async (coachId: string, teamId: string) => {
        if (!currentUser) {
            throw new Error('Sign in to manage staff.');
        }
        const team = teams.find((t) => t.id === teamId);
        if (!team || team.coachId !== currentUser.id) {
            throw new Error('Only the head coach can remove other coaches.');
        }
        if (coachId === currentUser.id) {
            throw new Error("Head coaches can't remove themselves here.");
        }
        try {
            await updateDoc(doc(db, 'users', coachId), { coachTeamIds: arrayRemove(teamId) });
            setTeamCoachesById((prev) => {
                const existing = prev[teamId] ?? [];
                return { ...prev, [teamId]: existing.filter((coach) => coach.id !== coachId) };
            });
        } catch (error) {
            console.error('Unable to remove coach from team:', error);
            throw error;
        }
    };


    const value = {
        currentUser,
        loading,
        databaseStatus,
        databaseError,
        emailSignUp,
        emailSignIn,
        createUserProfile,
        completeOnboarding,
        logout,
        getTeamsForCoach,
        getPlayersInTeam,
        getCoachesForTeam,
        getDrillsForTeam,
        getSessionsForTeam,
        getSessionsForPlayer,
        getAssignedDrillsForPlayerToday,
        createDrill,
        createAssignment,
        logSession,
        updateSession,
        createTeam,
        getJoinCodeForTeam,
        getJoinCodesForTeam,
        updatePreferences,
        joinTeamAsPlayer,
        joinTeamAsCoach,
        leaveTeam,
        getGoalsForPlayer,
        createGoal,
        deleteGoal,
        updateGoal,
        getTeamGoals,
        getTeamsForPlayer,
        createTeamGoal,
        deleteTeamGoal,
        removeCoachFromTeam,
        activeTeam,
        activeTeamId,
        currentUserRole: currentUser?.role ?? null,
        playerTeamIds,
        coachTeamIds,
        setActiveTeamId,
        setDevUser,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
