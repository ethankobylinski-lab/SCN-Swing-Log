import React, { useState, useMemo, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import {
    Player, Session, Drill, DrillAssignment, TeamGoal, DrillType
} from '../types';
import {
    calculateExecutionPercentage,
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

interface CoachHittingTabProps {
    players: Player[];
    sessions: Session[];
    drills: Drill[];
    drillAssignments: DrillAssignment[];
    teamGoals: TeamGoal[];
    analyticsData: any; // CoachAnalyticsData from CoachView
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

export const CoachHittingTab: React.FC<CoachHittingTabProps> = ({
    players,
    sessions,
    drills,
    drillAssignments,
    teamGoals,
    analyticsData,
}) => {
    const { createTeamGoal, deleteTeamGoal, activeTeam } = useContext(DataContext)!;
    const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [teamGoalFormError, setTeamGoalFormError] = useState<string | null>(null);
    const [isSavingTeamGoal, setIsSavingTeamGoal] = useState(false);

    const filteredSessions = useMemo(() => {
        if (dateRange === 'all') return sessions;
        const days = dateRange === '7d' ? 7 : 30;
        const cutoff = new Date(Date.now() - days * 86400000);
        return sessions.filter(s => new Date(s.date) > cutoff);
    }, [sessions, dateRange]);

    const hittingStats = useMemo(() => {
        const allSets = filteredSessions.flatMap(s => s.sets);
        const totalSwings = allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        const executionPct = calculateExecutionPercentage(allSets);

        return {
            sessions: filteredSessions.length,
            totalSwings,
            executionPct,
        };
    }, [filteredSessions]);

    const hittingGoals = teamGoals.filter(g =>
        g.status === 'Active' &&
        !['Strike %', 'Total Pitches', 'Command'].includes(g.metric)
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
                        <h1 className="text-3xl font-bold text-foreground">Hitting</h1>
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
                        <p className="text-4xl font-bold text-primary mt-2">{hittingStats.sessions}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Swings</p>
                        <p className="text-4xl font-bold text-primary mt-2">{hittingStats.totalSwings}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Execution %</p>
                        <p className="text-4xl font-bold text-primary mt-2">{hittingStats.executionPct}%</p>
                    </div>
                </div>

                {/* Analytics Charts */}
                {analyticsData && (
                    <div className="space-y-6">
                        <AnalyticsCharts
                            performanceOverTimeData={analyticsData.performanceOverTimeData}
                            drillSuccessData={analyticsData.drillSuccessData}
                        />

                        {/* Team Breakdowns with Top Performers */}
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Team Performance Breakdowns</h3>
                            <p className="text-sm text-muted-foreground mb-4">Hover over any bar to see top performers</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <StrikeZoneHeatmap data={analyticsData.teamBreakdowns.byZone} />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-bold text-primary mb-4">By Drill Type</h4>
                                        <div className="space-y-4">
                                            {analyticsData.teamBreakdowns.byDrillType.length > 0 ? (
                                                analyticsData.teamBreakdowns.byDrillType.map(d => (
                                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                        <BreakdownBar label={d.name} reps={d.reps} percentage={d.execution} />
                                                    </Tooltip>
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground text-center py-4">No data available.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-bold text-primary mb-4">By Pitch Type</h4>
                                        <div className="space-y-4">
                                            {analyticsData.teamBreakdowns.byPitchType.length > 0 ? (
                                                analyticsData.teamBreakdowns.byPitchType.map(d => (
                                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                        <BreakdownBar label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-accent" />
                                                    </Tooltip>
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground text-center py-4">Log pitch types to see this breakdown.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Team Goals Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Team Hitting Goals</h2>
                        <p className="text-sm text-muted-foreground">Set and track team-wide hitting objectives</p>
                    </div>
                    <Button onClick={() => setIsGoalModalOpen(true)} size="sm">
                        + Create Goal
                    </Button>
                </div>

                {hittingGoals.length > 0 ? (
                    <div className="space-y-3">
                        {hittingGoals.map(goal => {
                            const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);
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
                                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-primary">{displayValue}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No team hitting goals yet. Create one to start tracking progress.
                    </p>
                )}
            </div>

            {/* Drills & Programs Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Drills & Programs</h2>
                        <p className="text-sm text-muted-foreground">Manage team drills and track assignments</p>
                    </div>
                    <Button onClick={() => {
                        // Create drill functionality - would trigger DrillForm modal
                        console.log('Create drill clicked');
                    }} size="sm">
                        + Create Drill
                    </Button>
                </div>

                {drills.length > 0 ? (
                    <div className="space-y-4">
                        {drills.map(drill => {
                            // Find assignments for this drill
                            const assignments = drillAssignments.filter(a => a.drillId === drill.id);
                            const assignedPlayerCount = assignments.reduce((acc, a) => {
                                return acc + a.playerIds.length;
                            }, 0);

                            return (
                                <div key={drill.id} className="bg-muted/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-foreground">{drill.name}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{drill.description}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => {
                                                    // Assign drill functionality
                                                    console.log('Assign drill:', drill.id);
                                                }}
                                                className="text-xs bg-secondary/20 hover:bg-secondary/30 text-secondary px-3 py-1.5 rounded-md font-medium transition-colors"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <p className="text-muted-foreground">Goal</p>
                                            <p className="font-semibold text-foreground">
                                                {drill.goalType} ≥ {drill.goalTargetValue}
                                                {String(drill.goalType).includes("%") ? "%" : ""}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Volume</p>
                                            <p className="font-semibold text-foreground">
                                                {drill.sets} × {drill.repsPerSet} reps
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Type</p>
                                            <p className="font-semibold text-foreground capitalize">
                                                {drill.drillType || 'General'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Assigned</p>
                                            <p className="font-semibold text-primary">
                                                {assignedPlayerCount} player{assignedPlayerCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Show assignments */}
                                    {assignments.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <p className="text-xs text-muted-foreground mb-2">Active Assignments:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {assignments.map(assignment => (
                                                    <div key={assignment.id} className="text-xs bg-background px-2 py-1 rounded-md">
                                                        {assignment.playerIds.length === players.length ? (
                                                            <span className="text-primary font-medium">Entire Team</span>
                                                        ) : (
                                                            <span className="text-foreground">
                                                                {assignment.playerIds.map(pid =>
                                                                    players.find(p => p.id === pid)?.name || 'Unknown'
                                                                ).join(', ')}
                                                            </span>
                                                        )}
                                                        {assignment.isRecurring && (
                                                            <span className="text-muted-foreground ml-2">
                                                                ({assignment.recurringDays?.join(', ')})
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">No drills created yet.</p>
                        <p className="text-sm text-muted-foreground">
                            Create reusable drills and assign them to players or the entire team.
                        </p>
                    </div>
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
                title="Create Team Hitting Goal"
            >
                <GoalForm
                    onSave={handleCreateTeamGoal}
                    isSaving={isSavingTeamGoal}
                    errorMessage={teamGoalFormError}
                    context="hitting"
                />
            </Modal>
        </div>
    );
};
