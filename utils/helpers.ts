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