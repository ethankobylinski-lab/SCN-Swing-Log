import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, updateDoc, arrayUnion, onSnapshot, Timestamp, deleteDoc, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { User, UserRole, Team, Player, Drill, Session, DrillAssignment, DayOfWeek, PersonalGoal, PlayerProfile, JoinCode, TeamGoal } from '../types';
import { auth, db } from '../firebaseConfig'; // Assuming db is exported from firebaseConfig
import { generateTeamCode } from '../utils/helpers';
import { MOCK_COACH, MOCK_PLAYERS, MOCK_TEAM, MOCK_DRILLS, MOCK_SESSIONS, MOCK_ASSIGNMENTS, MOCK_GOALS, MOCK_TEAM_GOALS } from '../utils/mockData';

// Context interface
interface IDataContext {
  currentUser: User | null;
  loading: boolean;
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
  createTeam: (teamData: Omit<Team, 'id' | 'coachId'>, coachId: string) => Promise<string | undefined>;
  getJoinCodeForTeam: (teamId: string) => Promise<string | null>;
  joinTeamWithCode: (code: string, playerId: string) => Promise<void>;
  getGoalsForPlayer: (playerId: string) => PersonalGoal[];
  createGoal: (goalData: Omit<PersonalGoal, 'id'>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  getTeamGoals: (teamId: string) => TeamGoal[];
  createTeamGoal: (goalData: Omit<TeamGoal, 'id'>) => Promise<void>;
  deleteTeamGoal: (goalId: string) => Promise<void>;
  // --- State Management ---
  activeTeam: Team | undefined;
  setActiveTeamId: (teamId: string) => void;
  setDevUser?: (role: UserRole) => void;
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

interface TeamDocSubscriptionConfig<T extends { id: string }> {
    teamIds: string[];
    setState: React.Dispatch<React.SetStateAction<T[]>>;
    buildQuery: (teamId: string) => Query<DocumentData>;
    mapDocs: (snapshot: QuerySnapshot<DocumentData>, teamId: string) => T[];
    logLabel: string;
}

const subscribeToTeamDocs = <T extends { id: string }>({
    teamIds,
    setState,
    buildQuery,
    mapDocs,
    logLabel,
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

    const unsubscribers = teamIds.map((teamId) => {
        return onSnapshot(
            buildQuery(teamId),
            (snapshot) => {
                buckets.set(teamId, mapDocs(snapshot, teamId));
                recompute();
            },
            (error) => console.error(`Failed to load ${logLabel} for team ${teamId}:`, error),
        );
    });

    return () => {
        unsubscribers.forEach((unsub) => unsub());
    };
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Data state
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [assignments, setAssignments] = useState<DrillAssignment[]>([]);
    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
    const [joinCodes, setJoinCodes] = useState<JoinCode[]>([]);

    // Active team state
    const [activeTeamId, setActiveTeamId] = useState<string | undefined>();
    const activeTeam = teams.find(t => t.id === activeTeamId);

    const isDevUser = currentUser ? (currentUser.id.startsWith('player-') || currentUser.id.startsWith('coach-')) : false;
    const normalizedTeamIds = currentUser?.teamIds ? Array.from(new Set(currentUser.teamIds)) : [];
    const teamIdsKey = normalizedTeamIds.slice().sort().join('|');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const fallbackUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName ?? '',
                    role: UserRole.Player,
                    teamIds: [],
                    isNew: true,
                    ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
                    ...(firebaseUser.phoneNumber ? { phoneNumber: firebaseUser.phoneNumber } : {}),
                };

                try {
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
                    } else {
                        setCurrentUser(fallbackUser);
                    }
                } catch (err) {
                    console.warn('Unable to load user profile; using fallback.', err);
                    setCurrentUser(fallbackUser);
                }
            } else {
                setCurrentUser(null);
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
            ...(auth.currentUser.email ? { email: auth.currentUser.email } : {}),
            ...(auth.currentUser.phoneNumber ? { phoneNumber: auth.currentUser.phoneNumber } : {}),
            isNew: profileData.role === UserRole.Coach,
        };
        
        if (profileData.role === UserRole.Player && profileData.playerProfile) {
            (newUser as Player).profile = profileData.playerProfile;
        }

        await setDoc(userRef, newUser);

        const userSnap = await getDoc(userRef);
        setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
    };

    const completeOnboarding = async () => {
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { isNew: false });
        setCurrentUser(prev => prev ? { ...prev, isNew: false } : prev);
    };

    const logout = () => {
        signOut(auth);
        setTeams([]);
        setPlayers([]);
        setDrills([]);
        setSessions([]);
        setAssignments([]);
        setGoals([]);
        setTeamGoals([]);
        setActiveTeamId(undefined);
    };

    const setDevUser = (role: UserRole) => {
        setLoading(true);
        setTeams([MOCK_TEAM]);
        setPlayers(MOCK_PLAYERS);
        setDrills(MOCK_DRILLS);
        setSessions(MOCK_SESSIONS);
        setAssignments(MOCK_ASSIGNMENTS);
        setGoals(MOCK_GOALS);
        setTeamGoals(MOCK_TEAM_GOALS);

        if (role === UserRole.Coach) {
            setCurrentUser(MOCK_COACH);
            setActiveTeamId(MOCK_TEAM.id);
        } else {
            setCurrentUser(MOCK_PLAYERS[0]);
        }
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

    useEffect(() => {
        if (!currentUser) {
            setTeams([]);
            setActiveTeamId(undefined);
            return;
        }

        if (isDevUser) {
            return;
        }

        if (currentUser.role === UserRole.Coach) {
            const teamsQuery = query(collection(db, 'teams'), where('coachId', '==', currentUser.id));
            const unsubscribe = onSnapshot(
                teamsQuery,
                (snapshot) => {
                    const coachTeams = snapshot.docs
                        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Team, 'id'>) }));
                    setTeams(coachTeams);
                    setActiveTeamId((prev) => {
                        if (prev && coachTeams.some((team) => team.id === prev)) {
                            return prev;
                        }
                        return coachTeams[0]?.id;
                    });
                },
                (error) => {
                    console.error('Failed to load teams for coach:', error);
                },
            );
            return () => unsubscribe();
        }

        const teamIds = normalizedTeamIds;
        if (teamIds.length === 0) {
            setTeams([]);
            return;
        }

        const teamSnapshots = new Map<string, Team>();
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
                    setTeams(Array.from(teamSnapshots.values()));
                },
                (error) => {
                    console.error(`Failed to load team ${teamId}:`, error);
                },
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser?.id, currentUser?.role, teamIdsKey, isDevUser]);

    useEffect(() => {
        if (!currentUser) {
            setSessions([]);
            return;
        }

        if (isDevUser) {
            return;
        }

        const uniqueTeamIds = Array.from(new Set(currentUser.teamIds ?? []));
        if (uniqueTeamIds.length === 0) {
            setSessions([]);
            return;
        }

        const unsubscribers = uniqueTeamIds.map((teamId) => {
            const sessionsQuery = query(collection(db, 'sessions'), where('teamId', '==', teamId));
            return onSnapshot(
                sessionsQuery,
                (snapshot) => {
                    const teamSessions = snapshot.docs
                        .map((docSnap) => {
                            const data = docSnap.data();
                            if (!data) {
                                return undefined;
                            }

                            const createdAt = coerceTimestampToIso(data.createdAt);
                            return {
                                id: docSnap.id,
                                playerId: data.playerId,
                                drillId: data.drillId,
                                name: data.name,
                                teamId: data.teamId,
                                date: data.date,
                                sets: Array.isArray(data.sets) ? data.sets : [],
                                feedback: data.feedback,
                                createdAt,
                            } as Session;
                        })
                        .filter((session): session is Session => Boolean(session?.id && session?.playerId && session?.teamId && session?.date && session?.name));

                    teamSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    setSessions((prev) => {
                        const remaining = prev.filter((session) => session.teamId !== teamId);
                        return [...remaining, ...teamSessions];
                    });
                },
                (error) => {
                    console.error(`Failed to load sessions for team ${teamId}:`, error);
                },
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setPlayers([]);
            return;
        }

        if (isDevUser) {
            return;
        }

        if (normalizedTeamIds.length === 0) {
            setPlayers([]);
            return;
        }

        return subscribeToTeamDocs<Player>({
            teamIds: normalizedTeamIds,
            setState: setPlayers,
            buildQuery: (teamId) => query(collection(db, 'users'), where('teamIds', 'array-contains', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Player, 'id'>) }))
                    .filter((player): player is Player => player.role === UserRole.Player),
            logLabel: 'players',
        });
    }, [currentUser?.id, teamIdsKey, isDevUser]);

    useEffect(() => {
        if (!currentUser) {
            setDrills([]);
            return;
        }

        if (isDevUser) {
            return;
        }

        if (normalizedTeamIds.length === 0) {
            setDrills([]);
            return;
        }

        return subscribeToTeamDocs<Drill>({
            teamIds: normalizedTeamIds,
            setState: setDrills,
            buildQuery: (teamId) => query(collection(db, 'drills'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<Drill, 'id'>),
                })),
            logLabel: 'drills',
        });
    }, [currentUser?.id, teamIdsKey, isDevUser]);

    useEffect(() => {
        if (!currentUser) {
            setAssignments([]);
            return;
        }

        if (isDevUser) {
            return;
        }

        if (normalizedTeamIds.length === 0) {
            setAssignments([]);
            return;
        }

        return subscribeToTeamDocs<DrillAssignment>({
            teamIds: normalizedTeamIds,
            setState: setAssignments,
            buildQuery: (teamId) => query(collection(db, 'assignments'), where('teamId', '==', teamId)),
            mapDocs: (snapshot) =>
                snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<DrillAssignment, 'id'>),
                })),
            logLabel: 'assignments',
        });
    }, [currentUser?.id, teamIdsKey, isDevUser]);

    useEffect(() => {
        if (!currentUser) {
            setGoals([]);
            return;
        }

        const isDevUser = currentUser.id.startsWith('player-') || currentUser.id.startsWith('coach-');
        if (isDevUser) {
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

        const teamIds = Array.from(new Set(currentUser.teamIds ?? []));
        if (teamIds.length === 0) {
            setGoals([]);
            return;
        }

        const unsubscribers = teamIds.map((teamId) => {
            const goalsQuery = query(collection(db, 'personalGoals'), where('teamId', '==', teamId));
            return onSnapshot(
                goalsQuery,
                (snapshot) => {
                    const teamGoalsForPlayers = snapshot.docs
                        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<PersonalGoal, 'id'>) }))
                        .filter((goal): goal is PersonalGoal => Boolean(goal.id && goal.playerId && goal.teamId));
                    setGoals((prev) => {
                        const remaining = prev.filter((goal) => goal.teamId !== teamId);
                        return [...remaining, ...teamGoalsForPlayers];
                    });
                },
                (error) => {
                    console.error(`Failed to load personal goals for team ${teamId}:`, error);
                },
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setTeamGoals([]);
            return;
        }

        const isDevUser = currentUser.id.startsWith('player-') || currentUser.id.startsWith('coach-');
        if (isDevUser) {
            return;
        }

        const teamIds = Array.from(new Set(currentUser.teamIds ?? []));
        if (teamIds.length === 0) {
            setTeamGoals([]);
            return;
        }

        const unsubscribers = teamIds.map((teamId) => {
            const teamGoalsQuery = query(collection(db, 'teamGoals'), where('teamId', '==', teamId));
            return onSnapshot(
                teamGoalsQuery,
                (snapshot) => {
                    const goalsForTeam = snapshot.docs
                        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<TeamGoal, 'id'>) }))
                        .filter((goal): goal is TeamGoal => Boolean(goal.id && goal.teamId));
                    setTeamGoals((prev) => {
                        const remaining = prev.filter((goal) => goal.teamId !== teamId);
                        return [...remaining, ...goalsForTeam];
                    });
                },
                (error) => {
                    console.error(`Failed to load team goals for team ${teamId}:`, error);
                },
            );
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [currentUser]);

    const ensureCoachAccess = (teamId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to manage team data.");
        }
        if (currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can perform this action.");
        }
        if (!(currentUser.teamIds ?? []).includes(teamId)) {
            throw new Error("You do not have permission to manage this team.");
        }
    };

    const getTeamsForCoach = (coachId: string) => teams.filter(t => t.coachId === coachId);
    const getPlayersInTeam = (teamId: string) => players.filter(p => p.teamIds.includes(teamId));
    const getDrillsForTeam = (teamId: string) => drills.filter(d => d.teamId === teamId);
    const getSessionsForTeam = (teamId: string) => sessions.filter(s => s.teamId === teamId);
    const getSessionsForPlayer = (playerId: string) => sessions.filter(s => s.playerId === playerId);
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

        if(currentUser.id.startsWith('coach-')) {
            const newDrill: Drill = { id: `drill-${Date.now()}`, teamId, ...drillData };
            setDrills(prev => [...prev, newDrill]);
            return;
        }

        ensureCoachAccess(teamId);

        try {
            const payload = { ...drillData, teamId, coachId: currentUser.id };
            const docRef = await addDoc(collection(db, "drills"), payload);
            setDrills(prev => {
                const withoutCurrent = prev.filter(d => d.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, teamId, ...drillData }];
            });
        } catch (error) {
            console.error("Error creating drill: ", error);
            throw error;
        }
    };
    
    const createAssignment = async (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to assign drills.");
        }

        if(currentUser.id.startsWith('coach-')) {
            const newAssignment: DrillAssignment = { id: `assign-${Date.now()}`, assignedDate: new Date().toISOString(), ...assignmentData };
            setAssignments(prev => [...prev, newAssignment]);
            return;
        }

        ensureCoachAccess(assignmentData.teamId);

        try {
            const payload = { ...assignmentData, assignedDate: new Date().toISOString(), coachId: currentUser.id };
            const docRef = await addDoc(collection(db, "assignments"), payload);
            setAssignments(prev => {
                const withoutCurrent = prev.filter(a => a.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, ...assignmentData, assignedDate: payload.assignedDate }];
            });
        } catch (error) {
            console.error("Error creating assignment: ", error);
            throw error;
        }
    };
    
    const logSession = async (sessionData: Omit<Session, 'id'>): Promise<Session | undefined> => {
        if (!currentUser) {
            throw new Error("You need to be signed in to log a session.");
        }

        if (currentUser.id.startsWith('player-')) {
            const newSession: Session = { id: `session-${Date.now()}`, ...sessionData };
            setSessions(prev => [...prev, newSession]);
            MOCK_SESSIONS.push(newSession);
            return newSession;
        }

        const teamId = sessionData.teamId;
        if (!teamId) {
            throw new Error("A team reference is required to log this session.");
        }

        const playerId = sessionData.playerId || currentUser.id;
        const createdAt = new Date().toISOString();

        try {
            const payload: Record<string, unknown> = {
                name: sessionData.name,
                date: sessionData.date,
                sets: sessionData.sets,
                playerId,
                teamId,
                createdAt,
                loggedBy: currentUser.id,
            };

            if (sessionData.drillId) {
                payload.drillId = sessionData.drillId;
            }

            if (sessionData.feedback) {
                payload.feedback = sessionData.feedback;
            }

            const docRef = await addDoc(collection(db, "sessions"), payload);
            const persistedSession: Session = { id: docRef.id, ...sessionData, playerId, teamId, createdAt };

            setSessions(prev => {
                const withoutCurrent = prev.filter(s => s.id !== persistedSession.id);
                return [...withoutCurrent, persistedSession];
            });

            return persistedSession;
        } catch (error) {
            console.error("Error logging session: ", error);
            throw error;
        }
        return undefined;
    };
    
    const createTeam = async (teamData: Omit<Team, 'id'|'coachId'>, coachId: string): Promise<string | undefined> => {
        if(currentUser?.id.startsWith('coach-')) {
            const newTeam: Team = { id: `team-${Date.now()}`, coachId, ...teamData };
            setTeams(prev => [...prev, newTeam]);
            setActiveTeamId(newTeam.id);
            return newTeam.id;
        }
        try {
            const teamDocRef = await addDoc(collection(db, "teams"), { ...teamData, coachId });
            const newTeam: Team = { id: teamDocRef.id, coachId, ...teamData };
            setTeams(prev => [...prev, newTeam]);
            setActiveTeamId(teamDocRef.id);

            const coachRef = doc(db, "users", coachId);
            await updateDoc(coachRef, { teamIds: arrayUnion(teamDocRef.id) });
            setCurrentUser(prev => prev ? { ...prev, teamIds: [...prev.teamIds, teamDocRef.id] } : prev);

            const code = generateTeamCode();
            const joinCodeRef = doc(db, "joinCodes", code);
            await setDoc(joinCodeRef, { teamId: teamDocRef.id });
            setJoinCodes(prev => [...prev, {id: code, teamId: teamDocRef.id}]);
            return teamDocRef.id;
        } catch (error) {
            console.error("Error creating team: ", error);
            return undefined;
        }
    };
    
    const getJoinCodeForTeam = async (teamId: string): Promise<string | null> => {
        const cachedCode = joinCodes.find(c => c.teamId === teamId);
        if (cachedCode) return cachedCode.id;

        const q = query(collection(db, "joinCodes"), where("teamId", "==", teamId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const codeDoc = querySnapshot.docs[0];
            const newCode = { id: codeDoc.id, teamId: codeDoc.data().teamId };
            setJoinCodes(prev => [...prev, newCode]);
            return codeDoc.id;
        }
        return null;
    };

    const joinTeamWithCode = async (code: string, playerId: string): Promise<void> => {
        if(currentUser?.id.startsWith('player-')) {
            throw new Error("This functionality is not available in dev mode.");
        }
        const codeRef = doc(db, "joinCodes", code);
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) {
            throw new Error("Invalid team code. Please check the code and try again.");
        }
        const { teamId } = codeSnap.data();
        const playerRef = doc(db, "users", playerId);
        await updateDoc(playerRef, { teamIds: arrayUnion(teamId) });
        setCurrentUser(prev => prev ? { ...prev, teamIds: [...prev.teamIds, teamId] } : null);
    };

    const getGoalsForPlayer = (playerId: string) => goals.filter(g => g.playerId === playerId);
    
    const createGoal = async (goalData: Omit<PersonalGoal, 'id'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to create a goal.");
        }

        if(currentUser.id.startsWith('player-')) {
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

        if(currentUser.id.startsWith('player-') || currentUser.id.startsWith('coach-')) {
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

    const getTeamGoals = (teamId: string) => teamGoals.filter(g => g.teamId === teamId);

    const createTeamGoal = async (goalData: Omit<TeamGoal, 'id'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to create a team goal.");
        }

        if (currentUser.id.startsWith('coach-')) {
            const newGoal: TeamGoal = { id: `team-goal-${Date.now()}`, ...goalData };
            setTeamGoals(prev => [...prev, newGoal]);
            MOCK_TEAM_GOALS.push(newGoal);
            return;
        }

        if (!goalData.teamId) {
            throw new Error("Select a team before creating a team goal.");
        }

        try {
            const docRef = await addDoc(collection(db, "teamGoals"), goalData);
            setTeamGoals(prev => {
                const withoutCurrent = prev.filter(g => g.id !== docRef.id);
                return [...withoutCurrent, { id: docRef.id, ...goalData }];
            });
        } catch (error) {
            console.error("Error creating team goal: ", error);
            throw error;
        }
    };

    const deleteTeamGoal = async (goalId: string) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to delete a team goal.");
        }

        if (currentUser.id.startsWith('coach-')) {
            setTeamGoals(prev => prev.filter(g => g.id !== goalId));
            const index = MOCK_TEAM_GOALS.findIndex(g => g.id === goalId);
            if (index > -1) MOCK_TEAM_GOALS.splice(index, 1);
            return;
        }

        try {
            await deleteDoc(doc(db, "teamGoals", goalId));
            setTeamGoals(prev => prev.filter(g => g.id !== goalId));
        } catch (error) {
            console.error("Error deleting team goal: ", error);
            throw error;
        }
    };


    const value = {
        currentUser,
        loading,
        emailSignUp,
        emailSignIn,
        createUserProfile,
        completeOnboarding,
        logout,
        getTeamsForCoach,
        getPlayersInTeam,
        getDrillsForTeam,
        getSessionsForTeam,
        getSessionsForPlayer,
        getAssignedDrillsForPlayerToday,
        createDrill,
        createAssignment,
        logSession,
        createTeam,
        getJoinCodeForTeam,
        joinTeamWithCode,
        getGoalsForPlayer,
        createGoal,
        deleteGoal,
        getTeamGoals,
        createTeamGoal,
        deleteTeamGoal,
        activeTeam,
        setActiveTeamId,
        setDevUser,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
