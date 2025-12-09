import React, { useState, useMemo, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import {
    Player, PitchSession, TeamGoal, PitchSimulationTemplate
} from '../types';
import {
    formatDate,
    getCurrentTeamMetricValue,
    formatTeamGoalName
} from '../utils/helpers';
import { Button } from './Button';
import { AnalyticsCharts } from './AnalyticsCharts';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { Tooltip } from './Tooltip';
import { Modal } from './Modal';
import { GoalForm, GoalFormValues } from './GoalForm';
import { PitchingProgramsSection } from './PitchingProgramsSection';

interface CoachPitchingTabProps {
    players: Player[];
    pitchSessions: PitchSession[];
    pitchingPrograms: PitchSimulationTemplate[];
    teamGoals: TeamGoal[];
    pitchingData: any; // CoachPitchingAnalyticsData from usePitchingAnalytics
}

type TopPlayer = { name: string; value: number; reps: number };

const PlayerLeaderboard: React.FC<{ players: TopPlayer[], metricSuffix?: string }> = ({ players, metricSuffix = '%' }) => {
    if (players.length === 0) {
        return <p className="text-muted-foreground">Not enough data for top performers.</p>;
    }
    return (
        <div className="space-y-1 text-left">
            <h4 className="font-bold text-sm text-secondary">Top Performers</h4>
            {players.map((p, index) => (
                <div key={p.name} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2">{index + 1}. {p.name}</span>
                    <span className="font-bold flex-shrink-0">{p.value}{metricSuffix}</span>
                </div>
            ))}
        </div>
    );
};

export const CoachPitchingTab: React.FC<CoachPitchingTabProps> = ({
    players,
    pitchSessions,
    pitchingPrograms,
    teamGoals,
    pitchingData,
}) => {
    const { createTeamGoal, deleteTeamGoal, activeTeam } = useContext(DataContext)!;
    const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [teamGoalFormError, setTeamGoalFormError] = useState<string | null>(null);
    const [isSavingTeamGoal, setIsSavingTeamGoal] = useState(false);

    const filteredPitchSessions = useMemo(() => {
        if (dateRange === 'all') return pitchSessions;
        const days = dateRange === '7d' ? 7 : 30;
        const cutoff = new Date(Date.now() - days * 86400000);
        return pitchSessions.filter(s => new Date(s.date) > cutoff);
    }, [pitchSessions, dateRange]);

    const pitchingStats = useMemo(() => {
        const totalPitches = filteredPitchSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0);
        const totalStrikes = filteredPitchSessions.reduce((sum, s) => {
            if (s.pitchRecords) {
                return sum + s.pitchRecords.filter(p => ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(p.outcome)).length;
            }
            return sum;
        }, 0);
        const strikePct = totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0;

        return {
            sessions: filteredPitchSessions.length,
            totalPitches,
            strikePct,
        };
    }, [filteredPitchSessions]);

    const pitchingGoals = teamGoals.filter(g =>
        g.status === 'Active' &&
        ['Strike %', 'Total Pitches', 'Command'].includes(g.metric)
    );

    const handleCreateTeamGoal = async (goalData: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'>) => {
        if (!activeTeam) {
            setTeamGoalFormError('Set up a team before creating goals.');
            return;
        }

        setTeamGoalFormError(null);
        setIsSavingTeamGoal(true);
        try {
            await createTeamGoal({
                ...goalData,
                teamId: activeTeam.id,
                status: 'Active',
                startDate: new Date().toISOString()
            });
            setIsGoalModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this team goal. Please try again.';
            setTeamGoalFormError(message);
        } finally {
            setIsSavingTeamGoal(false);
        }
    };

    const handleDeleteTeamGoal = async (goalId: string) => {
        try {
            await deleteTeamGoal(goalId);
        } catch (err) {
            console.error('Failed to delete goal:', err);
        }
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Header with Filters */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Pitching</h1>
                        <p className="text-muted-foreground mt-1">Team analytics and prescription</p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | 'all')}
                            className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Team Insights */}
            <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Team Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessions</p>
                        <p className="text-4xl font-bold text-secondary mt-2">{pitchingStats.sessions}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Pitches</p>
                        <p className="text-4xl font-bold text-secondary mt-2">{pitchingStats.totalPitches}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Strike %</p>
                        <p className="text-4xl font-bold text-secondary mt-2">{pitchingStats.strikePct}%</p>
                    </div>
                </div>

                {/* Analytics Charts */}
                {pitchingData && (
                    <div className="space-y-6">
                        <AnalyticsCharts
                            performanceOverTimeData={pitchingData.performanceOverTimeData}
                            drillSuccessData={[]}
                            performanceMetricKey="Strike %"
                            performanceMetricLabel="Strike %"
                            volumeMetricKey="Total Pitches"
                            volumeMetricLabel="Total Pitches"
                        />

                        {/* Team Breakdowns with Top Performers */}
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Pitching Breakdowns</h3>
                            <p className="text-sm text-muted-foreground mb-4">Hover over bars to see top performers</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <StrikeZoneHeatmap
                                        data={pitchingData.pitchingBreakdowns.byZone.map(z => ({
                                            ...z,
                                            execution: z.strikePct,
                                            reps: z.pitches
                                        }))}
                                    />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-bold text-primary mb-4">By Pitch Type</h4>
                                        <div className="space-y-4">
                                            {pitchingData.pitchingBreakdowns.byPitchType.length > 0 ? (
                                                pitchingData.pitchingBreakdowns.byPitchType.map(d => (
                                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                        <BreakdownBar label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-accent" />
                                                    </Tooltip>
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground text-center py-4">No data available.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-bold text-primary mb-4">By Count</h4>
                                        <div className="space-y-4">
                                            {pitchingData.pitchingBreakdowns.byCount.length > 0 ? (
                                                pitchingData.pitchingBreakdowns.byCount.map(d => (
                                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                        <BreakdownBar label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-secondary" />
                                                    </Tooltip>
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground text-center py-4">No data available.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pitching Programs Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Pitching Programs</h2>
                <PitchingProgramsSection />
            </div>

            {/* Team Goals Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Team Pitching Goals</h2>
                        <p className="text-sm text-muted-foreground">Set and track team-wide pitching objectives</p>
                    </div>
                    <Button onClick={() => setIsGoalModalOpen(true)} size="sm">
                        + Create Goal
                    </Button>
                </div>

                {pitchingGoals.length > 0 ? (
                    <div className="space-y-3">
                        {pitchingGoals.map(goal => {
                            const currentValue = getCurrentTeamMetricValue(goal, [], [], pitchSessions); // Pass pitchSessions for calculation
                            let progress = 0;
                            if (goal.targetValue > 0) {
                                progress = (currentValue / goal.targetValue) * 100;
                            }
                            const isPercentage = goal.metric.includes('%');
                            const displayValue = isPercentage ? `${Math.round(currentValue)}%` : Math.round(currentValue);
                            const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;

                            return (
                                <div key={goal.id} className="bg-muted/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-foreground">{goal.description}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {formatTeamGoalName(goal)} | Target: {displayTarget} by {formatDate(goal.targetDate)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTeamGoal(goal.id)}
                                            className="text-muted-foreground hover:text-destructive text-lg font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-full bg-background rounded-full h-2.5">
                                            <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-secondary">{displayValue}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No team pitching goals yet. Create one to start tracking progress.
                    </p>
                )}
            </div>

            {/* Goal Creation Modal */}
            <Modal
                isOpen={isGoalModalOpen}
                onClose={() => {
                    if (isSavingTeamGoal) return;
                    setTeamGoalFormError(null);
                    setIsGoalModalOpen(false);
                }}
                title="Create Team Pitching Goal"
            >
                <GoalForm
                    onSave={handleCreateTeamGoal}
                    isSaving={isSavingTeamGoal}
                    errorMessage={teamGoalFormError}
                    context="pitching"
                />
            </Modal>
        </div>
    );
};
