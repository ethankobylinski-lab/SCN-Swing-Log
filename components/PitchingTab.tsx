import React, { useState, useEffect, useContext } from 'react';
import { Session, PitchSession, Drill, PersonalGoal, Player, PitchTypeModel } from '../types';
import { Button } from './Button';
import { PlusIcon } from './icons/PlusIcon';
import { GoalProgress } from './GoalProgress';
import { SessionHistory } from './SessionHistory';
import { DataContext } from '../contexts/DataContext';
import { usePitchingAnalytics } from '../hooks/usePitchingAnalytics';
import { AnalyticsCharts } from './AnalyticsCharts';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';

interface PitchingTabProps {
    player: Player;
    pitchSessions: PitchSession[];
    goals: PersonalGoal[];
    activePrograms?: any[]; // Placeholder for programs
    onLogSession: () => void;
    onSelectSession: (session: PitchSession) => void;
    onDeleteGoal: (goalId: string) => Promise<void>;
    onAddGoal: () => void;
    onSelectGoal?: (goal: PersonalGoal) => void;
}

export const PitchingTab: React.FC<PitchingTabProps> = ({
    player,
    pitchSessions,
    goals,
    activePrograms,
    onLogSession,
    onSelectSession,
    onDeleteGoal,
    onAddGoal,
    onSelectGoal
}) => {
    // Filter for pitching goals
    const pitchingGoals = goals.filter(g => ['Strike %', 'Velocity', 'Command'].includes(g.metric));

    const { getPitchTypesForPitcher } = useContext(DataContext)!;
    const [pitchTypes, setPitchTypes] = useState<PitchTypeModel[]>([]);

    useEffect(() => {
        const loadPitchTypes = async () => {
            if (player?.id) {
                const types = await getPitchTypesForPitcher(player.id);
                setPitchTypes(types);
            }
        };
        loadPitchTypes();
    }, [player?.id, getPitchTypesForPitcher]);

    const pitchingAnalyticsData = usePitchingAnalytics(pitchSessions, [player], pitchTypes);

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pitching</h1>
                    <p className="text-sm text-muted-foreground">Track your mound work</p>
                </div>
                <Button onClick={onLogSession} variant="secondary" className="gap-2">
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
                {pitchingGoals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pitchingGoals.map(goal => (
                            <GoalProgress
                                key={goal.id}
                                goal={goal}
                                sessions={[]} // Not needed for pitching goals
                                pitchSessions={pitchSessions}
                                drills={[]} // Not needed
                                onDelete={onDeleteGoal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-muted/20 border border-border/50 rounded-xl p-6 text-center">
                        <p className="text-muted-foreground">No active pitching goals.</p>
                    </div>
                )}
            </section>

            {/* Pitching Analytics */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Analytics</h2>
                {pitchingAnalyticsData ? (
                    <div className="space-y-8">
                        <AnalyticsCharts
                            performanceOverTimeData={pitchingAnalyticsData.performanceOverTimeData}
                            drillSuccessData={[]} // Not applicable for pitching yet
                            performanceMetricKey="Strike %"
                            performanceMetricLabel="Strike %"
                            volumeMetricKey="Total Pitches"
                            volumeMetricLabel="Total Pitches"
                        />

                        <div>
                            <h3 className="text-lg font-bold text-foreground mb-4">Breakdowns</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <StrikeZoneHeatmap data={pitchingAnalyticsData.pitchingBreakdowns.byZone.map(z => ({ ...z, execution: z.strikePct, reps: z.pitches }))} />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-sm font-bold text-primary mb-4 uppercase tracking-wide">By Pitch Type</h4>
                                        <div className="space-y-4">
                                            {pitchingAnalyticsData.pitchingBreakdowns.byPitchType.length > 0 ? pitchingAnalyticsData.pitchingBreakdowns.byPitchType.map(d => (
                                                <BreakdownBar key={d.name} label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-accent" />
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-sm font-bold text-primary mb-4 uppercase tracking-wide">By Count</h4>
                                        <div className="space-y-4">
                                            {pitchingAnalyticsData.pitchingBreakdowns.byCount.length > 0 ? pitchingAnalyticsData.pitchingBreakdowns.byCount.map(d => (
                                                <BreakdownBar key={d.name} label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-secondary" />
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-lg font-semibold mb-2">No Pitching Data Yet</p>
                        <p>Log pitching sessions to see your analytics and insights!</p>
                    </div>
                )}
            </section>

            {/* Pitching Journal (History) */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pitching Journal</h2>
                <SessionHistory
                    sessions={[]} // Only showing pitching sessions
                    pitchSessions={pitchSessions}
                    drills={[]}
                    onSelectSession={(session: any) => {
                        // SessionHistory with pitching filter passes the pitch session directly
                        if (session.sessionType === 'pitching' && session.pitchSession) {
                            onSelectSession(session.pitchSession);
                        } else if (session.pitcherId) {
                            // It's already a PitchSession
                            onSelectSession(session);
                        }
                    }}
                    hideFilters={true}
                    initialFilter="pitching"
                />
            </section>
        </div>
    );
};
