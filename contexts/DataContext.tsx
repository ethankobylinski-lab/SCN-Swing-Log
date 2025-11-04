import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Team, Player, Drill, Session, DrillAssignment, DayOfWeek } from '../types';
import { generateTeamCode } from '../utils/helpers';

// --- MOCK DATA ---

const MOCK_TEAMS: Team[] = [
    { id: 'team1', name: 'Varsity Blues', code: 'VB2024', seasonYear: 2024, coachId: 'coach1' },
];

const MOCK_USERS: User[] = [
    { id: 'coach1', email: 'coach@example.com', name: 'Coach Miller', role: UserRole.Coach, teamIds: ['team1'] },
    {
        id: 'player1', email: 'player1@example.com', name: 'Jake Smith', role: UserRole.Player, teamIds: ['team1'],
        profile: { gradYear: 2025, bats: 'R', throws: 'R', position: 'SS' }
    } as Player,
    {
        id: 'player2', email: 'player2@example.com', name: 'Carlos Garcia', role: UserRole.Player, teamIds: ['team1'],
        profile: { gradYear: 2024, bats: 'L', throws: 'L', position: 'OF' }
    } as Player,
    {
        id: 'player3', email: 'player3@example.com', name: 'Mikey Walsh', role: UserRole.Player, teamIds: ['team1'],
        profile: { gradYear: 2026, bats: 'S', throws: 'R', position: 'C' }
    } as Player,
];

const MOCK_DRILLS: Drill[] = [
    {
        id: 'drill1', teamId: 'team1', name: 'Two-Strike Approach', description: 'Focus on making contact with two strikes.',
        targetZones: ['Outside Middle', 'Outside Low'], pitchTypes: ['Fastball', 'Slider'],
        countSituation: 'Behind', baseRunners: [], outs: 1, goalType: 'Execution %',
        goalTargetValue: 75, repsPerSet: 10, sets: 3
    },
    {
        id: 'drill2', teamId: 'team1', name: 'Fastball Hunt', description: 'Look for a fastball early in the count and drive it.',
        targetZones: ['Middle Middle', 'Middle High'], pitchTypes: ['Fastball'],
        countSituation: 'Ahead', baseRunners: ['1B'], outs: 0, goalType: 'Hard Hit %',
        goalTargetValue: 50, repsPerSet: 8, sets: 4
    },
];

const MOCK_SESSIONS: Session[] = [
    {
        id: 'session1', playerId: 'player1', drillId: 'drill1', name: "Two-Strike Approach", teamId: 'team1', date: new Date(Date.now() - 86400000 * 2).toISOString(),
        sets: [
            { setNumber: 1, repsAttempted: 10, repsExecuted: 7, hardHits: 2, strikeouts: 1 },
            { setNumber: 2, repsAttempted: 10, repsExecuted: 8, hardHits: 3, strikeouts: 1 },
            { setNumber: 3, repsAttempted: 10, repsExecuted: 6, hardHits: 1, strikeouts: 2 },
        ]
    },
    {
        id: 'session2', playerId: 'player1', drillId: 'drill2', name: "Fastball Hunt", teamId: 'team1', date: new Date(Date.now() - 86400000).toISOString(),
        sets: [
            { setNumber: 1, repsAttempted: 8, repsExecuted: 8, hardHits: 5, strikeouts: 0 },
            { setNumber: 2, repsAttempted: 8, repsExecuted: 7, hardHits: 4, strikeouts: 1 },
        ]
    },
    {
        id: 'session3', playerId: 'player2', drillId: 'drill1', name: "Two-Strike Approach", teamId: 'team1', date: new Date(Date.now() - 86400000).toISOString(),
        sets: [
            { setNumber: 1, repsAttempted: 10, repsExecuted: 9, hardHits: 4, strikeouts: 0 },
            { setNumber: 2, repsAttempted: 10, repsExecuted: 8, hardHits: 3, strikeouts: 1 },
            { setNumber: 3, repsAttempted: 10, repsExecuted: 9, hardHits: 5, strikeouts: 0 },
        ]
    }
];

const MOCK_ASSIGNMENTS: DrillAssignment[] = [
    {
        id: 'assign1', drillId: 'drill1', teamId: 'team1', playerIds: ['player1', 'player2'],
        isRecurring: true, recurringDays: ['Mon', 'Wed', 'Fri'], assignedDate: new Date().toISOString()
    }
]

// Context interface
interface IDataContext {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  getTeamsForCoach: (coachId: string) => Team[];
  getPlayersInTeam: (teamId: string) => Player[];
  getDrillsForTeam: (teamId: string) => Drill[];
  getSessionsForTeam: (teamId: string) => Session[];
  getSessionsForPlayer: (playerId: string) => Session[];
  getAssignedDrillsForPlayerToday: (playerId: string, teamId: string) => Drill[];
  createDrill: (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => void;
  createAssignment: (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => void;
  logSession: (sessionData: Omit<Session, 'id'>) => void;
  createTeam: (teamData: Omit<Team, 'id' | 'code' | 'coachId'>, coachId: string) => Team;
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
    const [drills, setDrills] = useState<Drill[]>(MOCK_DRILLS);
    const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
    const [assignments, setAssignments] = useState<DrillAssignment[]>(MOCK_ASSIGNMENTS);

    useEffect(() => {
        // Simulate checking for a logged-in user
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, pass: string) => {
        setLoading(true);
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                const user = users.find(u => u.email === email);
                // In a real app, you'd check the password hash
                if (user && pass === 'password') {
                    setCurrentUser(user);
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                    setLoading(false);
                    resolve();
                } else {
                    setLoading(false);
                    reject(new Error('Invalid email or password'));
                }
            }, 500);
        });
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };

    const getTeamsForCoach = (coachId: string) => {
        return teams.filter(team => team.coachId === coachId);
    };

    const getPlayersInTeam = (teamId: string) => {
        return users.filter(user => user.role === UserRole.Player && user.teamIds.includes(teamId)) as Player[];
    };
    
    const getDrillsForTeam = (teamId: string) => {
        return drills.filter(drill => drill.teamId === teamId);
    };

    const getSessionsForTeam = (teamId: string) => {
        return sessions.filter(session => session.teamId === teamId);
    };
    
    const getSessionsForPlayer = (playerId: string) => {
        return sessions.filter(session => session.playerId === playerId);
    };

    const getAssignedDrillsForPlayerToday = (playerId: string, teamId: string): Drill[] => {
        const today = new Date();
        const dayOfWeek: DayOfWeek = today.toLocaleDateString('en-US', { weekday: 'short' }) as DayOfWeek;
        
        const assignedDrillIds = assignments
            .filter(a => a.teamId === teamId && a.playerIds.includes(playerId))
            .filter(a => {
                if(a.isRecurring) {
                    return a.recurringDays?.includes(dayOfWeek);
                }
                // Placeholder for one-time assignments
                return false;
            })
            .map(a => a.drillId);

        return drills.filter(d => assignedDrillIds.includes(d.id));
    };

    const createDrill = (drillData: Omit<Drill, 'id' | 'teamId'>, teamId: string) => {
        const newDrill: Drill = {
            id: `drill${Date.now()}`,
            teamId,
            ...drillData,
        };
        setDrills(prev => [...prev, newDrill]);
    };

    const createAssignment = (assignmentData: Omit<DrillAssignment, 'id'|'assignedDate'>) => {
        const newAssignment: DrillAssignment = {
            id: `assign${Date.now()}`,
            assignedDate: new Date().toISOString(),
            ...assignmentData,
        };
        setAssignments(prev => [...prev, newAssignment]);
    };

    const logSession = (sessionData: Omit<Session, 'id'>) => {
        const newSession: Session = {
            id: `session${Date.now()}`,
            ...sessionData,
            sets: sessionData.sets.map((set, i) => ({ ...set, setNumber: i + 1 }))
        };
        setSessions(prev => [...prev, newSession]);
    };

    const createTeam = (teamData: Omit<Team, 'id' | 'code' | 'coachId'>, coachId: string): Team => {
        const newTeam: Team = {
            id: `team${Date.now()}`,
            code: generateTeamCode(),
            coachId,
            ...teamData,
        };
        setTeams(prev => [...prev, newTeam]);
        const isCoachCurrentUser = currentUser?.id === coachId;
        const updatedTeamIds = isCoachCurrentUser
            ? Array.from(new Set([...currentUser!.teamIds, newTeam.id]))
            : undefined;

        setUsers(prevUsers => prevUsers.map(u => {
            if (u.id === coachId) {
                const nextTeamIds = Array.from(new Set([...u.teamIds, newTeam.id]));
                return { ...u, teamIds: nextTeamIds };
            }
            return u;
        }));

        if (isCoachCurrentUser && updatedTeamIds) {
            const updatedUser = { ...currentUser!, teamIds: updatedTeamIds };
            setCurrentUser(updatedUser);
            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        return newTeam;
    };

    const value = {
        currentUser,
        loading,
        login,
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
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}