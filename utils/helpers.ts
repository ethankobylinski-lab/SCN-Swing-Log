import { Session, Drill, SetResult } from '../types';

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

const getDateKey = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toShortLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, (month ?? 1) - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const limitSortedDateKeys = (dateKeys: string[], limit: number) => {
    const sorted = dateKeys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sorted.slice(Math.max(sorted.length - limit, 0));
};

export const buildExecutionTrend = (sessions: Session[], limit = 7) => {
    if (sessions.length === 0) return [] as { name: string; 'Execution %': number }[];

    const grouped = sessions.reduce<Record<string, Session[]>>((acc, session) => {
        const key = getDateKey(session.date);
        acc[key] = acc[key] ? [...acc[key], session] : [session];
        return acc;
    }, {});

    return limitSortedDateKeys(Object.keys(grouped), limit).map(dateKey => {
        const daySessions = grouped[dateKey];
        const avgExecution = Math.round(
            daySessions.reduce((sum, current) => sum + calculateExecutionPercentage(current.sets), 0) /
            daySessions.length
        );
        return { name: toShortLabel(dateKey), 'Execution %': avgExecution };
    });
};

export const buildHardHitTrend = (sessions: Session[], limit = 7) => {
    if (sessions.length === 0) return [] as { name: string; 'Hard Hit %': number }[];

    const grouped = sessions.reduce<Record<string, Session[]>>((acc, session) => {
        const key = getDateKey(session.date);
        acc[key] = acc[key] ? [...acc[key], session] : [session];
        return acc;
    }, {});

    return limitSortedDateKeys(Object.keys(grouped), limit).map(dateKey => {
        const daySessions = grouped[dateKey];
        const avgHardHit = Math.round(
            daySessions.reduce((sum, current) => sum + calculateHardHitPercentage(current.sets), 0) /
            daySessions.length
        );
        return { name: toShortLabel(dateKey), 'Hard Hit %': avgHardHit };
    });
};

export const buildDrillSuccessData = (sessions: Session[], drills: Drill[]) => {
    if (drills.length === 0) return [] as { name: string; 'Success Rate': number; 'Avg Metric': number; goalType: string }[];

    return drills
        .map(drill => {
            const drillSessions = sessions.filter(session => session.drillId === drill.id);
            if (drillSessions.length === 0) {
                return null;
            }

            const progressValues = drillSessions.map(session => getSessionGoalProgress(session, drill));
            const successes = progressValues.filter(result => result.isSuccess).length;
            const successRate = Math.round((successes / drillSessions.length) * 100);
            const averageMetric = Math.round(
                progressValues.reduce((sum, result) => sum + result.value, 0) / progressValues.length
            );

            return {
                name: drill.name,
                'Success Rate': successRate,
                'Avg Metric': averageMetric,
                goalType: drill.goalType,
            };
        })
        .filter(Boolean) as { name: string; 'Success Rate': number; 'Avg Metric': number; goalType: string }[];
};
