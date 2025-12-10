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
            className={`bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${onSelect ? 'cursor-pointer hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''
                }`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h4 className="font-bold text-lg text-foreground mb-1">{formatGoalName(goal)}</h4>
                    <p className="text-sm text-muted-foreground">
                        {displayValue} / {displayTarget}
                    </p>
                    <p className="text-xs text-foreground/70 mt-1">
                        Deadline: {formatDate(goal.targetDate)}
                    </p>
                </div>
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        handleDelete();
                    }}
                    disabled={isDeleting}
                    aria-label="Delete goal"
                    className="text-muted-foreground hover:text-destructive text-xl font-bold disabled:opacity-50 transition-colors flex-shrink-0"
                >
                    {isDeleting ? '...' : '\u00d7'}
                </button>
            </div>
            <div className="space-y-2">
                <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                    {progress > 10 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                            {Math.round(progress)}% complete
                        </span>
                    )}
                </div>
            </div>
            {goal.metric === 'Execution %' && minRepsRequired && (
                <p className="text-xs text-foreground/70">
                    Volume: {totalRepsLogged}/{minRepsRequired} reps logged
                </p>
            )}
        </div>
    );
};
