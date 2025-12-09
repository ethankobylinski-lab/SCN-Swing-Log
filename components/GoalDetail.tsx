import React, { useState } from 'react';
import { PersonalGoal, Session, Drill, PitchSession } from '../types';
import { GoalProgress } from './GoalProgress';
import { Button } from './Button';

interface GoalDetailProps {
    goal: PersonalGoal;
    sessions: Session[];
    pitchSessions: PitchSession[];
    drills: Drill[];
    reflection: string;
    onReflectionChange: (value: string) => void;
    onSaveReflection: () => void;
    isSavingReflection: boolean;
    errorMessage?: string | null;
}

export const GoalDetail: React.FC<GoalDetailProps> = ({
    goal,
    sessions,
    pitchSessions,
    drills,
    reflection,
    onReflectionChange,
    onSaveReflection,
    isSavingReflection,
    errorMessage
}) => {
    return (
        <div className="space-y-6">
            <GoalProgress
                goal={goal}
                sessions={sessions}
                pitchSessions={pitchSessions}
                drills={drills}
                onDelete={async () => { }} // Delete not allowed from detail view currently
            />

            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Goal Reflection</label>
                <textarea
                    value={reflection}
                    onChange={(e) => onReflectionChange(e.target.value)}
                    placeholder="What are you focusing on to achieve this goal?"
                    className="w-full h-32 p-3 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                <div className="flex justify-end">
                    <Button
                        onClick={onSaveReflection}
                        isLoading={isSavingReflection}
                        variant="primary"
                        size="sm"
                    >
                        Save Reflection
                    </Button>
                </div>
            </div>
        </div>
    );
};
