import { Session, Drill, SetResult, PersonalGoal, GoalType, DrillType, TeamGoal, PitchSession } from '../types';
import { DRILL_TYPES } from '../constants';

export const generateTeamCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
};

export const calculateExecutionPercentage = (sets: SetResult[]): number => {
    const totalExecuted = sets.reduce((sum, set) => sum + set.repsExecuted, 0);
    const totalAttempted = sets.reduce((sum, set) => sum + set.repsAttempted, 0);
    if (totalAttempted === 0) return 0;
    return Math.round((totalExecuted / totalAttempted) * 100);
};

export const calculateHardHitPercentage = (sets: SetResult[]): number => {
    const totalHardHits = sets.reduce((sum, set) => sum + set.hardHits, 0);
    const totalAttempted = sets.reduce((sum, set) => sum + set.repsAttempted, 0);
    if (totalAttempted === 0) return 0;
    return Math.round((totalHardHits / totalAttempted) * 100);
};

export const calculateStrikeoutPercentage = (sets: SetResult[]): number => {
    const totalStrikeouts = sets.reduce((sum, set) => sum + set.strikeouts, 0);
    const totalAttempted = sets.reduce((sum, set) => sum + set.repsAttempted, 0);
    if (totalAttempted === 0) return 0;
    return Math.round((totalStrikeouts / totalAttempted) * 100);
};

export const getSessionGoalProgress = (session: Session, drill: Drill): { value: number; isSuccess: boolean } => {
    switch (drill.goalType) {
        case 'Execution %':
            const exec = calculateExecutionPercentage(session.sets);
            return { value: exec, isSuccess: exec >= drill.goalTargetValue };
        case 'Hard Hit %':
            const hh = calculateHardHitPercentage(session.sets);
            return { value: hh, isSuccess: hh >= drill.goalTargetValue };
        case 'No Strikeouts':
            const so = session.sets.reduce((sum, set) => sum + set.strikeouts, 0);
            return { value: so, isSuccess: so <= drill.goalTargetValue };
        default:
            return { value: 0, isSuccess: false };
    }
};

const getDrillTypeForSession = (session: Session, drills: Drill[]): DrillType | undefined => {
    if (session.drillId) {
        const drill = drills.find(d => d.id === session.drillId);
        return drill?.drillType;
    }
    // For ad-hoc sessions, the name is the drill type
    if (DRILL_TYPES.includes(session.name as DrillType)) {
        return session.name as DrillType;
    }
    return undefined;
};

export const resolveDrillTypeForSet = (session: Session, set: SetResult, drills: Drill[]): DrillType | undefined => {
    return set.drillType || getDrillTypeForSession(session, drills);
};


export const getCurrentMetricValue = (goal: PersonalGoal, sessions: Session[], drills: Drill[]): number => {
    let setsWithSession = sessions.flatMap(session => session.sets.map(set => ({ session, set })));

    if (goal.drillType) {
        setsWithSession = setsWithSession.filter(({ session, set }) => resolveDrillTypeForSet(session, set, drills) === goal.drillType);
    }

    let filteredSets = setsWithSession.map(({ set }) => set);

    if (goal.targetZones && goal.targetZones.length > 0) {
        filteredSets = filteredSets.filter(set =>
            set.targetZones?.some(zone => goal.targetZones!.includes(zone))
        );
    }

    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        filteredSets = filteredSets.filter(set =>
            set.pitchTypes?.some(pitch => goal.pitchTypes!.includes(pitch))
        );
    }

    if (filteredSets.length === 0) return 0;

    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(filteredSets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(filteredSets);
        case 'No Strikeouts':
            return filteredSets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return filteredSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        default:
            return 0;
    }
};

export const getCurrentTeamMetricValue = (goal: TeamGoal, sessions: Session[], drills: Drill[], pitchSessions: PitchSession[] = []): number => {
    // Handle Pitching Metrics
    if (['Strike %', 'Velocity', 'Command', 'Total Pitches'].includes(goal.metric)) {
        const relevantSessions = pitchSessions.filter(s => {
            const d = new Date(s.date);
            return d >= new Date(goal.startDate) && d <= new Date(goal.targetDate);
        });

        if (relevantSessions.length === 0) return 0;

        switch (goal.metric) {
            case 'Strike %':
                const totalPitches = relevantSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0);
                if (totalPitches === 0) return 0;
                // Note: We need to ensure we have pitchRecords or strikes count. 
                // PitchSession type has 'pitchRecords' but sometimes we might just have summary stats if not fully loaded?
                // Assuming we have access to either pitchRecords or we need to rely on pre-calculated stats if available.
                // For now, let's try to use pitchRecords if available, or fallback to a 'strikes' field if we added one (we didn't yet, but maybe we should).
                // Actually, the PitchSession type in types.ts HAS pitchRecords.
                const strikes = relevantSessions.reduce((sum, s) => {
                    if (s.pitchRecords) {
                        return sum + s.pitchRecords.filter(p => ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(p.outcome)).length;
                    }
                    // Fallback if we have a summary field (which we don't seem to have explicitly in the type, but maybe in the DB row mapping?)
                    // The DB mapping in DataContext.tsx didn't add a 'strikes' field to the object, only 'pitchGoals'.
                    // Wait, getPitchingSessionsForTeam in DataContext.tsx selects `pitch_records (*)`.
                    // So pitchRecords should be populated.
                    return sum;
                }, 0);
                return Math.round((strikes / totalPitches) * 100);

            case 'Total Pitches':
                return relevantSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0);

            case 'Velocity':
                let maxVel = 0;
                relevantSessions.forEach(s => {
                    s.pitchRecords?.forEach(p => {
                        if (p.velocityMph && p.velocityMph > maxVel) maxVel = p.velocityMph;
                    });
                });
                return maxVel;

            case 'Command':
                // Placeholder
                return 0;

            default:
                return 0;
        }
    }

    // Handle Hitting Metrics (Existing Logic)
    let setsWithSession = sessions.flatMap(session => session.sets.map(set => ({ session, set })));

    if (goal.drillType) {
        setsWithSession = setsWithSession.filter(({ session, set }) => resolveDrillTypeForSet(session, set, drills) === goal.drillType);
    }

    let filteredSets = setsWithSession.map(({ set }) => set);

    if (goal.targetZones && goal.targetZones.length > 0) {
        filteredSets = filteredSets.filter(set =>
            set.targetZones?.some(zone => goal.targetZones!.includes(zone))
        );
    }

    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        filteredSets = filteredSets.filter(set =>
            set.pitchTypes?.some(pitch => goal.pitchTypes!.includes(pitch))
        );
    }

    if (filteredSets.length === 0) return 0;

    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(filteredSets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(filteredSets);
        case 'No Strikeouts':
            // For a team goal, this would likely be an average, but for now we sum it.
            // A better team goal would be "Avg Strikeouts per Session"
            return filteredSets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return filteredSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        default:
            return 0;
    }
};

export const formatGoalName = (goal: PersonalGoal): string => {
    let name = goal.metric;
    const specifics = [];
    if (goal.drillType) {
        specifics.push(goal.drillType);
    }
    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        specifics.push(goal.pitchTypes.length > 2 ? `${goal.pitchTypes.length} pitch types` : goal.pitchTypes.join('/'));
    }
    if (goal.targetZones && goal.targetZones.length > 0) {
        if (goal.targetZones.length > 2) {
            specifics.push(`${goal.targetZones.length} zones`);
        } else {
            specifics.push(goal.targetZones.join(', '));
        }
    }
    if (specifics.length > 0) {
        name += ` (${specifics.join(' & ')})`;
    }
    return name;
};

export const formatTeamGoalName = (goal: TeamGoal): string => {
    const specifics = [];
    if (goal.drillType) {
        specifics.push(goal.drillType);
    }
    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        specifics.push(goal.pitchTypes.join('/'));
    }
    if (goal.targetZones && goal.targetZones.length > 0) {
        if (goal.targetZones.length > 2) {
            specifics.push(`${goal.targetZones.length} zones`);
        } else {
            specifics.push(goal.targetZones.join(', '));
        }
    }
    if (specifics.length > 0) {
        return `${goal.metric} (${specifics.join(' & ')})`;
    }
    return goal.metric;
};

export const describeRelativeDay = (isoDate?: string): string | null => {
    if (!isoDate) return null;
    const target = new Date(isoDate);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) {
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes} min ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const addTrendLineData = (data: { [key: string]: any }[], dataKey: string): { [key: string]: any }[] => {
    const points = data
        .map((d, index) => ({ x: index, y: d[dataKey] }))
        .filter(p => typeof p.y === 'number' && !isNaN(p.y));

    if (points.length < 2) {
        return data;
    }

    const n = points.length;

    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trendKey = `${dataKey} Trend`;

    return data.map((d, index) => ({
        ...d,
        [trendKey]: slope * index + intercept
    }));
};

// New hitting analytics helpers

export const calculateContactPercentage = (sets: SetResult[]): number => {
    const totalAttempted = sets.reduce((sum, set) => sum + set.repsAttempted, 0);
    const totalStrikeouts = sets.reduce((sum, set) => sum + set.strikeouts, 0);
    if (totalAttempted === 0) return 0;
    const contacts = totalAttempted - totalStrikeouts;
    return Math.round((contacts / totalAttempted) * 100);
};

export const calculate2StrikeBattlePercentage = (sets: SetResult[]): number => {
    const twoStrikeSets = sets.filter(set => set.countSituation === 'Behind');
    if (twoStrikeSets.length === 0) return 0;
    return calculateExecutionPercentage(twoStrikeSets);
};

export interface BreakdownData {
    name: string;
    reps: number;
    execution: number;
}

export const groupSetsByDrill = (sessions: Session[], drills: Drill[]): BreakdownData[] => {
    const grouped: Record<string, { repsAttempted: number; repsExecuted: number }> = {};

    sessions.forEach(session => {
        session.sets.forEach(set => {
            const drillType = resolveDrillTypeForSet(session, set, drills);
            if (!drillType) return;

            if (!grouped[drillType]) {
                grouped[drillType] = { repsAttempted: 0, repsExecuted: 0 };
            }
            grouped[drillType].repsAttempted += set.repsAttempted;
            grouped[drillType].repsExecuted += set.repsExecuted;
        });
    });

    return Object.entries(grouped).map(([name, data]) => ({
        name,
        reps: data.repsAttempted,
        execution: data.repsAttempted > 0 ? Math.round((data.repsExecuted / data.repsAttempted) * 100) : 0,
    }));
};

export const groupSetsByPitch = (sessions: Session[]): BreakdownData[] => {
    const grouped: Record<string, { repsAttempted: number; repsExecuted: number }> = {};

    sessions.forEach(session => {
        session.sets.forEach(set => {
            if (!set.pitchTypes || set.pitchTypes.length === 0) return;

            set.pitchTypes.forEach(pitchType => {
                if (!grouped[pitchType]) {
                    grouped[pitchType] = { repsAttempted: 0, repsExecuted: 0 };
                }
                // Distribute reps evenly across pitch types in the set
                const repsPerPitch = set.repsAttempted / set.pitchTypes.length;
                const execPerPitch = set.repsExecuted / set.pitchTypes.length;
                grouped[pitchType].repsAttempted += repsPerPitch;
                grouped[pitchType].repsExecuted += execPerPitch;
            });
        });
    });

    return Object.entries(grouped).map(([name, data]) => ({
        name,
        reps: Math.round(data.repsAttempted),
        execution: data.repsAttempted > 0 ? Math.round((data.repsExecuted / data.repsAttempted) * 100) : 0,
    }));
};

export const groupSetsByCount = (sessions: Session[]): BreakdownData[] => {
    const grouped: Record<string, { repsAttempted: number; repsExecuted: number }> = {
        'Ahead': { repsAttempted: 0, repsExecuted: 0 },
        'Even': { repsAttempted: 0, repsExecuted: 0 },
        'Behind': { repsAttempted: 0, repsExecuted: 0 },
    };

    sessions.forEach(session => {
        session.sets.forEach(set => {
            const situation = set.countSituation || 'Even';
            grouped[situation].repsAttempted += set.repsAttempted;
            grouped[situation].repsExecuted += set.repsExecuted;
        });
    });

    return Object.entries(grouped)
        .filter(([_, data]) => data.repsAttempted > 0)
        .map(([name, data]) => ({
            name,
            reps: data.repsAttempted,
            execution: Math.round((data.repsExecuted / data.repsAttempted) * 100),
        }));
};

export interface ZoneBreakdownData {
    zone: import('../types').TargetZone;
    execution: number;
    reps: number;
}

export const groupSetsByZone = (sessions: Session[]): ZoneBreakdownData[] => {
    const grouped: Record<string, { repsAttempted: number; repsExecuted: number }> = {};

    sessions.forEach(session => {
        session.sets.forEach(set => {
            if (!set.targetZones || set.targetZones.length === 0) return;

            set.targetZones.forEach(zone => {
                if (!grouped[zone]) {
                    grouped[zone] = { repsAttempted: 0, repsExecuted: 0 };
                }
                const repsPerZone = set.repsAttempted / set.targetZones.length;
                const execPerZone = set.repsExecuted / set.targetZones.length;
                grouped[zone].repsAttempted += repsPerZone;
                grouped[zone].repsExecuted += execPerZone;
            });
        });
    });

    return Object.entries(grouped).map(([zone, data]) => ({
        zone: zone as import('../types').TargetZone,
        reps: Math.round(data.repsAttempted),
        execution: data.repsAttempted > 0 ? Math.round((data.repsExecuted / data.repsAttempted) * 100) : 0,
        topPlayers: [], // Not used in player view
    }));
};

// --- NEW HELPERS ---

export const doesSetMatchGoal = (goal: PersonalGoal, session: Session, set: SetResult, drills: Drill[]) => {
    if (goal.drillType) {
        const setDrillType = resolveDrillTypeForSet(session, set, drills);
        if (setDrillType !== goal.drillType) {
            return false;
        }
    }
    if (goal.targetZones && goal.targetZones.length > 0) {
        if (!set.targetZones?.some((zone) => goal.targetZones!.includes(zone))) {
            return false;
        }
    }
    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        if (!set.pitchTypes?.some((pitch) => goal.pitchTypes!.includes(pitch))) {
            return false;
        }
    }
    return true;
};

export const collectGoalSets = (goal: PersonalGoal, sessions: Session[], drills: Drill[]) => {
    return sessions.flatMap((session) =>
        session.sets
            .filter((set) => doesSetMatchGoal(goal, session, set, drills))
            .map((set) => ({ session, set })),
    );
};

export const summarizeSets = (sets: SetResult[]) =>
    sets.reduce(
        (acc, set) => ({
            attempted: acc.attempted + set.repsAttempted,
            executed: acc.executed + set.repsExecuted,
            hardHits: acc.hardHits + set.hardHits,
            strikeouts: acc.strikeouts + set.strikeouts,
        }),
        { attempted: 0, executed: 0, hardHits: 0, strikeouts: 0 },
    );

export const getGoalValueForSets = (goal: PersonalGoal, sets: SetResult[]) => {
    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(sets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(sets);
        case 'No Strikeouts':
            return sets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return sets.reduce((sum, set) => sum + set.repsAttempted, 0);
        default:
            return 0;
    }
};

export const getPitchingGoalValue = (goal: PersonalGoal, sessions: PitchSession[]) => {
    // Filter sessions by date range
    const relevantSessions = sessions.filter(s => {
        const d = new Date(s.date);
        return d >= new Date(goal.startDate) && d <= new Date(goal.targetDate);
    });

    switch (goal.metric) {
        case 'Strike %':
            const totalPitches = relevantSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0);
            if (totalPitches === 0) return 0;
            const strikes = relevantSessions.flatMap(s => s.pitchRecords || []).filter(p => ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(p.outcome)).length;
            return Math.round((strikes / totalPitches) * 100);
        case 'Velocity':
            // Max velocity in period
            let maxVel = 0;
            relevantSessions.forEach(s => {
                s.pitchRecords?.forEach(p => {
                    if (p.velocityMph && p.velocityMph > maxVel) maxVel = p.velocityMph;
                });
            });
            return maxVel;
        case 'Command':
            // Placeholder for command score logic if complex, or simple strike % equivalent for now
            // For now, let's use Strike % logic as a proxy or 0 if not defined
            return 0;
        default:
            return 0;
    }
};

export const resolveMinRepsRequirement = (goal: PersonalGoal): number | undefined => {
    if (goal.metric !== 'Execution %') {
        return undefined;
    }
    return goal.minReps ?? 50;
};
