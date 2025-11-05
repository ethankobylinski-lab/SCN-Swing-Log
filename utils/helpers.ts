import { Session, Drill, SetResult, PersonalGoal, GoalType, DrillType, TeamGoal } from '../types';
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


export const getCurrentMetricValue = (goal: PersonalGoal, sessions: Session[], drills: Drill[]): number => {
    const filteredSessions = goal.drillType
        ? sessions.filter(s => getDrillTypeForSession(s, drills) === goal.drillType)
        : sessions;

    let allSets = filteredSessions.flatMap(s => s.sets);

    if (goal.targetZones && goal.targetZones.length > 0) {
        allSets = allSets.filter(set =>
            set.targetZones?.some(zone => goal.targetZones!.includes(zone))
        );
    }

    if (allSets.length === 0) return 0;

    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(allSets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(allSets);
        case 'No Strikeouts':
            return allSets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        default:
            return 0;
    }
};

export const getCurrentTeamMetricValue = (goal: TeamGoal, sessions: Session[], drills: Drill[]): number => {
    let filteredSessions = sessions;

    if (goal.drillType) {
        filteredSessions = filteredSessions.filter(s => getDrillTypeForSession(s, drills) === goal.drillType);
    }

    let allSets = filteredSessions.flatMap(s => s.sets);
    
    if (goal.targetZones && goal.targetZones.length > 0) {
        allSets = allSets.filter(set =>
            set.targetZones?.some(zone => goal.targetZones!.includes(zone))
        );
    }

    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        allSets = allSets.filter(set =>
            set.pitchTypes?.some(pitch => goal.pitchTypes!.includes(pitch))
        );
    }
    
    if (allSets.length === 0) return 0;

    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(allSets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(allSets);
        case 'No Strikeouts':
            // For a team goal, this would likely be an average, but for now we sum it.
            // A better team goal would be "Avg Strikeouts per Session"
            return allSets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
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