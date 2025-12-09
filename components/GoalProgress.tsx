import React, { useMemo, useState } from 'react';
import { PersonalGoal, Session, PitchSession, Drill, UserRole } from '../types';
import {
    collectGoalSets,
    getGoalValueForSets,
    getPitchingGoalValue,
    resolveMinRepsRequirement,
    formatGoalName,
    formatDate
} from '../utils/helpers';

export const GoalProgress: React.FC<{
    goal: PersonalGoal;
    sessions: Session[];
    pitchSessions: PitchSession[];
    drills: Drill[];
    onDelete: (goalId: string) => Promise<void>;
    onSelect?: (goal: PersonalGoal) => void;
}> = ({ goal, sessions, pitchSessions, drills, onDelete, onSelect }) => {
    const isPitchingGoal = ['Strike %', 'Velocity', 'Command'].includes(goal.metric);

    const goalSets = useMemo(() => !isPitchingGoal ? collectGoalSets(goal, sessions, drills) : [], [goal, sessions, drills, isPitchingGoal]);
    const filteredSets = goalSets.map(({ set }) => set);

    const currentValue = isPitchingGoal
        ? getPitchingGoalValue(goal, pitchSessions)
        : (filteredSets.length > 0 ? getGoalValueForSets(goal, filteredSets) : 0);

    const totalRepsLogged = !isPitchingGoal ? filteredSets.reduce((sum, set) => sum + set.repsAttempted, 0) : 0;
    const minRepsRequired = resolveMinRepsRequirement(goal);
    const volumeRatio =
        minRepsRequired && minRepsRequired > 0 ? Math.min(totalRepsLogged / minRepsRequired, 1) : 1;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete(goal.id);
        } finally {
            setIsDeleting(false);
        }
    };

    let progress = 0;
    if (goal.targetValue > 0) {
        if (goal.metric === 'No Strikeouts') {
            progress = Math.max(0, 100 - (currentValue / goal.targetValue * 100));
        } else {
            progress = (currentValue / goal.targetValue) * 100;
        }
    } else if (goal.metric === 'No Strikeouts' && goal.targetValue === 0) {
        progress = currentValue === 0 ? 100 : 0;
    }

    const isPercentage = goal.metric.includes('%');
    const displayValue = isPercentage ? `${currentValue}%` : currentValue;
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;
    if (goal.metric === 'Execution %' && minRepsRequired) {
        progress *= volumeRatio;
    }
    const handleSelect = () => {
        if (onSelect) {
            onSelect(goal);
        }
    };
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onSelect) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(goal);
        }
    };

    return (
        <div
            className={`bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-sm ${onSelect ? 'cursor-pointer hover:border-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60' : ''
                }`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-semibold text-card-foreground">{formatGoalName(goal)}</h4>
                    <p className="text-xs text-muted-foreground">Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {goal.createdByRole === UserRole.Coach ? 'Coach-assigned goal' : 'Self-set goal'}
                    </p>
                </div>
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        handleDelete();
                    }}
                    disabled={isDeleting}
                    aria-label="Delete goal"
                    className="text-muted-foreground hover:text-destructive text-lg font-bold disabled:opacity-50"
                >
                    {isDeleting ? '...' : '\u00d7'}
                </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
                <div className="w-full bg-background rounded-full h-2.5">
                    <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <span className="text-sm font-bold text-primary">{displayValue}</span>
            </div>
            {goal.metric === 'Execution %' && minRepsRequired && (
                <p className="text-[11px] text-muted-foreground">
                    Volume: {totalRepsLogged}/{minRepsRequired} reps logged
                </p>
            )}
        </div>
    );
};
