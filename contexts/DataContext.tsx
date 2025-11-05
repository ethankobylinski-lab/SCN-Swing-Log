import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { User, UserRole, Team, Player, Drill, Session, DrillAssignment, DayOfWeek, PersonalGoal, PlayerProfile, JoinCode, TeamGoal } from '../types';
import { auth, db } from '../firebaseConfig'; // Assuming db is exported from firebaseConfig
import { generateTeamCode } from '../utils/helpers';
import { MOCK_COACH, MOCK_PLAYERS, MOCK_TEAM, MOCK_DRILLS, MOCK_SESSIONS, MOCK_ASSIGNMENTS, MOCK_GOALS, MOCK_TEAM_GOALS } from '../utils/mockData';

// Context interface
interface IDataContext {
  currentUser: User | null;
  loading: boolean;
  sendVerificationCode: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyCodeAndSignIn: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  createUserProfile: (profileData: { name: string; role: UserRole; playerProfile?: PlayerProfile }) => Promise<void>;
  logout: () => void;
  // --- Data Access ---
  getTeamsForCoach: (coachId: string) => Team[];
  getPlayersInTeam: (teamId: string) => Player[];
  getDrillsForTeam: (teamId: string) => Drill[];
  getSessionsForTeam: (teamId: string) => Session[];
  getSessionsForPlayer: (playerId: string) => Session[];
  getAssignedDrillsForPlayerToday: (playerId: string, teamId: string) => Drill[];
  createDrill: (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => void;
  createAssignment: (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => void;
  logSession: (sessionData: Omit<Session, 'id'>) => Session | undefined;
  createTeam: (teamData: Omit<Team, 'id' | 'coachId'>, coachId: string) => Promise<string | undefined>;
  getJoinCodeForTeam: (teamId: string) => Promise<string | null>;
  joinTeamWithCode: (code: string, playerId: string) => Promise<void>;
  getGoalsForPlayer: (playerId: string) => PersonalGoal[];
  createGoal: (goalData: Omit<PersonalGoal, 'id'>) => void;
  deleteGoal: (goalId: string) => void;
  getTeamGoals: (teamId: string) => TeamGoal[];
  createTeamGoal: (goalData: Omit<TeamGoal, 'id'>) => void;
  deleteTeamGoal: (goalId: string) => void;
  // --- State Management ---
  activeTeam: Team | undefined;
  setActiveTeamId: (teamId: string) => void;
  setDevUser?: (role: UserRole) => void;
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
                } else {
                    setCurrentUser({
                        id: firebaseUser.uid,
                        phoneNumber: firebaseUser.phoneNumber,
                        name: '',
                        role: UserRole.Player,
                        teamIds: [],
                        isNew: true,
                    });
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const sendVerificationCode = (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
        return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    };

    const verifyCodeAndSignIn = async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
        await confirmationResult.confirm(code);
    };

    const createUserProfile = async (profileData: { name: string; role: UserRole; playerProfile?: PlayerProfile }) => {
        if (!auth.currentUser) throw new Error("No authenticated user found.");
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        const newUser: Omit<User, 'id'> = {
            name: profileData.name,
            role: profileData.role,
            phoneNumber: auth.currentUser.phoneNumber,
            teamIds: [],
        };
        
        if (profileData.role === UserRole.Player && profileData.playerProfile) {
            (newUser as Player).profile = profileData.playerProfile;
        }

        await setDoc(userRef, newUser);

        const userSnap = await getDoc(userRef);
        setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
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
    
    const createDrill = (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => {
        if(currentUser?.id.startsWith('coach-')) {
            const newDrill: Drill = { id: `drill-${Date.now()}`, teamId, ...drillData };
            setDrills(prev => [...prev, newDrill]);
            return;
        }
    };
    
    const createAssignment = (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => {
        if(currentUser?.id.startsWith('coach-')) {
            const newAssignment: DrillAssignment = { id: `assign-${Date.now()}`, assignedDate: new Date().toISOString(), ...assignmentData };
            setAssignments(prev => [...prev, newAssignment]);
            return;
        }
    };
    
    const logSession = (sessionData: Omit<Session, 'id'>): Session | undefined => {
        if(currentUser?.id.startsWith('player-')) {
            const newSession: Session = { id: `session-${Date.now()}`, ...sessionData };
            setSessions(prev => [...prev, newSession]);
            MOCK_SESSIONS.push(newSession);
            return newSession;
        }
        return undefined;
    };
    
    const createTeam = async (teamData: Omit<Team, 'id'|'coachId'>, coachId: string): Promise<string | undefined> => {
        if(currentUser?.id.startsWith('coach-')) {
            const newTeam: Team = { id: `team-${Date.now()}`, coachId, ...teamData };
            setTeams(prev => [...prev, newTeam]);
            return newTeam.id;
        }
        try {
            const teamDocRef = await addDoc(collection(db, "teams"), { ...teamData, coachId });
            const newTeam: Team = { id: teamDocRef.id, coachId, ...teamData };
            setTeams(prev => [...prev, newTeam]);
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
        if(currentUser?.id.startsWith('coach-')) {
            return generateTeamCode();
        }
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
    
    const createGoal = (goalData: Omit<PersonalGoal, 'id'>) => {
        if(currentUser?.id.startsWith('player-')) {
             const newGoal: PersonalGoal = { id: `goal-${Date.now()}`, ...goalData };
            setGoals(prev => [...prev, newGoal]);
            MOCK_GOALS.push(newGoal);
            return;
        }
    };
    
    const deleteGoal = (goalId: string) => {
        if(currentUser?.id.startsWith('player-') || currentUser?.id.startsWith('coach-')) {
            setGoals(prev => prev.filter(g => g.id !== goalId));
            const index = MOCK_GOALS.findIndex(g => g.id === goalId);
            if(index > -1) MOCK_GOALS.splice(index, 1);
            return;
        }
    };

    const getTeamGoals = (teamId: string) => teamGoals.filter(g => g.teamId === teamId);

    const createTeamGoal = (goalData: Omit<TeamGoal, 'id'>) => {
        if (currentUser?.id.startsWith('coach-')) {
            const newGoal: TeamGoal = { id: `team-goal-${Date.now()}`, ...goalData };
            setTeamGoals(prev => [...prev, newGoal]);
            MOCK_TEAM_GOALS.push(newGoal);
            return;
        }
    };

    const deleteTeamGoal = (goalId: string) => {
        if (currentUser?.id.startsWith('coach-')) {
            setTeamGoals(prev => prev.filter(g => g.id !== goalId));
            const index = MOCK_TEAM_GOALS.findIndex(g => g.id === goalId);
            if (index > -1) MOCK_TEAM_GOALS.splice(index, 1);
            return;
        }
    };


    const value = {
        currentUser,
        loading,
        sendVerificationCode,
        verifyCodeAndSignIn,
        createUserProfile,
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