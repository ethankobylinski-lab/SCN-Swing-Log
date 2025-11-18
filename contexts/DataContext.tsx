import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { User, UserRole, Team, Player, Drill, Session, DrillAssignment, DayOfWeek, PersonalGoal, PlayerProfile, TeamGoal, UserPreferences, SessionType } from '../types';
import { generateTeamCode } from '../utils/helpers';
import { resolveTeamFromJoinCode } from '../utils/membership';
import { MOCK_COACH, MOCK_PLAYERS, MOCK_TEAM, MOCK_DRILLS, MOCK_SESSIONS, MOCK_ASSIGNMENTS, MOCK_GOALS, MOCK_TEAM_GOALS } from '../utils/mockData';

type SessionUpdatePayload = Partial<Pick<Session, 'name' | 'drillId' | 'sets' | 'feedback' | 'reflection'>>;
type LogSessionPayload = Omit<Session, 'id' | 'playerId' | 'teamId'> & {
    teamId?: string;
    playerId?: string;
};

export type PitchingStatsSummary = {
    totalSessions: number;
    totalPitches: number;
    totalStrikes: number;
    totalBalls: number;
    overallStrikePercentage: number;
    avgStrikePercentage: number;
    bestStrikePercentage: number;
    recentStrikePercentage: number;
    avgVelocity: number | null;
    lastSessionDate: string | null;
};

// Context interface
interface IDataContext {
  currentUser: User | null;
  loading: boolean;
  databaseStatus: 'connecting' | 'ready' | 'error';
  databaseError?: string | null;
  teamAccessErrors: Record<string, string>;
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
  logSession: (sessionData: LogSessionPayload) => Promise<Session | undefined>;
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
  createPersonalGoalForPlayerAsCoach: (
    playerId: string,
    teamId: string,
    payload: Omit<PersonalGoal, 'id' | 'playerId' | 'teamId' | 'createdByUserId' | 'createdByRole'>,
  ) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<Omit<PersonalGoal, 'id' | 'playerId' | 'teamId'>>) => Promise<void>;
  getTeamGoals: (teamId: string) => TeamGoal[];
  getTeamsForPlayer: (playerId: string) => Team[];
  getCoachesForTeam: (teamId: string) => User[];
  createTeamGoal: (goalData: Omit<TeamGoal, 'id'>) => Promise<void>;
  deleteTeamGoal: (goalId: string) => Promise<void>;
  removeCoachFromTeam: (coachId: string, teamId: string) => Promise<void>;
  setCoachFeedbackOnSession: (sessionId: string, coachFeedback: string) => Promise<void>;
  recordSessionIntent?: { type: SessionType; id: number };
  setRecordSessionIntent: (intent?: { type: SessionType; id: number }) => void;
  getPitchingSessionsForPlayer: (playerId: string, teamId?: string) => Session[];
  getPitchingSessionsForTeam: (teamId: string) => Session[];
  getPitchingStatsForSessions: (sessions: Session[]) => PitchingStatsSummary;
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

type SupabaseUserRow = {
    id: string;
    name?: string | null;
    role?: string | null;
    email?: string | null;
    phone_number?: string | null;
    team_ids?: string[] | null;
    coach_team_ids?: string[] | null;
    preferences?: UserPreferences | null;
    profile?: PlayerProfile | null;
    is_new?: boolean | null;
};

const mapUserDocument = (row: SupabaseUserRow): User => {
    const role = normalizeUserRole(row.role);
    const teamIds = coerceStringArray(row.team_ids);
    const coachTeamIdsRaw = coerceStringArray(row.coach_team_ids);
    const inferredCoachTeams =
        role === UserRole.Coach ? (coachTeamIdsRaw.length > 0 ? coachTeamIdsRaw : teamIds) : coachTeamIdsRaw;
    const preferenceMap = typeof row.preferences === 'object' && row.preferences !== null ? row.preferences : {};

    const baseUser: User = {
        id: row.id,
        name: typeof row.name === 'string' ? row.name : '',
        role,
        teamIds,
        coachTeamIds: inferredCoachTeams.length > 0 ? inferredCoachTeams : undefined,
        isNew: Boolean(row.is_new),
        preferences: preferenceMap,
        ...(typeof row.email === 'string' ? { email: row.email } : {}),
        ...(typeof row.phone_number === 'string' ? { phoneNumber: row.phone_number } : {}),
    };

    if (role === UserRole.Player) {
        (baseUser as Player).profile = ensurePlayerProfile(row.profile);
    }

    return baseUser;
};

type SupabaseTeamRow = {
    id: string;
    name: string;
    season_year: number;
    coach_id: string;
    created_at?: string | null;
    created_by?: string | null;
};

const mapTeamRow = (row: SupabaseTeamRow): Team => ({
    id: row.id,
    name: row.name,
    seasonYear: row.season_year,
    coachId: row.coach_id,
    createdAt: row.created_at ?? undefined,
    createdBy: row.created_by ?? undefined,
});

type SupabaseDrillRow = {
    id: string;
    team_id: string;
    coach_id?: string | null;
    name: string;
    description: string;
    target_zones: string[];
    pitch_types: string[];
    count_situation: string;
    base_runners: string[];
    outs: number;
    goal_type: string;
    goal_target_value: number;
    reps_per_set: number;
    sets: number;
    drill_type?: string | null;
};

const mapDrillRow = (row: SupabaseDrillRow): Drill => ({
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    description: row.description,
    targetZones: row.target_zones,
    pitchTypes: row.pitch_types,
    countSituation: row.count_situation as Drill['countSituation'],
    baseRunners: row.base_runners as Drill['baseRunners'],
    outs: row.outs as Drill['outs'],
    goalType: row.goal_type as Drill['goalType'],
    goalTargetValue: row.goal_target_value,
    repsPerSet: row.reps_per_set,
    sets: row.sets,
    drillType: row.drill_type ?? undefined,
});

type SupabaseAssignmentRow = {
    id: string;
    team_id: string;
    drill_id: string;
    player_ids: string[];
    is_recurring: boolean;
    recurring_days: DayOfWeek[];
    due_date?: string | null;
    assigned_date: string;
    coach_id?: string | null;
};

const mapAssignmentRow = (row: SupabaseAssignmentRow): DrillAssignment => ({
    id: row.id,
    teamId: row.team_id,
    drillId: row.drill_id,
    playerIds: row.player_ids ?? [],
    isRecurring: row.is_recurring,
    recurringDays: row.recurring_days ?? [],
    dueDate: row.due_date ?? undefined,
    assignedDate: row.assigned_date,
});

type SupabasePersonalGoalRow = {
    id: string;
    player_id: string;
    team_id: string;
    metric: GoalType;
    target_value: number;
    start_date: string;
    target_date: string;
    status: 'Active' | 'Completed' | 'Archived';
    drill_type?: DrillType | null;
    target_zones?: string[] | null;
    pitch_types?: string[] | null;
    reflection?: string | null;
    min_reps?: number | null;
    created_by_user_id?: string | null;
    created_by_role?: UserRole | null;
};

const mapPersonalGoalRow = (row: SupabasePersonalGoalRow): PersonalGoal => ({
    id: row.id,
    playerId: row.player_id,
    teamId: row.team_id,
    metric: row.metric,
    targetValue: row.target_value,
    startDate: row.start_date,
    targetDate: row.target_date,
    status: row.status,
    drillType: row.drill_type ?? undefined,
    targetZones: row.target_zones ?? [],
    pitchTypes: row.pitch_types ?? [],
    reflection: row.reflection ?? undefined,
    minReps: row.min_reps ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdByRole: row.created_by_role ?? undefined,
});

type SupabaseTeamGoalRow = {
    id: string;
    team_id: string;
    description: string;
    metric: GoalType;
    target_value: number;
    start_date: string;
    target_date: string;
    status: 'Active' | 'Completed' | 'Archived';
    drill_type?: DrillType | null;
    target_zones?: string[] | null;
    pitch_types?: string[] | null;
    created_by?: string | null;
};

const mapTeamGoalRow = (row: SupabaseTeamGoalRow): TeamGoal => ({
    id: row.id,
    teamId: row.team_id,
    description: row.description,
    metric: row.metric,
    targetValue: row.target_value,
    startDate: row.start_date,
    targetDate: row.target_date,
    status: row.status,
    drillType: row.drill_type ?? undefined,
    targetZones: row.target_zones ?? [],
    pitchTypes: row.pitch_types ?? [],
});

const mapPlayerSnapshot = (row: SupabaseUserRow): Player | null => {
    const role = normalizeUserRole(row.role);
    if (role !== UserRole.Player) {
        return null;
    }
    return {
        id: row.id,
        name: typeof row.name === 'string' ? row.name : 'Player',
        role,
        profile: ensurePlayerProfile(row.profile),
        teamIds: coerceStringArray(row.team_ids),
        preferences: typeof row.preferences === 'object' && row.preferences !== null ? row.preferences : {},
        ...(typeof row.email === 'string' ? { email: row.email } : {}),
        ...(typeof row.phone_number === 'string' ? { phoneNumber: row.phone_number } : {}),
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
    const [recordSessionIntent, setRecordSessionIntent] = useState<{ type: SessionType; id: number } | undefined>(undefined);
    const [teamAccessErrors, setTeamAccessErrors] = useState<Record<string, string>>({});

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

    const recordPermissionError = useCallback((teamId: string, contextLabel: string) => {
        setTeamAccessErrors((prev) => ({ ...prev, [teamId]: contextLabel }));
    }, []);

    const ensureCoachAccess = (teamId: string) => {
        if (!currentUser) {
            throw new Error('You need to be signed in to manage team data.');
        }
        if (currentUser.role !== UserRole.Coach) {
            throw new Error('Only coaches can perform this action.');
        }

        const hasCoachMembership = coachTeamIds.includes(teamId);
        const isHeadCoach = teams.some((team) => team.id === teamId && team.coachId === currentUser.id);

        if (!hasCoachMembership && !isHeadCoach) {
            throw new Error('You do not have permission to manage this team.');
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async (session: SupabaseSession | null) => {
            if (!isMounted) {
                return;
            }

            if (!session) {
                setIsSimulatedUser(false);
                setCurrentUser(null);
                setDatabaseStatus('ready');
                setDatabaseError(null);
                setLoading(false);
                return;
            }

            setIsSimulatedUser(false);
            setDatabaseStatus('connecting');
            setDatabaseError(null);

            const fallbackUser: User = {
                id: session.user.id,
                name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
                role: UserRole.Player,
                teamIds: [],
                coachTeamIds: [],
                isNew: true,
                preferences: {},
                ...(session.user.email ? { email: session.user.email } : {}),
                ...(session.user.phone ? { phoneNumber: session.user.phone } : {}),
            };

            const { data, error } = await supabase
                .from<SupabaseUserRow>('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            if (error) {
                console.warn('Unable to load user profile; using fallback.', error);
                setDatabaseStatus('error');
                setDatabaseError(error.message || 'Unable to reach the database.');
                setCurrentUser(fallbackUser);
                setLoading(false);
                return;
            }

            if (data) {
                setCurrentUser(mapUserDocument(data));
            } else {
                setCurrentUser(fallbackUser);
            }
            setDatabaseStatus('ready');
            setDatabaseError(null);
            setLoading(false);
        };

        const initialize = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Unable to get Supabase session', error);
                setDatabaseStatus('error');
                setDatabaseError(error.message);
                setLoading(false);
                return;
            }
            await loadProfile(data.session);
        };

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            loadProfile(session);
        });

        initialize();

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    const emailSignUp = async (email: string, password: string): Promise<void> => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            throw new Error(error.message);
        }
    };

    const emailSignIn = async (email: string, password: string): Promise<void> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            throw new Error(error.message);
        }
    };

    const createUserProfile = async (profileData: { name: string; role: UserRole; playerProfile?: PlayerProfile }) => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            throw new Error('No authenticated user found.');
        }

        const payload: SupabaseUserRow = {
            id: user.id,
            name: profileData.name,
            role: profileData.role,
            team_ids: [],
            coach_team_ids: profileData.role === UserRole.Coach ? [] : [],
            preferences: {},
            email: user.email ?? undefined,
            phone_number: user.phone ?? undefined,
            profile: profileData.role === UserRole.Player ? profileData.playerProfile ?? ensurePlayerProfile(null) : undefined,
            is_new: profileData.role === UserRole.Coach,
        };

        const { data: upserted, error: upsertError } = await supabase
            .from<SupabaseUserRow>('users')
            .upsert(payload, { onConflict: 'id' })
            .select('*')
            .single();

        if (upsertError) {
            throw new Error(upsertError.message);
        }

        setCurrentUser(mapUserDocument(upserted));
    };

    const completeOnboarding = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('users').update({ is_new: false }).eq('id', user.id);
        if (error) {
            console.error('Unable to complete onboarding:', error);
            throw new Error(error.message);
        }
        setCurrentUser((prev) => (prev ? { ...prev, isNew: false } : prev));
    };

    const logout = async () => {
        await supabase.auth.signOut();
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
        setRecordSessionIntent(undefined);
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
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'number') {
            return new Date(value).toISOString();
        }
        if (typeof value === 'object' && value !== null && 'toISOString' in (value as Record<string, unknown>)) {
            try {
                const maybeDate = value as { toISOString: () => string };
                return maybeDate.toISOString();
            } catch {
                return undefined;
            }
        }
        return undefined;
    };

    type SupabaseSessionRow = {
        id: string;
        player_id: string;
        drill_id?: string | null;
        name: string;
        team_id: string;
        date: string;
        type?: SessionType | null;
        sets?: SetResult[];
        feedback?: string | null;
        reflection?: string | null;
        coach_feedback?: string | null;
        created_at?: string | null;
        updated_at?: string | null;
        last_edited_by?: string | null;
    };

    const mapSessionDocument = (row: SupabaseSessionRow): Session | null => {
        if (!row?.id || !row.player_id || !row.team_id || !row.date || !row.name) {
            return null;
        }

        const createdAt = coerceTimestampToIso(row.created_at);
        const updatedAt = coerceTimestampToIso(row.updated_at);
        const coercedSets = Array.isArray(row.sets) ? row.sets : [];
        return {
            id: row.id,
            playerId: row.player_id,
            drillId: row.drill_id ?? undefined,
            name: row.name,
            teamId: row.team_id,
            date: row.date,
            type: row.type,
            sets: coercedSets,
            feedback: row.feedback ?? undefined,
            reflection: row.reflection ?? undefined,
            coachFeedback: row.coach_feedback ?? undefined,
            createdAt,
            updatedAt: updatedAt ?? createdAt,
            lastEditedBy: row.last_edited_by ?? undefined,
        };
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

        let isMounted = true;

        const loadTeams = async () => {
            const { data, error } = await supabase
                .from<SupabaseTeamRow>('teams')
                .select('*')
                .in('id', teamIds);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load teams:', error);
                setDatabaseStatus('error');
                setDatabaseError(error.message);
                return;
            }

            const mapped = (data ?? []).map(mapTeamRow);
            setTeams(mapped);
            setActiveTeamId((prev) => {
                if (prev && mapped.some((team) => team.id === prev)) {
                    return prev;
                }
                return mapped[0]?.id;
            });
        };

        loadTeams();

        return () => {
            isMounted = false;
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
                const { data, error } = await supabase
                    .from<SupabaseTeamRow>('teams')
                    .select('*')
                    .eq('coach_id', currentUser.id);

                if (isCancelled || error || !data || data.length === 0) {
                    if (error) {
                        console.error('Failed to backfill coach team memberships for user', currentUser.id, error);
                    }
                    return;
                }

                const discoveredTeamIds = data.map((row) => row.id);
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
                    data.forEach((row) => {
                        merged.set(row.id, mapTeamRow(row));
                    });
                    return Array.from(merged.values());
                });

                setActiveTeamId((prev) => prev ?? discoveredTeamIds[0]);

                const { error: syncError } = await supabase
                    .from('users')
                    .update({ coach_team_ids: mergedIds })
                    .eq('id', currentUser.id);
                if (syncError) {
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

        if (!activeTeamId) {
            setTeamSessions([]);
            return;
        }

        let isMounted = true;

        const loadSessions = async () => {
            const { data, error } = await supabase
                .from<SupabaseSessionRow>('sessions')
                .select('*')
                .eq('team_id', activeTeamId);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load team sessions:', error);
                recordPermissionError(activeTeamId, 'team sessions');
                setDatabaseError(error.message);
                return;
            }

            const mapped = (data ?? [])
                .map(mapSessionDocument)
                .filter((session): session is Session => Boolean(session));
            applySortedTeamSessions(mapped);
        };

        loadSessions();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, recordPermissionError, applySortedTeamSessions]);

    useEffect(() => {
        if (!currentUser) {
            setPersonalSessions([]);
            return;
        }

        if (isDemoMode) {
            setPersonalSessions(MOCK_SESSIONS);
            return;
        }

        let isMounted = true;

        const loadPersonalSessions = async () => {
            const { data, error } = await supabase
                .from<SupabaseSessionRow>('sessions')
                .select('*')
                .eq('player_id', currentUser.id);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load personal sessions:', error);
                return;
            }

            const playerSessions = (data ?? [])
                .map(mapSessionDocument)
                .filter((session): session is Session => Boolean(session));
            setPersonalSessions(sortSessionsByDate(playerSessions));
        };

        loadPersonalSessions();

        return () => {
            isMounted = false;
        };
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

        let isMounted = true;

        const loadPlayers = async () => {
            const { data, error } = await supabase
                .from<SupabaseUserRow>('users')
                .select('*')
                .eq('role', UserRole.Player)
                .contains('team_ids', [activeTeamId]);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load players:', error);
                recordPermissionError(activeTeamId, 'the player roster');
                return;
            }

            const mapped = (data ?? [])
                .map(mapPlayerSnapshot)
                .filter((player): player is Player => Boolean(player));
            setPlayers(mapped);
        };

        loadPlayers();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, recordPermissionError]);

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

        let isMounted = true;

        const loadCoaches = async () => {
            const loaders = coachTeamIds.map(async (teamId) => {
                const { data, error } = await supabase
                    .from<SupabaseUserRow>('users')
                    .select('*')
                    .eq('role', UserRole.Coach)
                    .contains('coach_team_ids', [teamId]);

                if (!isMounted) {
                    return;
                }

                if (error) {
                    console.error(`Failed to load coaches for team ${teamId}:`, error);
                    return;
                }

                const coaches = (data ?? []).map(mapUserDocument).filter((user) => user.role === UserRole.Coach);
                setTeamCoachesById((prev) => ({ ...prev, [teamId]: coaches }));
            });

            await Promise.all(loaders);
        };

        loadCoaches();

        return () => {
            isMounted = false;
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

        let isMounted = true;

        const loadDrills = async () => {
            const { data, error } = await supabase
                .from<SupabaseDrillRow>('drills')
                .select('*')
                .in('team_id', teamIdsForDrills);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load drills:', error);
                teamIdsForDrills.forEach((teamId) => recordPermissionError(teamId, 'drills'));
                return;
            }

            const mapped = (data ?? []).map(mapDrillRow);
            setDrills(mapped);
        };

        loadDrills();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, recordPermissionError]);

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

        let isMounted = true;

        const loadAssignments = async () => {
            const { data, error } = await supabase
                .from<SupabaseAssignmentRow>('assignments')
                .select('*')
                .in('team_id', teamIdsForAssignments);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load assignments:', error);
                teamIdsForAssignments.forEach((teamId) => recordPermissionError(teamId, 'assignments'));
                return;
            }

            const mapped = (data ?? []).map(mapAssignmentRow);
            setAssignments(mapped);
        };

        loadAssignments();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, recordPermissionError]);

    useEffect(() => {
        if (!currentUser) {
            setGoals([]);
            return;
        }

        if (isDemoMode) {
            return;
        }

        let isMounted = true;

        const loadGoals = async () => {
            if (currentUser.role === UserRole.Player) {
                const { data, error } = await supabase
                    .from<SupabasePersonalGoalRow>('personal_goals')
                    .select('*')
                    .eq('player_id', currentUser.id);

                if (!isMounted) {
                    return;
                }

                if (error) {
                    console.error('Failed to load personal goals:', error);
                    return;
                }

                const mapped = (data ?? []).map(mapPersonalGoalRow);
                setGoals(mapped);
                return;
            }

            if (!activeTeamId) {
                setGoals([]);
                return;
            }

            const { data, error } = await supabase
                .from<SupabasePersonalGoalRow>('personal_goals')
                .select('*')
                .eq('team_id', activeTeamId);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load player goals:', error);
                recordPermissionError(activeTeamId, 'player goals');
                return;
            }

            const mapped = (data ?? []).map(mapPersonalGoalRow);
            setGoals(mapped);
        };

        loadGoals();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, isDemoMode, recordPermissionError]);

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

        let isMounted = true;

        const loadTeamGoals = async () => {
            const { data, error } = await supabase
                .from<SupabaseTeamGoalRow>('team_goals')
                .select('*')
                .in('team_id', teamIdsForGoals);

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load team goals:', error);
                teamIdsForGoals.forEach((teamId) => recordPermissionError(teamId, 'team goals'));
                return;
            }

            const mapped = (data ?? []).map(mapTeamGoalRow);
            setTeamGoals(mapped);
        };

        loadTeamGoals();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, activeTeamId, playerTeamIdsKey, isDemoMode, recordPermissionError]);

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
        const normalized = code.trim().toUpperCase();
        if (!normalized) return;
        try {
            await supabase
                .from('join_codes')
                .upsert(
                    {
                        code: normalized,
                        team_id: teamId,
                        role,
                        created_by: currentUser?.id ?? null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'code' },
                );
        } catch (error) {
            console.warn(`Unable to persist join code ${normalized} for team ${teamId}:`, error);
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
            const { data, error } = await supabase
                .from<SupabaseTeamRow>('teams')
                .select('*')
                .eq('id', teamId)
                .single();
            if (error || !data) {
                return null;
            }
            const teamData = mapTeamRow(data);
            upsertTeamCache(teamData);
            return teamData;
        } catch (error) {
            console.error(`Failed to load team ${teamId}:`, error);
            return null;
        }
    };

    const fetchJoinCodePair = async (
        teamId: string,
    ): Promise<{ playerCode: string | null; coachCode: string | null }> => {
        const { data, error } = await supabase
            .from<{ code: string; role: 'player' | 'coach' }>('join_codes')
            .select('code, role')
            .eq('team_id', teamId);
        if (error) {
            throw error;
        }
        let playerCode: string | null = null;
        let coachCode: string | null = null;
        data?.forEach((record) => {
            if (record.role === 'player') {
                playerCode = record.code;
            } else if (record.role === 'coach') {
                coachCode = record.code;
            }
        });
        return { playerCode, coachCode };
    };

    const generateUniqueJoinCode = (existing: Set<string>) => {
        let next = generateTeamCode();
        while (existing.has(next)) {
            next = generateTeamCode();
        }
        return next;
    };

    const ensureTeamJoinCodes = async (teamId: string): Promise<{ playerCode: string; coachCode: string } | null> => {
        if (!currentUser) {
            throw new Error("Sign in to manage team join codes.");
        }
        if (currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can manage team join codes.");
        }

        ensureCoachAccess(teamId);
        let team = teams.find((t) => t.id === teamId);
        if (!team) {
            team = await loadTeamDocument(teamId);
            if (!team) {
                return null;
            }
        }

        try {
            const existing = await fetchJoinCodePair(teamId);
            let { playerCode, coachCode } = existing;
            const existingCodes = new Set(
                [playerCode, coachCode].filter((value): value is string => Boolean(value)),
            );
            const pending: Promise<void>[] = [];

            if (!playerCode) {
                playerCode = generateUniqueJoinCode(existingCodes);
                existingCodes.add(playerCode);
                pending.push(persistJoinCodeRecord(playerCode, teamId, 'player'));
            }
            if (!coachCode) {
                coachCode = generateUniqueJoinCode(existingCodes);
                pending.push(persistJoinCodeRecord(coachCode, teamId, 'coach'));
            }

            if (pending.length > 0) {
                await Promise.all(pending);
            }

            return playerCode && coachCode ? { playerCode, coachCode } : null;
        } catch (error) {
            console.error('Unable to load join codes for team', teamId, error);
            throw error instanceof Error
                ? error
                : new Error('Unable to load team invite codes at this time.');
        }
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

        const { error } = await supabase.from('users').update({ preferences: basePrefs }).eq('id', currentUser.id);
        if (error) {
            console.error('Failed to update preferences:', error);
            throw new Error(error.message);
        }
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
        const dbField = role === 'player' ? 'team_ids' : 'coach_team_ids';
        const existingIds = currentUser[membershipField] ?? [];

        const team = await resolveTeamFromJoinCode(normalizedCode, role);
        if (existingIds.includes(team.id)) {
            throw new Error("You're already a member of this team.");
        }

        const updatedIds = Array.from(new Set([...(existingIds ?? []), team.id]));
        const { error } = await supabase
            .from('users')
            .update({ [dbField]: updatedIds })
            .eq('id', currentUser.id);
        if (error) {
            console.error('Unable to join team:', error);
            throw new Error(error.message);
        }
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

        const dbField = currentUser.role === UserRole.Coach ? 'coach_team_ids' : 'team_ids';
        const updates: Record<string, unknown> = { [dbField]: existingIds.filter((id) => id !== teamId) };
        if (shouldClearDefaultTeam) {
            updates.preferences = preferenceUpdate ?? {};
        }
        const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
        if (error) {
            console.error('Unable to leave team:', error);
            throw new Error(error.message);
        }

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
    const getPitchingSessionsForPlayer = (playerId: string, teamId?: string) => {
        const sessionsForPlayer = personalSessions.filter((session) => session.playerId === playerId && session.type === 'pitching');
        if (!teamId) {
            return sessionsForPlayer;
        }
        return sessionsForPlayer.filter((session) => session.teamId === teamId);
    };
    const getPitchingSessionsForTeam = (teamId: string) => teamSessions.filter((session) => session.teamId === teamId && session.type === 'pitching');
    const getPitchingStatsForSessions = (sessions: Session[]): PitchingStatsSummary => {
        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalPitches: 0,
                totalStrikes: 0,
                totalBalls: 0,
                overallStrikePercentage: 0,
                avgStrikePercentage: 0,
                bestStrikePercentage: 0,
                recentStrikePercentage: 0,
                avgVelocity: null,
                lastSessionDate: null,
            };
        }

        const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let totalPitches = 0;
        let totalStrikes = 0;
        let totalBalls = 0;
        let cumulativeStrikePct = 0;
        let bestStrikePct = 0;
        let sessionsWithData = 0;
        let totalVelocity = 0;
        let velocitySamples = 0;

        const extractAverageVelocity = (notes?: string) => {
            if (!notes) {
                return null;
            }
            const match = notes.match(/avg velo:\s*(\d+(?:\.\d+)?)/i);
            return match ? Number(match[1]) : null;
        };

        sortedSessions.forEach((session) => {
            const summarySet = session.sets[0];
            if (!summarySet) {
                return;
            }
            const attempted = Math.max(0, summarySet.repsAttempted);
            const strikes = Math.max(0, summarySet.repsExecuted);
            const balls = Math.max(0, summarySet.strikeouts ?? attempted - strikes);
            const strikePct = attempted > 0 ? (strikes / attempted) * 100 : 0;

            totalPitches += attempted;
            totalStrikes += strikes;
            totalBalls += balls;
            cumulativeStrikePct += strikePct;
            if (strikePct > bestStrikePct) {
                bestStrikePct = strikePct;
            }
            sessionsWithData += 1;

            const avgVelocity = extractAverageVelocity(summarySet.notes);
            if (typeof avgVelocity === 'number' && !Number.isNaN(avgVelocity)) {
                totalVelocity += avgVelocity;
                velocitySamples += 1;
            }
        });

        const recentSet = sortedSessions[0]?.sets[0];
        const recentAttempted = recentSet?.repsAttempted ?? 0;
        const recentStrikes = recentSet?.repsExecuted ?? 0;
        const recentStrikePercentage = recentAttempted > 0 ? Math.round((recentStrikes / recentAttempted) * 100) : 0;

        return {
            totalSessions: sessions.length,
            totalPitches,
            totalStrikes,
            totalBalls,
            overallStrikePercentage: totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0,
            avgStrikePercentage: sessionsWithData > 0 ? Math.round(cumulativeStrikePct / sessionsWithData) : 0,
            bestStrikePercentage: Math.round(bestStrikePct),
            recentStrikePercentage,
            avgVelocity: velocitySamples > 0 ? Math.round((totalVelocity / velocitySamples) * 10) / 10 : null,
            lastSessionDate: sortedSessions[0]?.date ?? null,
        };
    };
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

        const payload = {
            team_id: teamId,
            coach_id: currentUser.id,
            name: drillData.name,
            description: drillData.description,
            target_zones: drillData.targetZones,
            pitch_types: drillData.pitchTypes,
            count_situation: drillData.countSituation,
            base_runners: drillData.baseRunners,
            outs: drillData.outs,
            goal_type: drillData.goalType,
            goal_target_value: drillData.goalTargetValue,
            reps_per_set: drillData.repsPerSet,
            sets: drillData.sets,
            drill_type: drillData.drillType ?? null,
        };

        const { data, error } = await supabase
            .from<SupabaseDrillRow>('drills')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating drill: ', error);
            throw new Error(error.message);
        }

        const created = mapDrillRow(data);
        setDrills((prev) => {
            const withoutCurrent = prev.filter((d) => d.id !== created.id);
            return [...withoutCurrent, created];
        });
    };
    
    const createAssignment = async (assignmentData: Omit<DrillAssignment, 'id' | 'assignedDate'>) => {
        if (!currentUser) {
            throw new Error("You need to be signed in to assign drills.");
        }

        if (!assignmentData.playerIds || assignmentData.playerIds.length === 0) {
            throw new Error("Select at least one player before assigning a drill.");
        }

        if (isDemoMode) {
            if (currentUser.role !== UserRole.Coach) {
                throw new Error("Only coaches can assign drills.");
            }
            const newAssignment: DrillAssignment = { id: `assign-${Date.now()}`, assignedDate: new Date().toISOString(), ...assignmentData };
            setAssignments(prev => [...prev, newAssignment]);
            return;
        }

        if (currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can assign drills.");
        }

        ensureCoachAccess(assignmentData.teamId);

        const assignedDate = new Date().toISOString();
        const payload = {
            team_id: assignmentData.teamId,
            drill_id: assignmentData.drillId,
            player_ids: assignmentData.playerIds,
            is_recurring: assignmentData.isRecurring,
            recurring_days: assignmentData.recurringDays ?? [],
            due_date: assignmentData.dueDate ?? null,
            assigned_date: assignedDate,
            coach_id: currentUser.id,
        };

        const { data, error } = await supabase
            .from<SupabaseAssignmentRow>('assignments')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating assignment: ', error);
            throw new Error(error.message);
        }

        const created = mapAssignmentRow(data);
        setAssignments((prev) => {
            const withoutCurrent = prev.filter((a) => a.id !== created.id);
            return [...withoutCurrent, created];
        });
    };
    
    const logSession = async (sessionData: LogSessionPayload): Promise<Session | undefined> => {
        if (!currentUser) {
            throw new Error("You need to be signed in to log a session.");
        }

        const {
            teamId: providedTeamId,
            playerId: _providedPlayerId,
            date: _providedDate,
            coachFeedback: _ignoredCoachFeedback,
            type: providedType,
            ...sessionDetails
        } = sessionData;
        const sessionType: SessionType = providedType ?? 'hitting';

        const timestamp = new Date().toISOString();
        if (isDemoMode && currentUser.role === UserRole.Player) {
            const resolvedDemoTeamId = providedTeamId ?? activeTeamId;
            if (!resolvedDemoTeamId) {
                throw new Error("A team reference is required to log this session.");
            }
            const newSession: Session = {
                id: `session-${Date.now()}`,
                ...sessionDetails,
                type: sessionType,
                playerId: currentUser.id,
                teamId: resolvedDemoTeamId,
                date: timestamp,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastEditedBy: currentUser.id,
            };
            setPersonalSessions((prev) => upsertSessionList(prev, newSession));
            MOCK_SESSIONS.push(newSession);
            return newSession;
        }

        const teamId = providedTeamId ?? activeTeamId;
        if (!teamId) {
            throw new Error("A team reference is required to log this session.");
        }

        const playerId = currentUser.id;

        const payload = {
            player_id: playerId,
            team_id: teamId,
            drill_id: sessionDetails.drillId ?? null,
            name: sessionDetails.name,
            sets: sessionDetails.sets,
            feedback: sessionDetails.feedback ?? null,
            reflection: sessionDetails.reflection ?? null,
            coach_feedback: sessionDetails.coachFeedback ?? null,
            date: timestamp,
            type: sessionType,
            created_at: timestamp,
            updated_at: timestamp,
            last_edited_by: currentUser.id,
            logged_by: currentUser.id,
        };

        const { data, error } = await supabase
            .from<SupabaseSessionRow>('sessions')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error logging session: ', error);
            throw new Error(error.message);
        }

        const persistedSession = mapSessionDocument(data);
        if (!persistedSession) {
            throw new Error('Unable to log session.');
        }

        if (playerId === currentUser.id) {
            setPersonalSessions((prev) => upsertSessionList(prev, persistedSession));
        }

        if (teamId === activeTeamId) {
            setTeamSessions((prev) => upsertSessionList(prev, persistedSession));
        }

        return persistedSession;
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
            updated_at: timestamp,
            last_edited_by: currentUser.id,
        };

        if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
            payload.name = updates.name;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'drillId')) {
            payload.drill_id = updates.drillId ?? null;
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

        const { data, error } = await supabase
            .from<SupabaseSessionRow>('sessions')
            .update(payload)
            .eq('id', sessionId)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating session: ', error);
            throw new Error(error.message);
        }

        const persisted = mapSessionDocument(data);
        if (!persisted) {
            throw new Error('Unable to update session.');
        }

        setTeamSessions((prev) => prev.map((session) => (session.id === sessionId ? persisted : session)));
        if (persisted.playerId === currentUser.id) {
            setPersonalSessions((prev) => prev.map((session) => (session.id === sessionId ? persisted : session)));
        }
        return persisted;
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("You must be signed in to create a team.");
        }
        if (currentUser?.role !== UserRole.Coach) {
            throw new Error("Only coaches can create teams.");
        }

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
>>>>>>> theirs
=======
>>>>>>> theirs
        const timestamp = new Date().toISOString();
        const payload = {
            name: teamData.name,
            season_year: teamData.seasonYear,
            coach_id: user.id,
            created_at: timestamp,
        };
<<<<<<< ours
<<<<<<< ours
=======
        const { data, error } = await supabase.rpc<SupabaseTeamRow>('create_team', {
            team_name: teamData.name,
            team_season_year: teamData.seasonYear,
        });
>>>>>>> theirs
=======
>>>>>>> theirs

        const { data, error } = await supabase
            .from<SupabaseTeamRow>('teams')
            .insert(payload)
            .select('*')
            .single();

<<<<<<< ours
=======

        const { data, error } = await supabase
            .from<SupabaseTeamRow>('teams')
            .insert(payload)
            .select('*')
            .single();

>>>>>>> theirs
=======
>>>>>>> theirs
        if (error) {
            console.error('Error creating team: ', error);
            throw new Error(error.message);
        }

        const newTeam = { ...mapTeamRow(data), joinCodePlayer: playerJoinCode, joinCodeCoach: coachJoinCode };
        setTeams((prev) => [...prev, newTeam]);
        setActiveTeamId(newTeam.id);

        const updatedCoachTeams = Array.from(new Set([...(currentUser.coachTeamIds ?? []), newTeam.id]));
        const { error: membershipError } = await supabase
            .from('users')
            .update({ coach_team_ids: updatedCoachTeams })
            .eq('id', user.id);
        if (membershipError) {
            console.warn('Unable to update coach membership record for new team', newTeam.id, membershipError);
        }
        setCurrentUser((prev) => (prev ? { ...prev, coachTeamIds: updatedCoachTeams } : prev));
        try {
            await syncJoinCodeRecords(newTeam.id, playerJoinCode, coachJoinCode);
        } catch (syncError) {
            console.warn('Unable to sync join code records for team', newTeam.id, syncError);
        }

        return { teamId: newTeam.id, playerCode: playerJoinCode, coachCode: coachJoinCode };
    };
    
    const getJoinCodesForTeam = async (teamId: string): Promise<{ playerCode: string; coachCode: string } | null> => {
        ensureCoachAccess(teamId);
        const codes = await ensureTeamJoinCodes(teamId);
        if (codes) {
            return codes;
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

        if (currentUser.role !== UserRole.Player) {
            throw new Error("Only players can create personal goals.");
        }

        const enrichedGoal = {
            ...goalData,
            createdByUserId: currentUser.id,
            createdByRole: currentUser.role,
        };

        if (isDemoMode && currentUser.role === UserRole.Player) {
            const newGoal: PersonalGoal = { id: `goal-${Date.now()}`, ...enrichedGoal };
            setGoals(prev => [...prev, newGoal]);
            MOCK_GOALS.push(newGoal);
            return;
        }

        if (!goalData.teamId) {
            throw new Error("Join or select a team before creating a goal.");
        }

        const payload = {
            player_id: currentUser.id,
            team_id: goalData.teamId,
            metric: goalData.metric,
            target_value: goalData.targetValue,
            start_date: goalData.startDate,
            target_date: goalData.targetDate,
            status: goalData.status,
            drill_type: goalData.drillType ?? null,
            target_zones: goalData.targetZones ?? [],
            pitch_types: goalData.pitchTypes ?? [],
            reflection: goalData.reflection ?? null,
            min_reps: goalData.minReps ?? null,
            created_by_user_id: currentUser.id,
            created_by_role: currentUser.role,
        };

        const { data, error } = await supabase
            .from<SupabasePersonalGoalRow>('personal_goals')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating goal: ', error);
            throw new Error(error.message);
        }

        const created = mapPersonalGoalRow(data);
        setGoals((prev) => {
            const withoutCurrent = prev.filter((g) => g.id !== created.id);
            return [...withoutCurrent, created];
        });
    };

    const createPersonalGoalForPlayerAsCoach = async (
        playerId: string,
        teamId: string,
        payload: Omit<PersonalGoal, 'id' | 'playerId' | 'teamId' | 'createdByUserId' | 'createdByRole'>,
    ) => {
        if (!currentUser || currentUser.role !== UserRole.Coach) {
            throw new Error('Only coaches can assign personal goals to players.');
        }

        if (!teamId) {
            throw new Error('Select a team before assigning a goal.');
        }

        const startDate = payload.startDate ?? new Date().toISOString();
        const baseGoal = {
            ...payload,
            playerId,
            teamId,
            startDate,
            targetZones: payload.targetZones ?? [],
            pitchTypes: payload.pitchTypes ?? [],
            createdByUserId: currentUser.id,
            createdByRole: currentUser.role,
        };

        if (isDemoMode) {
            const newGoal: PersonalGoal = { id: `goal-${Date.now()}`, ...baseGoal };
            setGoals((prev) => [...prev, newGoal]);
            return;
        }

        ensureCoachAccess(teamId);

        const goalPayload = {
            player_id: playerId,
            team_id: teamId,
            metric: baseGoal.metric,
            target_value: baseGoal.targetValue,
            start_date: baseGoal.startDate,
            target_date: baseGoal.targetDate,
            status: baseGoal.status,
            drill_type: baseGoal.drillType ?? null,
            target_zones: baseGoal.targetZones ?? [],
            pitch_types: baseGoal.pitchTypes ?? [],
            reflection: baseGoal.reflection ?? null,
            min_reps: baseGoal.minReps ?? null,
            created_by_user_id: currentUser.id,
            created_by_role: currentUser.role,
        };

        const { data, error } = await supabase
            .from<SupabasePersonalGoalRow>('personal_goals')
            .insert(goalPayload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating goal for player: ', error);
            throw new Error(error.message);
        }

        const created = mapPersonalGoalRow(data);
        setGoals((prev) => {
            const withoutCurrent = prev.filter((goal) => goal.id !== created.id);
            return [...withoutCurrent, created];
        });
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

        const { error } = await supabase.from('personal_goals').delete().eq('id', goalId);
        if (error) {
            console.error('Error deleting goal: ', error);
            throw new Error(error.message);
        }
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
    };

    const updateGoal = async (
        goalId: string,
        updates: Partial<Omit<PersonalGoal, 'id' | 'playerId' | 'teamId'>>,
    ) => {
        if (!currentUser) {
            throw new Error('You need to be signed in to update a goal.');
        }

        const existingGoal = goals.find((goal) => goal.id === goalId);
        if (existingGoal && existingGoal.playerId !== currentUser.id && currentUser.role !== UserRole.Coach) {
            throw new Error('You can only update your own goals.');
        }

        if (isDemoMode) {
            setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)));
            const index = MOCK_GOALS.findIndex((g) => g.id === goalId);
            if (index > -1) {
                MOCK_GOALS[index] = { ...MOCK_GOALS[index], ...updates };
            }
            return;
        }

        const payload: Record<string, unknown> = {};
        if (Object.prototype.hasOwnProperty.call(updates, 'metric')) {
            payload.metric = updates.metric;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'targetValue')) {
            payload.target_value = updates.targetValue;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'startDate')) {
            payload.start_date = updates.startDate;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'targetDate')) {
            payload.target_date = updates.targetDate;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
            payload.status = updates.status;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'drillType')) {
            payload.drill_type = updates.drillType ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'targetZones')) {
            payload.target_zones = updates.targetZones ?? [];
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'pitchTypes')) {
            payload.pitch_types = updates.pitchTypes ?? [];
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reflection')) {
            payload.reflection = updates.reflection ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'minReps')) {
            payload.min_reps = updates.minReps ?? null;
        }

        const { data, error } = await supabase
            .from<SupabasePersonalGoalRow>('personal_goals')
            .update(payload)
            .eq('id', goalId)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating goal: ', error);
            throw new Error(error.message);
        }

        const updated = mapPersonalGoalRow(data);
        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updated : goal)));
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

        if (currentUser.role !== UserRole.Coach) {
            throw new Error("Only coaches can create team goals.");
        }

        if (!goalData.teamId) {
            throw new Error("Select a team before creating a team goal.");
        }

        ensureCoachAccess(goalData.teamId);

        const payload = {
            team_id: goalData.teamId,
            description: goalData.description,
            metric: goalData.metric,
            target_value: goalData.targetValue,
            start_date: goalData.startDate,
            target_date: goalData.targetDate,
            status: goalData.status,
            drill_type: goalData.drillType ?? null,
            target_zones: goalData.targetZones ?? [],
            pitch_types: goalData.pitchTypes ?? [],
            created_by: currentUser.id,
        };

        const { data, error } = await supabase
            .from<SupabaseTeamGoalRow>('team_goals')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating team goal: ', error);
            throw new Error(error.message);
        }

        const created = mapTeamGoalRow(data);
        setTeamGoals((prev) => {
            const withoutCurrent = prev.filter((g) => g.id !== created.id);
            return [...withoutCurrent, created];
        });
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
        if (goal?.teamId) {
            ensureCoachAccess(goal.teamId);
        }

        const { error } = await supabase.from('team_goals').delete().eq('id', goalId);
        if (error) {
            console.error('Error deleting team goal: ', error);
            throw new Error(error.message);
        }
        setTeamGoals((prev) => prev.filter((g) => g.id !== goalId));
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
        const { data, error } = await supabase
            .from<SupabaseUserRow>('users')
            .select('coach_team_ids')
            .eq('id', coachId)
            .single();
        if (error) {
            console.error('Unable to load coach memberships:', error);
            throw new Error(error.message);
        }
        const filtered = (data?.coach_team_ids ?? []).filter((id) => id !== teamId);
        const { error: updateError } = await supabase.from('users').update({ coach_team_ids: filtered }).eq('id', coachId);
        if (updateError) {
            console.error('Unable to remove coach from team:', updateError);
            throw new Error(updateError.message);
        }
        setTeamCoachesById((prev) => {
            const existing = prev[teamId] ?? [];
            return { ...prev, [teamId]: existing.filter((coach) => coach.id !== coachId) };
        });
    };

    const setCoachFeedbackOnSession = async (sessionId: string, coachFeedback: string) => {
        if (!currentUser) {
            throw new Error('Sign in to leave feedback.');
        }
        if (currentUser.role !== UserRole.Coach) {
            throw new Error('Only coaches can set coach feedback.');
        }
        const { data, error } = await supabase
            .from<SupabaseSessionRow>('sessions')
            .update({ coach_feedback: coachFeedback, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .select('*')
            .single();
        if (error) {
            console.error('Unable to set coach feedback on session:', error);
            throw new Error(error.message);
        }
        const updated = mapSessionDocument(data);
        if (!updated) {
            return;
        }
        setTeamSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, coachFeedback } : session)));
        setPersonalSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, coachFeedback } : session)));
    };


    const value = {
        currentUser,
        loading,
        databaseStatus,
        databaseError,
        teamAccessErrors,
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
        createPersonalGoalForPlayerAsCoach,
        deleteGoal,
        updateGoal,
        getTeamGoals,
        getTeamsForPlayer,
        getPitchingSessionsForPlayer,
        getPitchingSessionsForTeam,
        getPitchingStatsForSessions,
        createTeamGoal,
        deleteTeamGoal,
        removeCoachFromTeam,
        setCoachFeedbackOnSession,
        recordSessionIntent,
        setRecordSessionIntent,
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
