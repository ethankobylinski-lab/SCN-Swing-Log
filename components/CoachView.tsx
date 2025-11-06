import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Player, Team, Drill, Session, DayOfWeek, TargetZone, PitchType, CountSituation, BaseRunner, GoalType, DrillType, PersonalGoal, SetResult, TeamGoal } from '../types';
import { AnalyticsCharts } from './AnalyticsCharts';
import { Modal } from './Modal';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, GOAL_TYPES, DRILL_TYPES } from '../constants';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, getCurrentMetricValue, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName } from '../utils/helpers';
import { Avatar } from './Avatar';
import { PlayerRadarChart } from './PlayerRadarChart';
import { TeamTrendChart } from './TeamTrendChart';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { Tooltip } from './Tooltip';


// --- ANALYTICS SUB-COMPONENTS ---
type TopPlayer = { name: string; value: number; reps: number };

interface CoachAnalyticsData {
    performanceOverTimeData: any[];
    drillSuccessData: any[];
    drillEffectiveness: {
        execution: { name: string; value: number; topPlayers: TopPlayer[] }[];
        hardHit: { name: string; value: number; topPlayers: TopPlayer[] }[];
        contact: { name: string; value: number; topPlayers: TopPlayer[] }[];
    };
    teamBreakdowns: {
        byDrillType: { name: string; reps: number; execution: number; topPlayers: TopPlayer[] }[];
        byPitchType: { name: string; reps: number; execution: number; topPlayers: TopPlayer[] }[];
        byCount: { name: string; reps: number; execution: number; topPlayers: TopPlayer[] }[];
        byZone: { zone: TargetZone; execution: number; reps: number; topPlayers: TopPlayer[] }[];
    }
}

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

const EffectivenessCard: React.FC<{ title: string; drills: {name: string; value: number; topPlayers: TopPlayer[]}[] }> = ({ title, drills }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full">
        <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
        <div className="space-y-3">
            {drills.length > 0 ? drills.map((d, index) => (
                <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                    <div className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted">
                        <span className="font-semibold text-card-foreground truncate pr-2">{index + 1}. {d.name}</span>
                        <span className="font-bold text-secondary flex-shrink-0">{d.value}%</span>
                    </div>
                </Tooltip>
            )) : <p className="text-muted-foreground text-center py-4">Not enough data.</p>}
        </div>
    </div>
);

const CoachAnalyticsPage: React.FC<{ analyticsData: CoachAnalyticsData }> = ({ analyticsData }) => {
    return (
        <div className="space-y-8">
            <AnalyticsCharts 
                performanceOverTimeData={analyticsData.performanceOverTimeData}
                drillSuccessData={analyticsData.drillSuccessData}
            />

            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Drill Effectiveness</h2>
                <p className="text-sm text-muted-foreground mb-4">Top performing drills based on player results. Hover to see top players.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <EffectivenessCard title="Top for Execution %" drills={analyticsData.drillEffectiveness.execution} />
                    <EffectivenessCard title="Top for Hard Hit %" drills={analyticsData.drillEffectiveness.hardHit} />
                    <EffectivenessCard title="Top for Contact %" drills={analyticsData.drillEffectiveness.contact} />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Team Performance Breakdowns</h2>
                 <p className="text-sm text-muted-foreground mb-4">Hover over any bar or strike zone area to see top individual performers.</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                    <div className="lg:col-span-1">
                        <StrikeZoneHeatmap data={analyticsData.teamBreakdowns.byZone} />
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-primary mb-4">By Drill Type</h3>
                            <div className="space-y-4">
                                {analyticsData.teamBreakdowns.byDrillType.length > 0 ? analyticsData.teamBreakdowns.byDrillType.map(d => (
                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                        <BreakdownBar label={d.name} reps={d.reps} percentage={d.execution} />
                                    </Tooltip>
                                )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                            </div>
                        </div>
                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-primary mb-4">By Pitch Type</h3>
                            <div className="space-y-4">
                                {analyticsData.teamBreakdowns.byPitchType.length > 0 ? analyticsData.teamBreakdowns.byPitchType.map(d => (
                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                        <BreakdownBar label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-accent" />
                                    </Tooltip>
                                )) : <p className="text-muted-foreground text-center py-4">Log pitch types to see this breakdown.</p>}
                            </div>
                        </div>
                         <div className="bg-card border border-border p-4 rounded-lg shadow-sm md:col-span-2">
                            <h3 className="text-lg font-bold text-primary mb-4">By Count</h3>
                            <div className="space-y-4">
                                {analyticsData.teamBreakdowns.byCount.length > 0 ? analyticsData.teamBreakdowns.byCount.map(d => (
                                    <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                        <BreakdownBar label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-secondary" />
                                    </Tooltip>
                                )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN VIEW COMPONENTS ---

const TeamGoalProgress: React.FC<{ goal: TeamGoal; sessions: Session[]; drills: Drill[]; onDelete: (goalId: string) => void }> = ({ goal, sessions, drills, onDelete }) => {
    const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);
    
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
    const displayValue = isPercentage ? `${Math.round(currentValue)}%` : Math.round(currentValue);
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;

    return (
        <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-card-foreground">{goal.description}</h4>
                    <p className="text-xs text-muted-foreground">{formatTeamGoalName(goal)} | Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
                </div>
                <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive text-lg font-bold">&times;</button>
            </div>
            <div className="flex items-center gap-3 mt-2">
                <div className="w-full bg-background rounded-full h-2.5">
                    <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <span className="text-sm font-bold text-primary">{displayValue}</span>
            </div>
        </div>
    );
};

const CoachDashboard: React.FC<{ 
    players: Player[], 
    drills: Drill[], 
    sessions: Session[], 
    teamGoals: TeamGoal[],
}> = ({ players, drills, sessions, teamGoals }) => {
    
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const { createTeamGoal, deleteTeamGoal, activeTeam } = useContext(DataContext)!;
    
    const sessionsLast7Days = useMemo(() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        return sessions.filter(s => new Date(s.date) > sevenDaysAgo);
    }, [sessions]);

    const teamExecutionPctLast7Days = useMemo(() => {
        const allSets = sessionsLast7Days.flatMap(s => s.sets);
        return calculateExecutionPercentage(allSets);
    }, [sessionsLast7Days]);

    const totalRepsLast7Days = useMemo(() => {
        return sessionsLast7Days.flatMap(s => s.sets).reduce((sum, set) => sum + set.repsAttempted, 0);
    }, [sessionsLast7Days]);

    const activePlayersCountLast7Days = useMemo(() => {
        const activePlayerIds = new Set(sessionsLast7Days.map(s => s.playerId));
        return activePlayerIds.size;
    }, [sessionsLast7Days]);

    const recentSessions = useMemo(() => {
        return sessions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [sessions]);

    const teamPerformanceTrend = useMemo(() => {
        const last7Days = new Map<string, { totalExecuted: number, totalAttempted: number }>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            last7Days.set(dateString, { totalExecuted: 0, totalAttempted: 0 });
        }
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);

            if ((today.getTime() - sessionDate.getTime()) / (1000 * 3600 * 24) < 7) {
                const dateString = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (last7Days.has(dateString)) {
                    const dayData = last7Days.get(dateString)!;
                    session.sets.forEach(set => {
                        dayData.totalExecuted += set.repsExecuted;
                        dayData.totalAttempted += set.repsAttempted;
                    });
                }
            }
        });

        return Array.from(last7Days.entries())
            .map(([date, data]) => ({
                date,
                'Execution %': data.totalAttempted > 0 ? Math.round((data.totalExecuted / data.totalAttempted) * 100) : 0,
            }))
            .reverse();
    }, [sessions]);

    const leaderboard = useMemo(() => {
        return players.map(player => {
            const playerSessions = sessions.filter(s => s.playerId === player.id);
            const allSets = playerSessions.flatMap(s => s.sets);
            const totalReps = allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
            return {
                player,
                execPct: calculateExecutionPercentage(allSets),
                sessionsCount: playerSessions.length,
                totalReps: totalReps,
            };
        })
        .filter(p => p.sessionsCount > 0)
        .sort((a, b) => b.execPct - a.execPct)
        .slice(0, 3);
    }, [players, sessions]);
    
    const inactivePlayers = useMemo(() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const activePlayerIds = new Set(sessions.filter(s => new Date(s.date) > sevenDaysAgo).map(s => s.playerId));
        return players.filter(p => !activePlayerIds.has(p.id));
    }, [players, sessions]);
    
    const handleCreateTeamGoal = (goalData: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'>) => {
        if (!activeTeam) return;
        createTeamGoal({
            ...goalData,
            teamId: activeTeam.id,
            status: 'Active',
            startDate: new Date().toISOString()
        });
        setIsGoalModalOpen(false);
    };
    
    const StatCard: React.FC<{title: string; value: string; subValue?: string}> = ({title, value, subValue}) => (
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm text-center">
            <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
            <p className="text-4xl font-bold text-foreground mt-1">{value} {subValue && <span className="text-xl text-muted-foreground">/ {subValue}</span>}</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active Players (7d)" value={activePlayersCountLast7Days.toString()} subValue={players.length.toString()} />
                <StatCard title="Total Reps (7d)" value={totalRepsLast7Days.toLocaleString()} />
                <StatCard title="Execution % (7d)" value={`${teamExecutionPctLast7Days}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <TeamTrendChart data={teamPerformanceTrend} />
                    
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-2">Recent Activity</h3>
                        <ul className="divide-y divide-border">
                            {recentSessions.map(session => {
                                const player = players.find(p => p.id === session.playerId);
                                const drill = drills.find(d => d.id === session.drillId);
                                if (!player) return null;
                                
                                const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: calculateExecutionPercentage(session.sets) > 70 };
                                const goalType = drill ? drill.goalType : 'Execution %';
                                
                                return (
                                    <li key={session.id} className="py-3 flex items-center">
                                        <Avatar name={player.name} className="w-10 h-10 mr-4" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-card-foreground">{player.name} completed <span className="text-primary font-bold">{session.name}</span></p>
                                            <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                                        </div>
                                        <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                            {goalType}: {progress.value}%
                                        </div>
                                    </li>
                                )
                            })}
                            {recentSessions.length === 0 && <p className="text-muted-foreground text-center py-4">No recent activity.</p>}
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-8">
                     <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-4">Top Performers</h3>
                        <div className="space-y-4">
                            {leaderboard.map((p, index) => (
                                <div key={p.player.id} className="flex items-center">
                                    <span className="font-bold text-lg text-muted-foreground w-6">{index + 1}.</span>
                                    <Avatar name={p.player.name} className="w-10 h-10 mr-3" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-foreground">{p.player.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.sessionsCount} sessions / {p.totalReps} reps</p>
                                    </div>
                                    <p className="font-bold text-lg text-secondary">{p.execPct}%</p>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-muted-foreground text-center py-4">Log sessions to see top performers.</p>}
                        </div>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-primary">Active Team Goals</h3>
                            <button onClick={() => setIsGoalModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-1 px-3 text-sm rounded-lg">+ Set Goal</button>
                        </div>
                        <div className="space-y-4">
                             {teamGoals.length > 0 ? teamGoals.map(goal => (
                                <TeamGoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} onDelete={deleteTeamGoal} />
                             )) : <p className="text-muted-foreground text-center py-4">No team goals set yet.</p>}
                        </div>
                    </div>
                    
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-accent mb-4">Players to Watch</h3>
                        <div className="space-y-3">
                            {inactivePlayers.map(player => (
                                <div key={player.id} className="flex items-center">
                                     <Avatar name={player.name} className="w-10 h-10 mr-3" />
                                     <div>
                                        <p className="font-semibold text-foreground">{player.name}</p>
                                        <p className="text-xs text-muted-foreground">No sessions in last 7 days</p>
                                     </div>
                                </div>
                            ))}
                             {inactivePlayers.length === 0 && <p className="text-muted-foreground text-center py-4">Great! All players are active.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Set a New Team Goal">
                <TeamGoalForm onSave={handleCreateTeamGoal} />
            </Modal>
        </div>
    );
};

const PlayerList: React.FC<{ 
    players: Player[], 
    sessionsByPlayer: Record<string, Session[]>, 
    onPlayerClick: (player: Player) => void,
    selectedGradYear: number | null,
    setSelectedGradYear: (year: number | null) => void 
}> = ({ players, sessionsByPlayer, onPlayerClick, selectedGradYear, setSelectedGradYear }) => {
    
    const gradYears = useMemo(() => {
        const years = new Set<number>(players.map(p => p.profile.gradYear));
        return Array.from(years).sort((a,b) => a - b);
    }, [players]);

    const sortedPlayers = useMemo(() => {
        const filtered = selectedGradYear
            ? players.filter(p => p.profile.gradYear === selectedGradYear)
            : players;

        return [...filtered].sort((a, b) => {
            const sessionsA = sessionsByPlayer[a.id]?.length || 0;
            const sessionsB = sessionsByPlayer[b.id]?.length || 0;
            return sessionsB - sessionsA; // Sort by most active
        });
    }, [players, sessionsByPlayer, selectedGradYear]);
    
    return (
    <div>
        <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-muted rounded-lg">
            <span className="text-sm font-semibold text-muted-foreground mr-2">Grad Year:</span>
            <button 
                onClick={() => setSelectedGradYear(null)} 
                className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${!selectedGradYear ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-border'}`}
            >
                All
            </button>
            {gradYears.map(year => (
                <button 
                    key={year} 
                    onClick={() => setSelectedGradYear(year)} 
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${selectedGradYear === year ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-border'}`}
                >
                    {year}
                </button>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedPlayers.map(player => {
                const playerSessions = sessionsByPlayer[player.id] || [];
                const avgExec = playerSessions.length > 0
                    ? Math.round(playerSessions.reduce((acc, s) => acc + calculateExecutionPercentage(s.sets), 0) / playerSessions.length)
                    : 0;
                const hardHit = playerSessions.length > 0
                    ? Math.round(playerSessions.reduce((acc, s) => acc + calculateHardHitPercentage(s.sets), 0) / playerSessions.length)
                    : 0;

                return (
                    <div key={player.id} onClick={() => onPlayerClick(player)} className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-3 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg">
                        <div className="flex items-center gap-4">
                            <Avatar name={player.name} className="w-12 h-12 text-lg" />
                            <div>
                                <h3 className="font-bold text-lg text-foreground">{player.name}</h3>
                                <p className="text-sm text-muted-foreground">Sessions: {playerSessions.length}</p>
                            </div>
                        </div>
                         <div className="flex justify-around text-center pt-2 border-t border-border">
                            <div>
                                <p className="text-xs text-muted-foreground">Exec %</p>
                                <p className="font-bold text-lg text-primary">{avgExec}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Hard Hit %</p>
                                <p className="font-bold text-lg text-accent">{hardHit}%</p>
                            </div>
                         </div>
                         {playerSessions.length === 0 && <p className="text-center text-sm text-muted-foreground pt-2">No sessions yet — encourage your player to log one!</p>}
                    </div>
                );
            })}
        </div>
    </div>
    )
};

const GoalProgress: React.FC<{ goal: PersonalGoal; sessions: Session[]; drills: Drill[] }> = ({ goal, sessions, drills }) => {
    const currentValue = getCurrentMetricValue(goal, sessions, drills);
    
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

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <h4 className="font-semibold text-sm text-card-foreground">{formatGoalName(goal)}</h4>
                <p className="text-sm font-bold text-primary">{currentValue}{isPercentage ? '%' : ''} / <span className="text-muted-foreground">{goal.targetValue}{isPercentage ? '%' : ''}</span></p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
            <p className="text-xs text-right text-muted-foreground">Target Date: {formatDate(goal.targetDate)}</p>
        </div>
    );
};

const PlayerDetail: React.FC<{ player: Player; sessions: Session[]; drills: Drill[]; goals: PersonalGoal[]; onBack: () => void; }> = ({ player, sessions, drills, goals, onBack }) => {
    return (
        <div>
            <button onClick={onBack} className="mb-6 text-sm text-primary hover:underline font-semibold">
                &larr; Back to Player List
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <Avatar name={player.name} className="w-16 h-16 text-2xl mr-4" />
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{player.name}</h1>
                                <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                                    <span>Grad: {player.profile.gradYear}</span>
                                    <span>Bats: {player.profile.bats}</span>
                                    <span>Throws: {player.profile.throws}</span>
                                    {player.profile.position && <span>Pos: {player.profile.position}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <PlayerRadarChart sessions={sessions} playerName={player.name} />
                     {goals.length > 0 && (
                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-primary mb-4">Player Goals</h3>
                            <div className="space-y-4">
                                {goals.map(goal => <GoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} />)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-foreground mb-4">Session History</h2>
                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
                        <ul className="divide-y divide-border">
                            {sessions.length > 0 ? sessions.slice().reverse().map(session => {
                                const drill = drills.find(d => d.id === session.drillId);
                                const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: true };
                                const goalType = drill ? drill.goalType : "Exec %";

                                return (
                                    <li key={session.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-primary">{session.name}</p>
                                            <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                                        </div>
                                        <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                            {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                        </div>
                                    </li>
                                );
                            }) : (
                                <p className="text-center text-muted-foreground p-6">This player has not completed any sessions yet.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TeamGoalForm: React.FC<{ onSave: (data: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'>) => void; }> = ({ onSave }) => {
    const [description, setDescription] = useState('');
    const [metric, setMetric] = useState<GoalType>('Execution %');
    const [targetValue, setTargetValue] = useState(75);
    const [targetDate, setTargetDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]); // 30 days from now
    const [drillType, setDrillType] = useState<DrillType | undefined>(undefined);
    const [targetZones, setTargetZones] = useState<TargetZone[]>([]);
    const [pitchTypes, setPitchTypes] = useState<PitchType[]>([]);

    const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<any[]>>, value: any) => {
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const goalData: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'> = {
            description, metric, targetValue, targetDate
        };
        if (drillType) goalData.drillType = drillType;
        if (targetZones.length > 0) goalData.targetZones = targetZones;
        if (pitchTypes.length > 0) goalData.pitchTypes = pitchTypes;
        onSave(goalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Goal Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g., Master Outside Pitches" className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-muted-foreground">Metric</label>
                    <select value={metric} onChange={e => setMetric(e.target.value as GoalType)} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        {GOAL_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Target Value</label>
                    <input type="number" value={targetValue} onChange={e => setTargetValue(parseInt(e.target.value))} required className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-muted-foreground">Target Date</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>

            <div>
                <h4 className="text-md font-semibold text-muted-foreground border-b border-border pb-2 mb-3">Goal Specificity (Optional)</h4>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Drill Type</label>
                        <select value={drillType || ''} onChange={e => setDrillType(e.target.value as DrillType || undefined)} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                            <option value="">Any Drill Type</option>
                            {DRILL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Target Zones</label>
                            <div className="grid grid-cols-3 gap-2">
                                {TARGET_ZONES.map(zone => (
                                    <button type="button" key={zone} onClick={() => handleMultiSelect(setTargetZones, zone)} className={`p-2 text-xs rounded-md ${targetZones.includes(zone) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{zone}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Pitch Types</label>
                            <div className="grid grid-cols-3 gap-2">
                                {PITCH_TYPES.map(type => (
                                    <button type="button" key={type} onClick={() => handleMultiSelect(setPitchTypes, type)} className={`p-2 text-xs rounded-md ${pitchTypes.includes(type) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{type}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">Save Goal</button>
            </div>
        </form>
    );
};

const DrillForm: React.FC<{
    onSave: (drill: Omit<Drill, 'id' | 'teamId'>) => void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [drill, setDrill] = useState<Omit<Drill, 'id' | 'teamId'>>({
        name: '', description: '', targetZones: [], pitchTypes: [], drillType: 'Tee Work',
        countSituation: 'Even', baseRunners: [], outs: 0,
        goalType: 'Execution %', goalTargetValue: 80, repsPerSet: 10, sets: 3
    });

    const handleMultiSelect = (field: 'targetZones' | 'pitchTypes' | 'baseRunners', value: TargetZone | PitchType | BaseRunner) => {
        setDrill(prev => {
            const currentList = prev[field] as string[];
            const newList = currentList.includes(value) ? currentList.filter(v => v !== value) : [...currentList, value];
            return {
                ...prev,
                [field]: newList,
            };
        });
    };
    
    const handleChange = (field: keyof Omit<Drill, 'id' | 'teamId' | 'targetZones' | 'pitchTypes' | 'baseRunners'>, value: any) => {
        setDrill(prev => ({...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(drill);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Drill Name</label>
                    <input type="text" value={drill.name} onChange={e => handleChange('name', e.target.value)} required className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-muted-foreground">Drill Type</label>
                    <select value={drill.drillType} onChange={e => handleChange('drillType', e.target.value as DrillType)} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        {DRILL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Description</label>
                <textarea value={drill.description} onChange={e => handleChange('description', e.target.value)} required rows={2} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Target Zones (Optional)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {TARGET_ZONES.map(zone => (
                            <button type="button" key={zone} onClick={() => handleMultiSelect('targetZones', zone)} className={`p-2 text-xs rounded-md ${drill.targetZones.includes(zone) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{zone}</button>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Pitch Types (Optional)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {PITCH_TYPES.map(type => (
                            <button type="button" key={type} onClick={() => handleMultiSelect('pitchTypes', type)} className={`p-2 text-xs rounded-md ${drill.pitchTypes.includes(type) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{type}</button>
                        ))}
                    </div>
                </div>
            </div>

             <div>
                <h4 className="text-md font-semibold text-muted-foreground border-b border-border pb-2 mb-3">Game Situation Defaults</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground mb-2">Outs</label>
                         <div className="flex gap-2">
                             {OUTS_OPTIONS.map(out => <button type="button" key={out} onClick={() => handleChange('outs', out)} className={`flex-1 p-2 text-sm rounded-md ${drill.outs === out ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{out}</button>)}
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Count</label>
                        <select value={drill.countSituation} onChange={(e) => handleChange('countSituation', e.target.value)} className="w-full bg-background border-input rounded-md py-2 px-3 text-sm">
                            {COUNT_SITUATIONS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Base Runners</label>
                        <div className="flex gap-2">
                            {BASE_RUNNERS.map(runner => <button type="button" key={runner} onClick={() => handleMultiSelect('baseRunners', runner)} className={`flex-1 p-2 text-sm rounded-md ${drill.baseRunners.includes(runner) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{runner}</button>)}
                        </div>
                    </div>
                </div>
             </div>

            <div>
                <h4 className="text-md font-semibold text-muted-foreground border-b border-border pb-2 mb-3">Goal & Volume Defaults</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground">Goal Type</label>
                         <select value={drill.goalType} onChange={e => handleChange('goalType', e.target.value as GoalType)} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm">
                            {GOAL_TYPES.map(g => <option key={g}>{g}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground">Target Value</label>
                         <input type="number" value={drill.goalTargetValue} onChange={e => handleChange('goalTargetValue', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground">Sets</label>
                         <input type="number" value={drill.sets} onChange={e => handleChange('sets', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground">Reps/Set</label>
                         <input type="number" value={drill.repsPerSet} onChange={e => handleChange('repsPerSet', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"/>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-muted hover:bg-muted/80 rounded-md">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">Save Drill</button>
            </div>
        </form>
    );
};

const AssignDrillModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drill: Drill;
    players: Player[];
    onAssign: (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => void;
}> = ({ isOpen, onClose, drill, players, onAssign }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [recurringDays, setRecurringDays] = useState<DayOfWeek[]>([]);
    const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handlePlayerSelect = (playerId: string) => {
        setSelectedPlayerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
    };
    
    const handleSelectAll = () => {
        if (selectedPlayerIds.length === players.length) {
            setSelectedPlayerIds([]);
        } else {
            setSelectedPlayerIds(players.map(p => p.id));
        }
    };

    const toggleDay = (day: DayOfWeek) => {
        setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleSubmit = () => {
        if (selectedPlayerIds.length === 0 || recurringDays.length === 0) {
            alert("Please select at least one player and one day.");
            return;
        }
        onAssign({
            playerIds: selectedPlayerIds,
            isRecurring: true,
            recurringDays: recurringDays,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign Drill: ${drill.name}`}>
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-foreground mb-2">Assign to Players</h3>
                    <div className="flex items-center mb-2">
                        <input type="checkbox" id="select-all" checked={selectedPlayerIds.length === players.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                        <label htmlFor="select-all" className="ml-2 block text-sm text-muted-foreground">Select All Players</label>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-border p-2">
                        {players.map(p => (
                            <div key={p.id} className="flex items-center">
                                <input type="checkbox" id={`p-${p.id}`} checked={selectedPlayerIds.includes(p.id)} onChange={() => handlePlayerSelect(p.id)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary"/>
                                <label htmlFor={`p-${p.id}`} className="ml-2 block text-sm text-muted-foreground">{p.name}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-foreground mb-2">Set Recurring Schedule</h3>
                    <div className="flex justify-center gap-1 sm:gap-2">
                        {days.map(day => (
                            <button key={day} onClick={() => toggleDay(day)} className={`w-10 h-10 rounded-full font-semibold text-sm transition-colors ${recurringDays.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                                {day.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-muted hover:bg-muted/80 rounded-md">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">Assign Drill</button>
                </div>
            </div>
        </Modal>
    );
};

const DrillList: React.FC<{ 
    drills: Drill[], 
    players: Player[],
    createDrill: (drill: Omit<Drill, 'id' | 'teamId'>) => void,
    assignDrill: (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => void
}> = ({ drills, players, createDrill, assignDrill }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [drillToAssign, setDrillToAssign] = useState<Drill | null>(null);

    const handleAssign = (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        if (!drillToAssign) return;
        assignDrill({ drillId: drillToAssign.id, ...assignment });
    };

    return (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drills.map((drill) => (
              <div
                key={drill.id}
                className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col"
              >
                <div className="flex-grow space-y-2">
                  <h3 className="text-lg font-bold text-primary">{drill.name}</h3>
                  <p className="text-sm text-muted-foreground flex-grow">
                    {drill.description}
                  </p>
                </div>
      
                <div className="text-xs text-card-foreground pt-2 mt-2 border-t border-border">
                  <p>
                    <strong>Goal:</strong>{" "}
                    {String(drill.goalType)}{" "}
                    {"\u2265"}{" "}
                    {drill.goalTargetValue}
                    {String(drill.goalType).includes("%") ? "%" : ""}
                  </p>
                  <p>
                    <strong>Volume:</strong> {drill.sets} sets of {drill.repsPerSet} reps
                  </p>
                </div>
      
                <button
                  onClick={() => setDrillToAssign(drill)}
                  className="w-full mt-4 bg-secondary/20 hover:bg-secondary/30 text-secondary font-bold py-2 px-4 rounded-lg text-sm"
                >
                  Assign Drill
                </button>
              </div>
            ))}
      
            {drills.length === 0 && (
              <p className="text-muted-foreground md:col-span-3 text-center py-4">
                No drills created yet.
              </p>
            )}
          </div>
      
          <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Create New Drill"
          >
            <DrillForm onSave={createDrill} onClose={() => setIsCreateModalOpen(false)} />
          </Modal>
      
          {drillToAssign && (
            <AssignDrillModal
              isOpen={!!drillToAssign}
              onClose={() => setDrillToAssign(null)}
              drill={drillToAssign}
              players={players}
              onAssign={handleAssign}
            />
          )}
        </div>
      );
      
}

const CreateTeamForm: React.FC<{ onSave: (teamName: string, seasonYear: number) => void }> = ({ onSave }) => {
    const [teamName, setTeamName] = useState('');
    const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(teamName, seasonYear);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Team Name</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required className="mt-1 block w-full bg-background border-input rounded-md py-2 px-3"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Season Year</label>
                <input type="number" value={seasonYear} onChange={e => setSeasonYear(parseInt(e.target.value))} required className="mt-1 block w-full bg-background border-input rounded-md py-2 px-3"/>
            </div>
            <div className="flex justify-end pt-2">
                <button type="submit" className="py-2 px-4 bg-primary text-primary-foreground rounded-md">Create Team</button>
            </div>
        </form>
    )
}

const InvitePlayersModal: React.FC<{ isOpen: boolean; onClose: () => void; teamCode: string | null; }> = ({ isOpen, onClose, teamCode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (teamCode) {
            navigator.clipboard.writeText(teamCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite Players to Your Team">
            <div className="text-center">
                <p className="text-muted-foreground mb-4">Share this code with your players to have them join your team.</p>
                <div className="bg-muted p-4 rounded-lg flex items-center justify-center gap-4">
                    <p className="text-3xl font-mono tracking-widest text-secondary">{teamCode || '...'}</p>
                    <button onClick={handleCopy} className="py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold">
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <button onClick={onClose} className="mt-6 w-full py-2 px-4 bg-muted hover:bg-muted/80 rounded-md">Done</button>
            </div>
        </Modal>
    );
};


export const CoachView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const { currentUser, getTeamsForCoach, getPlayersInTeam, getDrillsForTeam, getSessionsForTeam, createDrill, createAssignment, getGoalsForPlayer, createTeam, getJoinCodeForTeam, getTeamGoals, activeTeam, setActiveTeamId } = useContext(DataContext)!;
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedGradYear, setSelectedGradYear] = useState<number | null>(null);
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateDrillModalOpen, setIsCreateDrillModalOpen] = useState(false);
    const [activeTeamCode, setActiveTeamCode] = useState<string | null>(null);
    
    const coachTeams = useMemo(() => getTeamsForCoach(currentUser!.id), [currentUser, getTeamsForCoach]);
    
    useEffect(() => {
        if (!activeTeam && coachTeams.length > 0) {
            setActiveTeamId(coachTeams[0].id);
        }
    }, [coachTeams, activeTeam, setActiveTeamId]);

    const players = useMemo(() => activeTeam ? getPlayersInTeam(activeTeam.id) : [], [activeTeam, getPlayersInTeam]);
    const drills = useMemo(() => activeTeam ? getDrillsForTeam(activeTeam.id) : [], [activeTeam, getDrillsForTeam]);
    const sessions = useMemo(() => activeTeam ? getSessionsForTeam(activeTeam.id) : [], [activeTeam, getSessionsForTeam]);
    const teamGoals = useMemo(() => activeTeam ? getTeamGoals(activeTeam.id) : [], [activeTeam, getTeamGoals]);

    const sessionsByPlayer = useMemo(() => {
        return sessions.reduce((acc, session) => {
            if (!acc[session.playerId]) {
                acc[session.playerId] = [];
            }
            acc[session.playerId].push(session);
            return acc;
        }, {} as Record<string, Session[]>);
    }, [sessions]);


    const handleCreateDrill = (drillData: Omit<Drill, 'id' | 'teamId'>) => {
        if (!activeTeam) return;
        createDrill(drillData, activeTeam.id);
        setIsCreateDrillModalOpen(false);
    };

    const handleAssignDrill = (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        if (!activeTeam) return;
        createAssignment({ teamId: activeTeam.id, ...assignment });
    };

    const handleCreateTeam = async (teamName: string, seasonYear: number) => {
        const newTeamId = await createTeam({ name: teamName, seasonYear }, currentUser!.id);
        if (newTeamId) {
            setActiveTeamId(newTeamId);
        }
        setIsCreateTeamModalOpen(false);
    }

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayer(player);
    };
    
    const handleBackToPlayerList = () => {
        setSelectedPlayer(null);
    }

    const handleInviteClick = async () => {
        if (!activeTeam) return;
        const code = await getJoinCodeForTeam(activeTeam.id);
        setActiveTeamCode(code);
        setIsInviteModalOpen(true);
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Players', icon: <UsersIcon />, view: 'players' },
        { name: 'Drills', icon: <ClipboardListIcon />, view: 'drills' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
    ];
    
    const pageTitles: { [key: string]: string } = {
        dashboard: `Team Overview: ${activeTeam?.name || ''}`,
        players: 'Players',
        drills: 'Drill Library',
        analytics: 'Team Analytics'
    };

    React.useEffect(() => {
        if(currentView !== 'players') {
            setSelectedPlayer(null);
        }
    }, [currentView]);

    const performanceOverTimeData = useMemo(() => {
      const chronoSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
       return chronoSessions.map(s => ({
            name: formatDate(s.date, { month: 'short', day: 'numeric' }),
            'Execution %': calculateExecutionPercentage(s.sets),
            'Hard Hit %': calculateHardHitPercentage(s.sets),
        }));
    }, [sessions]);
    
    const drillSuccessData = useMemo(() => {
       const drillSuccessMap = new Map<string, { success: number, total: number }>();
        sessions.forEach(session => {
            const drill = drills.find(d => d.id === session.drillId);
            if (drill) {
                const { isSuccess } = getSessionGoalProgress(session, drill);
                const entry = drillSuccessMap.get(drill.name) || { success: 0, total: 0 };
                entry.total++;
                if (isSuccess) entry.success++;
                drillSuccessMap.set(drill.name, entry);
            }
        });
        return Array.from(drillSuccessMap.entries()).map(([name, data]) => ({
            name,
            'Success Rate': data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
        }));
    }, [sessions, drills]);

    const teamAnalyticsData = useMemo((): CoachAnalyticsData | null => {
        if (sessions.length === 0 || players.length === 0) return null;

        const getTopPlayersForFilter = (
            filter: (set: SetResult, session: Session, drill?: Drill) => boolean,
            metric: 'execution' | 'hardHit' | 'contact'
        ): TopPlayer[] => {
            const playerStats: { [playerId: string]: { repsExecuted: number; repsAttempted: number; hardHits: number; strikeouts: number } } = {};

            sessions.forEach(session => {
                const drill = session.drillId ? drills.find(d => d.id === session.drillId) : undefined;
                session.sets.forEach(set => {
                    if (filter(set, session, drill)) {
                        if (!playerStats[session.playerId]) {
                            playerStats[session.playerId] = { repsExecuted: 0, repsAttempted: 0, hardHits: 0, strikeouts: 0 };
                        }
                        const stats = playerStats[session.playerId];
                        stats.repsExecuted += set.repsExecuted;
                        stats.repsAttempted += set.repsAttempted;
                        stats.hardHits += set.hardHits;
                        stats.strikeouts += set.strikeouts;
                    }
                });
            });
            
            return Object.entries(playerStats)
                .map(([playerId, stats]) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player || stats.repsAttempted < 10) return null;

                    let value = 0;
                    switch (metric) {
                        case 'execution': value = calculateExecutionPercentage([{...stats, setNumber: 1}]); break;
                        case 'hardHit': value = calculateHardHitPercentage([{...stats, setNumber: 1}]); break;
                        case 'contact': value = 100 - calculateStrikeoutPercentage([{...stats, setNumber: 1}]); break;
                    }

                    return { name: player.name, value: Math.round(value), reps: stats.repsAttempted };
                })
                .filter((p): p is TopPlayer => p !== null)
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
        };
        
        const drillStats: { [drillId: string]: { name: string; sets: SetResult[] } } = {};
        sessions.forEach(session => {
            if (session.drillId) {
                const drill = drills.find(d => d.id === session.drillId);
                if (drill) {
                    if (!drillStats[drill.id]) drillStats[drill.id] = { name: drill.name, sets: [] };
                    drillStats[drill.id].sets.push(...session.sets);
                }
            }
        });

        const drillPerformance = Object.values(drillStats).map(data => ({
            name: data.name,
            execution: calculateExecutionPercentage(data.sets),
            hardHit: calculateHardHitPercentage(data.sets),
            contact: 100 - calculateStrikeoutPercentage(data.sets),
        })).filter(d => d.execution > 0 || d.hardHit > 0);

        const drillEffectiveness = {
            execution: [...drillPerformance].sort((a,b) => b.execution - a.execution).slice(0, 5).map(d => ({ name: d.name, value: d.execution, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'execution') })),
            hardHit: [...drillPerformance].sort((a,b) => b.hardHit - a.hardHit).slice(0, 5).map(d => ({ name: d.name, value: d.hardHit, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'hardHit') })),
            contact: [...drillPerformance].sort((a,b) => b.contact - a.contact).slice(0, 5).map(d => ({ name: d.name, value: d.contact, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'contact') })),
        };

        const byDrillType: { [key in DrillType]?: { executed: number, attempted: number } } = {};
        const byPitchType: { [key in PitchType]?: { executed: number, attempted: number } } = {};
        const byCount: { [key in CountSituation]: { executed: number, attempted: number } } = { 'Ahead': { executed: 0, attempted: 0 }, 'Even': { executed: 0, attempted: 0 }, 'Behind': { executed: 0, attempted: 0 } };
        const byZone: { [key in TargetZone]?: { executed: number, attempted: number } } = {};

        sessions.forEach(session => {
            const player = players.find(p => p.id === session.playerId);
            const isLefty = player?.profile.bats === 'L';

            let drillType: DrillType | undefined;
            if (session.drillId) {
                drillType = drills.find(d => d.id === session.drillId)?.drillType;
            } else if (DRILL_TYPES.includes(session.name as DrillType)) {
                drillType = session.name as DrillType;
            }

            session.sets.forEach(set => {
                if (drillType) {
                    if (!byDrillType[drillType]) byDrillType[drillType] = { executed: 0, attempted: 0 };
                    byDrillType[drillType]!.executed += set.repsExecuted;
                    byDrillType[drillType]!.attempted += set.repsAttempted;
                }
                const situation = set.countSituation || 'Even';
                byCount[situation].executed += set.repsExecuted;
                byCount[situation].attempted += set.repsAttempted;

                if (set.pitchTypes && set.pitchTypes.length > 0) {
                    set.pitchTypes.forEach(pitch => {
                        if (!byPitchType[pitch]) byPitchType[pitch] = { executed: 0, attempted: 0 };
                        byPitchType[pitch]!.executed += set.repsExecuted / set.pitchTypes!.length;
                        byPitchType[pitch]!.attempted += set.repsAttempted / set.pitchTypes!.length;
                    });
                }
                if (set.targetZones && set.targetZones.length > 0) {
                     set.targetZones.forEach(originalZone => {
                        let normalizedZone = originalZone;
                        if (isLefty) {
                            if (originalZone.startsWith('Inside')) normalizedZone = originalZone.replace('Inside', 'Outside') as TargetZone;
                            else if (originalZone.startsWith('Outside')) normalizedZone = originalZone.replace('Outside', 'Inside') as TargetZone;
                        }
                        if (!byZone[normalizedZone]) byZone[normalizedZone] = { executed: 0, attempted: 0 };
                        byZone[normalizedZone]!.executed += set.repsExecuted / set.targetZones!.length;
                        byZone[normalizedZone]!.attempted += set.repsAttempted / set.targetZones!.length;
                    });
                }
            });
        });
        
        const calculateBreakdownData = (data: { [key: string]: { executed: number, attempted: number } | undefined }, filterFn: (set: SetResult, session: Session, drill?: Drill) => boolean) => {
            return Object.entries(data)
                .map(([name, values]) => ({
                    name,
                    reps: Math.round(values!.attempted),
                    execution: values!.attempted > 0 ? Math.round((values!.executed / values!.attempted) * 100) : 0,
                    topPlayers: getTopPlayersForFilter((set, session, drill) => filterFn(set, session, drill), 'execution'),
                }))
                .filter(item => item.reps > 0)
                .sort((a, b) => b.reps - a.reps);
        };
        
        const teamBreakdowns = {
            byDrillType: calculateBreakdownData(byDrillType, (s, sess, d) => d?.drillType === (s as any).name || DRILL_TYPES.includes(sess.name as DrillType) && sess.name === (s as any).name),
            byPitchType: calculateBreakdownData(byPitchType, (s) => s.pitchTypes?.includes((s as any).name) ?? false),
            byCount: calculateBreakdownData(byCount, (s) => (s.countSituation || 'Even') === (s as any).name),
            byZone: calculateBreakdownData(byZone, (s) => s.targetZones?.includes((s as any).name) ?? false).map(d => ({...d, zone: d.name as TargetZone})),
        };
        
        return { performanceOverTimeData, drillSuccessData, drillEffectiveness, teamBreakdowns };
    }, [sessions, drills, players, performanceOverTimeData, drillSuccessData]);
    
    if (coachTeams.length === 0 || !activeTeam) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-3xl font-bold text-foreground mb-2">Welcome, Coach!</h1>
                <p className="text-muted-foreground mb-6">Let's get your first team set up.</p>
                <button onClick={() => setIsCreateTeamModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg text-lg">
                    + Create Your First Team
                </button>
                <Modal isOpen={isCreateTeamModalOpen} onClose={() => setIsCreateTeamModalOpen(false)} title="Create New Team">
                    <CreateTeamForm onSave={handleCreateTeam} />
                </Modal>
            </div>
        );
    }

    const headerContent = {
        dashboard: <button onClick={handleInviteClick} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm">Invite Players</button>,
        drills: <button onClick={() => setIsCreateDrillModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm">+ Create Drill</button>
    }[currentView];

    return (
        <Dashboard 
            navItems={navItems} 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            pageTitle={pageTitles[currentView]}
            headerContent={headerContent}
            teams={coachTeams}
            activeTeamId={activeTeam.id}
            setActiveTeamId={setActiveTeamId}
        >
            {currentView === 'dashboard' && <CoachDashboard players={players} drills={drills} sessions={sessions} teamGoals={teamGoals} />}
            {currentView === 'players' && (
                 selectedPlayer ? (
                    <PlayerDetail 
                        player={selectedPlayer} 
                        sessions={sessionsByPlayer[selectedPlayer.id] || []}
                        drills={drills}
                        goals={getGoalsForPlayer(selectedPlayer.id)}
                        onBack={handleBackToPlayerList}
                    />
                ) : (
                    <PlayerList 
                        players={players} 
                        sessionsByPlayer={sessionsByPlayer} 
                        onPlayerClick={handlePlayerClick}
                        selectedGradYear={selectedGradYear}
                        setSelectedGradYear={setSelectedGradYear}
                    />
                )
            )}
            {currentView === 'drills' && <DrillList drills={drills} players={players} createDrill={handleCreateDrill} assignDrill={handleAssignDrill} />}
            {currentView === 'analytics' && (
                teamAnalyticsData ? (
                    <CoachAnalyticsPage analyticsData={teamAnalyticsData} />
                ) : (
                    <div>
                         <div className="bg-card border border-border p-6 rounded-lg shadow-sm text-center text-muted-foreground">
                             <p>Log more team sessions to unlock detailed analytics and insights.</p>
                         </div>
                    </div>
                )
            )}
            <InvitePlayersModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                teamCode={activeTeamCode} 
            />
            <Modal isOpen={isCreateDrillModalOpen} onClose={() => setIsCreateDrillModalOpen(false)} title="Create New Drill">
                <DrillForm onSave={handleCreateDrill} onClose={() => setIsCreateDrillModalOpen(false)} />
            </Modal>
        </Dashboard>
    );
};