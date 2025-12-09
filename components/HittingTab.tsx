import React from 'react';
import { Session, Drill, PersonalGoal, Player } from '../types';
import { Button } from './Button';
import { PlusIcon } from './icons/PlusIcon';
import { GoalProgress } from './GoalProgress';
import { SessionHistory } from './SessionHistory';
import { HittingAnalytics } from './HittingAnalytics';

interface HittingTabProps {
    player: Player;
    sessions: Session[];
    drills: Drill[];
    goals: PersonalGoal[];
    activePrograms?: Drill[]; // Or whatever type programs are
    onLogSession: () => void;
    onSelectSession: (session: Session) => void;
    onEditSession: (session: Session) => void;
    onDeleteGoal: (goalId: string) => Promise<void>;
    onAddGoal: () => void;
    onSelectGoal?: (goal: PersonalGoal) => void;
}

export const HittingTab: React.FC<HittingTabProps> = ({
    player,
    sessions,
    drills,
    goals,
    activePrograms,
    onLogSession,
    onSelectSession,
    onEditSession,
    onDeleteGoal,
    onAddGoal,
    onSelectGoal
}) => {
    // Filter for hitting goals
    const hittingGoals = goals.filter(g => !['Strike %', 'Velocity', 'Command'].includes(g.metric));

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Hitting</h1>
                    <p className="text-sm text-muted-foreground">Track your swing progress</p>
                </div>
                <Button onClick={onLogSession} variant="primary" className="gap-2 rounded-full">
                    <PlusIcon className="w-5 h-5" />
                    Log Session
                </Button>
            </div>

            {/* Active Goals */}
            <section className="space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Goals</h2>
                    <Button
                        onClick={onAddGoal}
                        variant="secondary"
                        size="sm"
                        className="gap-1"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Set Goal
                    </Button>
                </div>
                {hittingGoals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hittingGoals.map(goal => (
                            <GoalProgress
                                key={goal.id}
                                goal={goal}
                                sessions={sessions}
                                pitchSessions={[]} // Not needed for hitting goals
                                drills={drills}
                                onDelete={onDeleteGoal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground mb-1">No hitting goals yet</p>
                                <p className="text-sm text-muted-foreground">Set a goal to track your progress</p>
                            </div>
                            <Button
                                onClick={onAddGoal}
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                            >
                                Set a goal
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            {/* Hitting Analytics */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Analytics</h2>
                <HittingAnalytics
                    sessions={sessions}
                    drills={drills}
                    player={player}
                />
            </section>

            {/* Hitting Journal (History) */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hitting Journal</h2>
                <SessionHistory
                    sessions={sessions}
                    pitchSessions={[]} // Only showing hitting sessions
                    drills={drills}
                    onSelectSession={onSelectSession}
                    onEditSession={onEditSession}
                    hideFilters={true}
                    initialFilter="batting"
                />
            </section>
        </div>
    );
};
