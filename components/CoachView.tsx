import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { ProfileTab } from './ProfileTab';
import { ProfileIcon } from './icons/ProfileIcon';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Player, Team, Drill, Session, DayOfWeek, TargetZone, PitchType, CountSituation, BaseRunner, GoalType, DrillType, PersonalGoal, SetResult, TeamGoal } from '../types';
import { AnalyticsCharts } from './AnalyticsCharts';
import { Modal } from './Modal';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, GOAL_TYPES, DRILL_TYPES } from '../constants';
import { DRILL_TEMPLATES, DrillTemplate, TEAM_GOAL_TEMPLATES, TeamGoalTemplate } from '../constants/templates';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, getCurrentMetricValue, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName, resolveDrillTypeForSet } from '../utils/helpers';
import { Avatar } from './Avatar';
import { PlayerRadarChart } from './PlayerRadarChart';
import { TeamTrendChart } from './TeamTrendChart';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { Tooltip } from './Tooltip';
import { Spinner } from './Spinner';


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

type StatusMessage = { type: 'success' | 'error'; message: string };

type WorkloadPlayerSummary = {
    id: string;
    name: string;
    reps: number;
    executionPct: number;
    avgGrade: number | null;
};

type WorkloadDaySummary = {
    key: string;
    weekday: string;
    dateLabel: string;
    fullDateLabel: string;
    reps: number;
    players: WorkloadPlayerSummary[];
    date: Date;
};

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

const TeamGoalProgress: React.FC<{ goal: TeamGoal; sessions: Session[]; drills: Drill[]; onDelete: (goalId: string) => Promise<void>; }> = ({ goal, sessions, drills, onDelete }) => {
    const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);
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
    const displayValue = isPercentage ? `${Math.round(currentValue)}%` : Math.round(currentValue);
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;

    return (
        <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-card-foreground">{goal.description}</h4>
                    <p className="text-xs text-muted-foreground">{formatTeamGoalName(goal)} | Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    aria-label="Delete team goal"
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
        </div>
    );
};

const CoachDashboard: React.FC<{ 
    players: Player[], 
    drills: Drill[], 
    sessions: Session[], 
    teamGoals: TeamGoal[],
    onInviteClick: () => void;
}> = ({ players, drills, sessions, teamGoals, onInviteClick }) => {
    
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [inviteCodes, setInviteCodes] = useState<{ playerCode: string | null; coachCode: string | null }>({
        playerCode: null,
        coachCode: null,
    });
    const [isInviteCodeLoading, setIsInviteCodeLoading] = useState(false);
    const [copiedInviteTarget, setCopiedInviteTarget] = useState<'player' | 'coach' | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);
    const { createTeamGoal, deleteTeamGoal, activeTeam, getJoinCodesForTeam } = useContext(DataContext)!;
    const [teamGoalFormError, setTeamGoalFormError] = useState<string | null>(null);
    const [teamGoalListError, setTeamGoalListError] = useState<string | null>(null);
    const [isSavingTeamGoal, setIsSavingTeamGoal] = useState(false);
    const [trendRange, setTrendRange] = useState<'7d' | '30d'>('7d');
    const [selectedWorkloadDayKey, setSelectedWorkloadDayKey] = useState<string | null>(null);
    
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

    const teamPerformanceTrendByRange = useMemo(() => {
        const DAY_MS = 86400000;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formatKey = (date: Date) => {
            const year = date.getFullYear();
            const month = `${date.getMonth() + 1}`.padStart(2, '0');
            const day = `${date.getDate()}`.padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const buildTrendData = (days: number) => {
            type TrendBucket = { key: string; label: string; executed: number; attempted: number };
            const buckets: TrendBucket[] = [];
            const bucketMap = new Map<string, TrendBucket>();

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const key = formatKey(date);
                const bucket: TrendBucket = {
                    key,
                    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    executed: 0,
                    attempted: 0,
                };
                buckets.push(bucket);
                bucketMap.set(key, bucket);
            }

            sessions.forEach(session => {
                const sessionDate = new Date(session.date);
                sessionDate.setHours(0, 0, 0, 0);
                const diffDays = (today.getTime() - sessionDate.getTime()) / DAY_MS;
                if (diffDays >= 0 && diffDays < days) {
                    const key = formatKey(sessionDate);
                    const bucket = bucketMap.get(key);
                    if (bucket) {
                        session.sets.forEach(set => {
                            bucket.executed += set.repsExecuted;
                            bucket.attempted += set.repsAttempted;
                        });
                    }
                }
            });

            return buckets
                .slice()
                .reverse()
                .map(bucket => ({
                    date: bucket.label,
                    'Execution %': bucket.attempted > 0 ? Math.round((bucket.executed / bucket.attempted) * 100) : 0,
                }));
        };

        return {
            '7d': buildTrendData(7),
            '30d': buildTrendData(30),
        };
    }, [sessions]);

    const currentTrendData = teamPerformanceTrendByRange[trendRange];
    const trendRangeLabels: Record<'7d' | '30d', string> = {
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
    };

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

    const topWorkers = useMemo(() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const repsByPlayer = new Map<string, number>();

        sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate > sevenDaysAgo) {
                const reps = session.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
                if (reps > 0) {
                    repsByPlayer.set(session.playerId, (repsByPlayer.get(session.playerId) || 0) + reps);
                }
            }
        });

        return Array.from(repsByPlayer.entries())
            .map(([playerId, reps]) => {
                const player = players.find(p => p.id === playerId);
                return player ? { player, reps } : null;
            })
            .filter((entry): entry is { player: Player; reps: number } => entry !== null)
            .sort((a, b) => b.reps - a.reps)
            .slice(0, 5);
    }, [sessions, players]);

    const workloadHeatmap = useMemo(() => {
        const DAY_WINDOW = 14;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysOfWeekOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const formatKey = (date: Date) => {
            const year = date.getFullYear();
            const month = `${date.getMonth() + 1}`.padStart(2, '0');
            const day = `${date.getDate()}`.padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        type PlayerAccumulator = {
            id: string;
            name: string;
            reps: number;
            executed: number;
            attempted: number;
            gradeTotal: number;
            gradeCount: number;
        };

        type DayAccumulator = {
            date: Date;
            reps: number;
            players: Map<string, PlayerAccumulator>;
        };

        const playerLookup = new Map(players.map(player => [player.id, player]));
        const dayStats = new Map<string, DayAccumulator>();

        sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            const diffDays = (today.getTime() - sessionDate.getTime()) / 86400000;
            if (diffDays < 0 || diffDays >= DAY_WINDOW) return;

            const key = formatKey(sessionDate);
            let bucket = dayStats.get(key);
            if (!bucket) {
                bucket = {
                    date: new Date(sessionDate),
                    reps: 0,
                    players: new Map(),
                };
                dayStats.set(key, bucket);
            }

            const sessionReps = session.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
            bucket.reps += sessionReps;

            let playerStats = bucket.players.get(session.playerId);
            if (!playerStats) {
                const player = playerLookup.get(session.playerId);
                playerStats = {
                    id: session.playerId,
                    name: player?.name || 'Unknown Player',
                    reps: 0,
                    executed: 0,
                    attempted: 0,
                    gradeTotal: 0,
                    gradeCount: 0,
                };
                bucket.players.set(session.playerId, playerStats);
            }

            session.sets.forEach(set => {
                playerStats!.reps += set.repsAttempted;
                playerStats!.executed += set.repsExecuted;
                playerStats!.attempted += set.repsAttempted;
                if (typeof set.grade === 'number') {
                    playerStats!.gradeTotal += set.grade;
                    playerStats!.gradeCount += 1;
                }
            });
        });

        const orderedDays: WorkloadDaySummary[] = [];

        for (let offset = DAY_WINDOW - 1; offset >= 0; offset--) {
            const date = new Date(today);
            date.setDate(today.getDate() - offset);
            date.setHours(0, 0, 0, 0);
            const key = formatKey(date);
            const stats = dayStats.get(key);

            const playersForDay: WorkloadPlayerSummary[] = stats
                ? Array.from(stats.players.values())
                      .map(playerStats => ({
                          id: playerStats.id,
                          name: playerStats.name,
                          reps: playerStats.reps,
                          executionPct: playerStats.attempted > 0 ? Math.round((playerStats.executed / playerStats.attempted) * 100) : 0,
                          avgGrade: playerStats.gradeCount > 0 ? playerStats.gradeTotal / playerStats.gradeCount : null,
                      }))
                      .sort((a, b) => b.reps - a.reps)
                : [];

            orderedDays.push({
                key,
                date: new Date(date),
                weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDateLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                reps: stats?.reps ?? 0,
                players: playersForDay,
            });
        }

        const maxReps = orderedDays.reduce((max, day) => Math.max(max, day.reps), 0);
        const grid: (WorkloadDaySummary | null)[][] = [
            Array.from({ length: 7 }, () => null),
            Array.from({ length: 7 }, () => null),
        ];

        orderedDays.forEach((day, index) => {
            const row = index < 7 ? 0 : 1;
            const col = daysOfWeekOrder.indexOf(day.weekday);
            if (col !== -1) {
                grid[row][col] = day;
            }
        });

        return {
            daysOfWeekOrder,
            grid,
            maxReps,
            orderedDays,
        };
    }, [sessions, players]);

    useEffect(() => {
        if (workloadHeatmap.orderedDays.length === 0) {
            if (selectedWorkloadDayKey !== null) {
                setSelectedWorkloadDayKey(null);
            }
            return;
        }
        const hasSelection =
            selectedWorkloadDayKey &&
            workloadHeatmap.orderedDays.some(day => day.key === selectedWorkloadDayKey);
        if (!hasSelection) {
            const fallback =
                [...workloadHeatmap.orderedDays].reverse().find(day => day.reps > 0) ??
                workloadHeatmap.orderedDays[workloadHeatmap.orderedDays.length - 1];
            if (fallback && fallback.key !== selectedWorkloadDayKey) {
                setSelectedWorkloadDayKey(fallback.key);
            }
        }
    }, [workloadHeatmap, selectedWorkloadDayKey]);

    const selectedWorkloadDay = workloadHeatmap.orderedDays.find(day => day.key === selectedWorkloadDayKey) || null;

    const weakSpotSummaries = useMemo(() => {
        const MIN_ATTEMPTS = 20;
        type WeakSpot = { key: string; label: string; executed: number; attempted: number };
        const summaryMap = new Map<string, WeakSpot>();

        const formatDrillLabel = (type: DrillType) => {
            if (/work$/i.test(type) || /bp$/i.test(type)) {
                return type;
            }
            return `${type} work`;
        };

        const upsert = (key: string, label: string, executed: number, attempted: number) => {
            if (!attempted) return;
            const existing = summaryMap.get(key);
            if (existing) {
                existing.executed += executed;
                existing.attempted += attempted;
            } else {
                summaryMap.set(key, { key, label, executed, attempted });
            }
        };

        sessions.forEach(session => {
            session.sets.forEach(set => {
                if (!set.repsAttempted) return;
                const executed = set.repsExecuted;
                const attempted = set.repsAttempted;

                if (set.targetZones && set.targetZones.length > 0) {
                    set.targetZones.forEach(zone => {
                        upsert(`zone-${zone}`, `${zone} zone`, executed, attempted);
                    });
                }

                const drillType = resolveDrillTypeForSet(session, set, drills);
                if (drillType) {
                    upsert(`drill-${drillType}`, formatDrillLabel(drillType), executed, attempted);
                }

                if (set.countSituation) {
                    const countLabel =
                        set.countSituation === 'Ahead'
                            ? 'Ahead in count'
                            : set.countSituation === 'Behind'
                                ? 'Behind in count'
                                : 'Even count';
                    upsert(`count-${set.countSituation}`, countLabel, executed, attempted);
                }
            });
        });

        return Array.from(summaryMap.values())
            .filter(item => item.attempted >= MIN_ATTEMPTS)
            .map(item => ({
                label: item.label,
                pct: item.attempted > 0 ? Math.round((item.executed / item.attempted) * 100) : 0,
            }))
            .sort((a, b) => a.pct - b.pct)
            .slice(0, 3);
    }, [sessions, drills]);
    
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
        setTeamGoalListError(null);
        try {
            await deleteTeamGoal(goalId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to delete this team goal. Please try again.';
            setTeamGoalListError(message);
        }
    };

    const handleCopyInviteCode = (code: string | null, target: 'player' | 'coach') => {
        if (!code) return;
        try {
            navigator.clipboard.writeText(code);
            setCopiedInviteTarget(target);
            if (copyTimeoutRef.current) {
                window.clearTimeout(copyTimeoutRef.current);
            }
            copyTimeoutRef.current = window.setTimeout(() => {
                setCopiedInviteTarget(null);
            }, 2000);
        } catch (err) {
            console.warn('Unable to copy invite code', err);
        }
    };

    useEffect(() => {
        let isCancelled = false;
        if (!activeTeam) {
            setInviteCodes({ playerCode: null, coachCode: null });
            setIsInviteCodeLoading(false);
            return;
        }
        setIsInviteCodeLoading(true);
        setCopiedInviteTarget(null);
        getJoinCodesForTeam(activeTeam.id)
            .then((codes) => {
                if (!isCancelled) {
                    setInviteCodes(codes ?? { playerCode: null, coachCode: null });
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setInviteCodes({ playerCode: null, coachCode: null });
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsInviteCodeLoading(false);
                }
            });
        return () => {
            isCancelled = true;
        };
    }, [activeTeam, getJoinCodesForTeam]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                window.clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const showInviteBanner = Boolean(activeTeam && players.length === 0);

    const InviteCodeCard: React.FC<{ label: string; code: string | null; target: 'player' | 'coach' }> = ({ label, code, target }) => (
        <div className="flex flex-col gap-2 rounded-lg bg-card border border-border px-4 py-3">
            <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
                {copiedInviteTarget === target && <span className="text-xs font-semibold text-success">Copied!</span>}
            </div>
            <span className="text-2xl font-mono tracking-[0.4em] text-foreground">
                {isInviteCodeLoading ? '••••••' : code || 'WAITING'}
            </span>
            <button
                onClick={() => handleCopyInviteCode(code, target)}
                disabled={!code}
                className="w-full rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
            >
                Copy {label}
            </button>
        </div>
    );

    const StatCard: React.FC<{title: string; value: string; subValue?: string}> = ({title, value, subValue}) => (
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm text-center">
            <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
            <p className="text-4xl font-bold text-foreground mt-1">{value} {subValue && <span className="text-xl text-muted-foreground">/ {subValue}</span>}</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {showInviteBanner && (
                <div className="bg-primary/5 border border-primary/30 rounded-lg p-4 space-y-4 text-foreground">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Team Ready</p>
                            <h3 className="text-xl font-semibold text-foreground">Share the invite codes with your staff</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Give players their code and share the coach code with anyone helping run the team.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <InviteCodeCard label="Player Code" code={inviteCodes.playerCode} target="player" />
                        <InviteCodeCard label="Coach Code" code={inviteCodes.coachCode} target="coach" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onInviteClick}
                            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm"
                        >
                            Invite Players
                        </button>
                        <p className="text-xs text-muted-foreground">
                            Need another team? Use the “+ New Team” button in the header to create one faster.
                        </p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active Players (7d)" value={activePlayersCountLast7Days.toString()} subValue={players.length.toString()} />
                <StatCard title="Total Reps (7d)" value={totalRepsLast7Days.toLocaleString()} />
                <StatCard title="Execution % (7d)" value={`${teamExecutionPctLast7Days}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <TeamTrendChart
                        data={currentTrendData}
                        title="Team Execution %"
                        subtitle={trendRangeLabels[trendRange]}
                        headerRight={
                            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-semibold">
                                {(['7d', '30d'] as const).map(rangeOption => (
                                    <button
                                        key={rangeOption}
                                        type="button"
                                        onClick={() => setTrendRange(rangeOption)}
                                        className={`px-3 py-1 transition-colors ${
                                            trendRange === rangeOption
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-background text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {rangeOption === '7d' ? 'Last 7D' : 'Last 30D'}
                                    </button>
                                ))}
                            </div>
                        }
                    />

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

                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <div className="flex flex-col gap-1 mb-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-primary">Team Workload (Last 14 Days)</h3>
                                <p className="text-xs text-muted-foreground">Tap a day to see who logged work.</p>
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Darker = more reps
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                                {workloadHeatmap.daysOfWeekOrder.map(day => (
                                    <span key={day}>{day}</span>
                                ))}
                            </div>
                            {workloadHeatmap.grid.map((week, weekIndex) => (
                                <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                                    {week.map((day, dayIndex) => {
                                        if (!day) {
                                            return (
                                                <div
                                                    key={`cell-${weekIndex}-${dayIndex}`}
                                                    className="aspect-square rounded-md border border-dashed border-border/60 bg-muted/40"
                                                    title="No data"
                                                />
                                            );
                                        }
                                        const intensity =
                                            workloadHeatmap.maxReps > 0 ? day.reps / workloadHeatmap.maxReps : 0;
                                        const backgroundColor =
                                            intensity === 0
                                                ? 'hsl(var(--muted))'
                                                : `rgba(var(--primary-rgb), ${(0.2 + intensity * 0.6).toFixed(2)})`;
                                        const textColor =
                                            intensity > 0.65 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))';
                                        const isSelected = selectedWorkloadDayKey === day.key;
                                        return (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => setSelectedWorkloadDayKey(day.key)}
                                                className={`aspect-square rounded-md flex items-center justify-center text-xs font-semibold transition-all focus:outline-none ${
                                                    isSelected
                                                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                                                        : 'hover:ring-2 hover:ring-primary/40'
                                                }`}
                                                style={{ backgroundColor, color: textColor }}
                                                title={`${day.fullDateLabel}: ${day.reps.toLocaleString()} reps`}
                                            >
                                                {day.date.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 border-t border-border pt-4">
                            {selectedWorkloadDay ? (
                                selectedWorkloadDay.reps > 0 ? (
                                    selectedWorkloadDay.players.length > 0 ? (
                                        <div>
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {selectedWorkloadDay.fullDateLabel}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Players who got work in
                                                    </p>
                                                </div>
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {selectedWorkloadDay.reps.toLocaleString()} total reps
                                                </span>
                                            </div>
                                            <ul className="mt-3 space-y-2">
                                                {selectedWorkloadDay.players.map(player => (
                                                    <li
                                                        key={player.id}
                                                        className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {player.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {player.reps.toLocaleString()} reps • {player.executionPct}%
                                                                exec • Grade{' '}
                                                                {player.avgGrade !== null
                                                                    ? player.avgGrade.toFixed(1)
                                                                    : '—'}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            Work logged on {selectedWorkloadDay.fullDateLabel}, but player details are unavailable.
                                        </p>
                                    )
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No sessions logged on {selectedWorkloadDay.fullDateLabel}.
                                    </p>
                                )
                            ) : (
                                <p className="text-sm text-muted-foreground">Select a calendar day to see player workload.</p>
                            )}
                        </div>
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
                        <h3 className="text-lg font-bold text-secondary mb-4">Top Workers (Last 7 Days)</h3>
                        {topWorkers.length > 0 ? (
                            <ol className="space-y-2 text-sm">
                                {topWorkers.map((entry, index) => (
                                    <li key={entry.player.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground font-semibold w-5 text-right">
                                                {index + 1}.
                                            </span>
                                            <span className="font-semibold text-foreground">{entry.player.name}</span>
                                        </div>
                                        <span className="font-bold text-secondary">{entry.reps.toLocaleString()} reps</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">Log more sessions to see top workers.</p>
                        )}
                    </div>

                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-primary">Active Team Goals</h3>
                            <button
                                onClick={() => {
                                    setTeamGoalFormError(null);
                                    setIsGoalModalOpen(true);
                                }}
                                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-1 px-3 text-sm rounded-lg"
                            >
                                + Set Goal
                            </button>
                        </div>
                        <div className="space-y-4">
                             {teamGoalListError && <p className="text-sm text-destructive">{teamGoalListError}</p>}
                             {teamGoals.length > 0 ? teamGoals.map(goal => (
                                <TeamGoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} onDelete={handleDeleteTeamGoal} />
                             )) : <p className="text-muted-foreground text-center py-4">No team goals set yet.</p>}
                        </div>
                    </div>
                    
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-destructive mb-3">Team Weak Spots</h3>
                        {weakSpotSummaries.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {weakSpotSummaries.map((spot, index) => (
                                    <li key={`${spot.label}-${index}`} className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-lg leading-none">•</span>
                                        <div className="flex-1 text-foreground">{spot.label}</div>
                                        <span className="font-semibold text-destructive">{spot.pct}%</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                Not enough data yet. Log more sessions to see weak spots.
                            </p>
                        )}
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
            <Modal
                isOpen={isGoalModalOpen}
                onClose={() => {
                    if (isSavingTeamGoal) return;
                    setTeamGoalFormError(null);
                    setIsGoalModalOpen(false);
                }}
                title="Set a New Team Goal"
            >
                <TeamGoalForm onSave={handleCreateTeamGoal} isSaving={isSavingTeamGoal} errorMessage={teamGoalFormError} />
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

const TeamGoalForm: React.FC<{ onSave: (data: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'>) => Promise<void> | void; isSaving?: boolean; errorMessage?: string | null; }> = ({ onSave, isSaving = false, errorMessage }) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const goalData: Omit<TeamGoal, 'id' | 'teamId' | 'status' | 'startDate'> = {
            description, metric, targetValue, targetDate
        };
        if (drillType) goalData.drillType = drillType;
        if (targetZones.length > 0) goalData.targetZones = targetZones;
        if (pitchTypes.length > 0) goalData.pitchTypes = pitchTypes;
        await onSave(goalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
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
                <button
                    type="submit"
                    disabled={isSaving}
                    className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
            </div>
        </form>
    );
};

const DrillForm: React.FC<{
    onSave: (drill: Omit<Drill, 'id' | 'teamId'>) => Promise<void> | void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [drill, setDrill] = useState<Omit<Drill, 'id' | 'teamId'>>({
        name: '', description: '', targetZones: [], pitchTypes: [], drillType: 'Tee Work',
        countSituation: 'Even', baseRunners: [], outs: 0,
        goalType: 'Execution %', goalTargetValue: 80, repsPerSet: 10, sets: 3
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSaving(true);
        try {
            await onSave(drill);
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this drill. Please try again.';
            setErrorMessage(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
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
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-60">
                    {isSaving ? 'Saving...' : 'Save Drill'}
                </button>
            </div>
        </form>
    );
};

const AssignDrillModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drill: Drill;
    players: Player[];
    onAssign: (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => Promise<void> | void;
}> = ({ isOpen, onClose, drill, players, onAssign }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [recurringDays, setRecurringDays] = useState<DayOfWeek[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const handleSubmit = async () => {
        if (selectedPlayerIds.length === 0 || recurringDays.length === 0) {
            setErrorMessage("Select at least one player and one day.");
            return;
        }
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await onAssign({
                playerIds: selectedPlayerIds,
                isRecurring: true,
                recurringDays: recurringDays,
            });
            setSelectedPlayerIds([]);
            setRecurringDays([]);
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to assign this drill. Please try again.';
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
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
                    {errorMessage && <p className="text-sm text-destructive mb-2">{errorMessage}</p>}
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
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-60">
                        {isSubmitting ? 'Assigning...' : 'Assign Drill'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const DrillList: React.FC<{ 
    drills: Drill[], 
    players: Player[],
    createDrill: (drill: Omit<Drill, 'id' | 'teamId'>) => Promise<void> | void,
    assignDrill: (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => Promise<void> | void
}> = ({ drills, players, createDrill, assignDrill }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [drillToAssign, setDrillToAssign] = useState<Drill | null>(null);

    const handleAssign = async (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        if (!drillToAssign) return;
        await assignDrill({ drillId: drillToAssign.id, ...assignment });
    };

    return (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Saved Drills</h2>
              <p className="text-sm text-muted-foreground">Create drills once and reuse them with targeted assignments.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              + New Drill
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drills.map((drill) => (
              <div
                key={drill.id}
                className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col gap-4"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-primary">{drill.name}</h3>
                  <p className="text-sm text-muted-foreground">
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
                  className="w-full mt-auto bg-secondary/15 hover:bg-secondary/25 text-secondary font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
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

const DrillTemplatesPanel: React.FC<{
    pendingTemplateId: string | null;
    onApply: (template: DrillTemplate) => Promise<void> | void;
    disabled?: boolean;
}> = ({ pendingTemplateId, onApply, disabled = false }) => (
    <div className="space-y-4">
        <div>
            <h2 className="text-xl font-bold text-foreground">Quick-Add Drill Templates</h2>
            <p className="text-sm text-muted-foreground">Drop proven plans straight into your saved drills.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {DRILL_TEMPLATES.map((template) => (
                <div key={template.templateId} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-primary">{template.name}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{template.focus}</p>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1">
                            {template.drillType}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">{template.description}</p>
                    <div className="text-xs text-card-foreground space-y-1">
                        <p><strong>Goal:</strong> {template.goalType} {template.goalType.includes('%') ? '\u2265' : ''} {template.goalTargetValue}{template.goalType.includes('%') ? '%' : ''}</p>
                        <p><strong>Volume:</strong> {template.sets} sets × {template.repsPerSet} reps</p>
                    </div>
                    <button
                        onClick={() => onApply(template)}
                        disabled={disabled || pendingTemplateId === template.templateId}
                        className="w-full mt-auto rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary font-semibold py-2 text-sm disabled:opacity-60"
                    >
                        {pendingTemplateId === template.templateId ? 'Adding…' : 'Add to Saved Drills'}
                    </button>
                </div>
            ))}
        </div>
    </div>
);

const formatTeamMetricValue = (metric: GoalType, value: number) => {
    if (metric === 'Total Reps') {
        return value.toLocaleString();
    }
    if (metric === 'No Strikeouts') {
        return `${value}`;
    }
    return `${Math.round(value)}%`;
};

const resolveTemplateTarget = (template: TeamGoalTemplate, currentValue: number): number => {
    if (template.bumpTargetBy === undefined) {
        return template.baseTarget;
    }
    if (template.metric === 'Total Reps') {
        return Math.max(template.baseTarget, Math.round(currentValue + template.bumpTargetBy));
    }
    if (template.metric === 'No Strikeouts') {
        return Math.max(0, Math.min(template.baseTarget, Math.round(Math.max(currentValue - template.bumpTargetBy, 0))));
    }
    return Math.min(100, Math.max(template.baseTarget, Math.round(currentValue + template.bumpTargetBy)));
};

const TeamGoalTemplatesPanel: React.FC<{
    sessions: Session[];
    drills: Drill[];
    pendingTemplateId: string | null;
    onApply: (template: TeamGoalTemplate, targetValue: number) => Promise<void> | void;
    disabled?: boolean;
}> = ({ sessions, drills, pendingTemplateId, onApply, disabled = false }) => (
    <div className="space-y-4">
        <div>
            <h2 className="text-xl font-bold text-foreground">Team Goal Templates</h2>
            <p className="text-sm text-muted-foreground">Leverage live data to set intentional team challenges.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {TEAM_GOAL_TEMPLATES.map((template) => {
                const previewGoal: TeamGoal = {
                    id: template.templateId,
                    teamId: 'preview',
                    description: template.headline,
                    metric: template.metric,
                    targetValue: template.baseTarget,
                    startDate: new Date().toISOString(),
                    targetDate: new Date(Date.now() + template.durationDays * 86400000).toISOString(),
                    status: 'Active',
                    ...(template.drillType ? { drillType: template.drillType } : {}),
                    ...(template.pitchTypes ? { pitchTypes: template.pitchTypes } : {}),
                    ...(template.targetZones ? { targetZones: template.targetZones } : {}),
                };
                const currentValue = Math.round(getCurrentTeamMetricValue(previewGoal, sessions, drills));
                const recommendedTarget = resolveTemplateTarget(template, currentValue);
                return (
                    <div key={template.templateId} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-primary">{template.headline}</h3>
                                <p className="text-xs text-muted-foreground">{template.description}</p>
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1">
                                {template.metric}
                            </span>
                        </div>
                        <div className="text-xs text-card-foreground space-y-1">
                            <p><strong>Current:</strong> {formatTeamMetricValue(template.metric, currentValue)}</p>
                            <p><strong>Target:</strong> {formatTeamMetricValue(template.metric, recommendedTarget)}</p>
                            <p><strong>Timeline:</strong> {template.durationDays} days</p>
                        </div>
                        <button
                            onClick={() => onApply(template, recommendedTarget)}
                            disabled={disabled || pendingTemplateId === template.templateId}
                            className="w-full mt-auto rounded-lg bg-primary text-primary-foreground font-semibold py-2 text-sm hover:bg-primary/90 disabled:opacity-60"
                        >
                            {pendingTemplateId === template.templateId ? 'Adding…' : 'Quick Add Goal'}
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
);

const TeamGoalsOverview: React.FC<{
    teamGoals: TeamGoal[];
    sessions: Session[];
    drills: Drill[];
    onDelete: (goalId: string) => Promise<void>;
}> = ({ teamGoals, sessions, drills, onDelete }) => (
    <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
            <div>
                <h2 className="text-xl font-bold text-foreground">Active Team Goals</h2>
                <p className="text-sm text-muted-foreground">Track progress and clear goals when they’re complete.</p>
            </div>
            <Tooltip content="Goal cards update whenever players log sets that match the metric, so you always know which drill plans are working.">
                <span
                    tabIndex={0}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label="How goal progress updates"
                >
                    <InfoIcon className="w-4 h-4" />
                </span>
            </Tooltip>
        </div>
        <div className="space-y-3">
            {teamGoals.length > 0 ? (
                teamGoals.map((goal) => (
                    <TeamGoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} onDelete={onDelete} />
                ))
            ) : (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                    No active team goals yet. Use a template above or create a custom goal from the dashboard.
                </p>
            )}
        </div>
    </div>
);

const CreateTeamForm: React.FC<{
    onSave: (teamName: string, seasonYear: number) => Promise<void> | void;
    onJoin?: (joinCode: string) => Promise<void>;
    onCancel?: () => void;
}> = ({ onSave, onJoin, onCancel }) => {
    const [teamName, setTeamName] = useState('');
    const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
    const [mode, setMode] = useState<'create' | 'join'>(onJoin ? 'create' : 'create');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(teamName, seasonYear);
    };

    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onJoin) return;
        const cleaned = joinCode.trim().toUpperCase();
        if (!cleaned) {
            setJoinError('Enter a valid team code.');
            return;
        }
        setIsJoining(true);
        setJoinError(null);
        try {
            await onJoin(cleaned);
            setJoinCode('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to join this team.';
            setJoinError(message);
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="space-y-4">
            {onCancel && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close create team form"
                        className="text-xl font-bold leading-none text-muted-foreground hover:text-foreground"
                    >
                        ×
                    </button>
                </div>
            )}
            {onJoin && (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('create')}
                        className={`py-2 px-3 rounded-md text-sm font-semibold ${
                            mode === 'create' ? 'bg-secondary text-secondary-foreground' : 'bg-muted hover:bg-muted/80'
                        }`}
                    >
                        Create team
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('join')}
                        className={`py-2 px-3 rounded-md text-sm font-semibold ${
                            mode === 'join' ? 'bg-secondary text-secondary-foreground' : 'bg-muted hover:bg-muted/80'
                        }`}
                    >
                        Join as co-coach
                    </button>
                </div>
            )}

            {mode === 'join' && onJoin ? (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Enter Team Code</label>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="mt-1 block w-full bg-background border-input rounded-md py-2 px-3 uppercase tracking-[0.3em]"
                            placeholder="ABC123"
                        />
                    </div>
                    {joinError && <p className="text-sm text-destructive">{joinError}</p>}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isJoining}
                            className="py-2 px-4 bg-primary text-primary-foreground rounded-md disabled:opacity-60"
                        >
                            {isJoining ? 'Joining…' : 'Join Team'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Team Name</label>
                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                            className="mt-1 block w-full bg-background border-input rounded-md py-2 px-3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Season Year</label>
                        <input
                            type="number"
                            value={seasonYear}
                            onChange={(e) => setSeasonYear(parseInt(e.target.value))}
                            required
                            className="mt-1 block w-full bg-background border-input rounded-md py-2 px-3"
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="py-2 px-4 bg-primary text-primary-foreground rounded-md">
                            Create Team
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

const InvitePlayersModal: React.FC<{ isOpen: boolean; onClose: () => void; codes: { playerCode: string | null; coachCode: string | null } | null; }> = ({ isOpen, onClose, codes }) => {
    const [copied, setCopied] = useState<'player' | 'coach' | null>(null);

    const handleCopy = (code: string | null, type: 'player' | 'coach') => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const renderCodeCard = (label: string, code: string | null, type: 'player' | 'coach') => (
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
                {copied === type && <span className="text-xs font-semibold text-success">Copied!</span>}
            </div>
            <p className="text-3xl font-mono tracking-widest text-secondary">{code || '...'}</p>
            <button
                onClick={() => handleCopy(code, type)}
                disabled={!code}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold disabled:opacity-50"
            >
                Copy {label}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite Players & Coaches">
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Share the player code with athletes and the coach code with other staff members.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    {renderCodeCard('Player Code', codes?.playerCode ?? null, 'player')}
                    {renderCodeCard('Coach Code', codes?.coachCode ?? null, 'coach')}
                </div>
                <button onClick={onClose} className="mt-2 w-full py-2 px-4 bg-muted hover:bg-muted/80 rounded-md">
                    Done
                </button>
            </div>
        </Modal>
    );
};


export const CoachView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [showCoachTips, setShowCoachTips] = useState(true);
    const { currentUser, getTeamsForCoach, getPlayersInTeam, getDrillsForTeam, getSessionsForTeam, createDrill, createAssignment, getGoalsForPlayer, createTeam, getJoinCodesForTeam, getTeamGoals, createTeamGoal, deleteTeamGoal, joinTeamAsCoach, activeTeam, setActiveTeamId, databaseStatus, databaseError } = useContext(DataContext)!;
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedGradYear, setSelectedGradYear] = useState<number | null>(null);
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateDrillModalOpen, setIsCreateDrillModalOpen] = useState(false);
    const [activeTeamCodes, setActiveTeamCodes] = useState<{ playerCode: string | null; coachCode: string | null } | null>(null);
    const [drillStatus, setDrillStatus] = useState<StatusMessage | null>(null);
    const [assignmentStatus, setAssignmentStatus] = useState<StatusMessage | null>(null);
    const [goalTemplateStatus, setGoalTemplateStatus] = useState<StatusMessage | null>(null);
    const [pendingDrillTemplateId, setPendingDrillTemplateId] = useState<string | null>(null);
    const [pendingGoalTemplateId, setPendingGoalTemplateId] = useState<string | null>(null);
    const drillStatusTimeout = useRef<number | null>(null);
    const assignmentStatusTimeout = useRef<number | null>(null);
    const goalTemplateStatusTimeout = useRef<number | null>(null);
    
    const coachTeams = useMemo(() => getTeamsForCoach(currentUser!.id), [currentUser, getTeamsForCoach]);
    const hasTeamIds = (currentUser?.coachTeamIds?.length ?? 0) > 0;
    const teamLoading = hasTeamIds && !activeTeam;
    
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


    const setTimedStatus = (
        setter: React.Dispatch<React.SetStateAction<StatusMessage | null>>,
        ref: React.MutableRefObject<number | null>,
        status: StatusMessage,
    ) => {
        setter(status);
        if (ref.current) {
            window.clearTimeout(ref.current);
        }
        ref.current = window.setTimeout(() => {
            setter(null);
            ref.current = null;
        }, 3500);
    };

    useEffect(() => {
        return () => {
            if (drillStatusTimeout.current) window.clearTimeout(drillStatusTimeout.current);
            if (assignmentStatusTimeout.current) window.clearTimeout(assignmentStatusTimeout.current);
            if (goalTemplateStatusTimeout.current) window.clearTimeout(goalTemplateStatusTimeout.current);
        };
    }, []);

    const handleCreateDrill = async (drillData: Omit<Drill, 'id' | 'teamId'>) => {
        if (!activeTeam) return;
        try {
            await createDrill(drillData, activeTeam.id);
            setTimedStatus(setDrillStatus, drillStatusTimeout, { type: 'success', message: 'Drill created successfully.' });
            setIsCreateDrillModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to create this drill.';
            setTimedStatus(setDrillStatus, drillStatusTimeout, { type: 'error', message });
        }
    };

    const handleAssignDrill = async (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        if (!activeTeam) return;
        try {
            await createAssignment({ teamId: activeTeam.id, ...assignment });
            setTimedStatus(setAssignmentStatus, assignmentStatusTimeout, { type: 'success', message: 'Drill assigned to players.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to assign this drill.';
            setTimedStatus(setAssignmentStatus, assignmentStatusTimeout, { type: 'error', message });
        }
    };

    const handleApplyDrillTemplate = async (template: DrillTemplate) => {
        setPendingDrillTemplateId(template.templateId);
        const { templateId: _templateId, focus: _focus, ...drillPayload } = template;
        try {
            await handleCreateDrill(drillPayload);
        } finally {
            setPendingDrillTemplateId(null);
        }
    };

    const handleApplyTeamGoalTemplate = async (template: TeamGoalTemplate, targetValue: number) => {
        if (!activeTeam) return;
        setPendingGoalTemplateId(template.templateId);
        try {
            const startDate = new Date();
            const targetDate = new Date(startDate.getTime() + template.durationDays * 86400000);
            await createTeamGoal({
                teamId: activeTeam.id,
                description: template.headline,
                metric: template.metric,
                targetValue,
                startDate: startDate.toISOString(),
                targetDate: targetDate.toISOString(),
                status: 'Active',
                ...(template.drillType ? { drillType: template.drillType } : {}),
                ...(template.pitchTypes ? { pitchTypes: template.pitchTypes } : {}),
                ...(template.targetZones ? { targetZones: template.targetZones } : {}),
            });
            setTimedStatus(setGoalTemplateStatus, goalTemplateStatusTimeout, { type: 'success', message: 'Team goal added.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to create this team goal.';
            setTimedStatus(setGoalTemplateStatus, goalTemplateStatusTimeout, { type: 'error', message });
        } finally {
            setPendingGoalTemplateId(null);
        }
    };

    const handleDeleteTeamGoalInline = async (goalId: string) => {
        try {
            await deleteTeamGoal(goalId);
            setTimedStatus(setGoalTemplateStatus, goalTemplateStatusTimeout, { type: 'success', message: 'Team goal removed.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to delete this team goal.';
            setTimedStatus(setGoalTemplateStatus, goalTemplateStatusTimeout, { type: 'error', message });
        }
    };

    const handleCreateTeam = async (teamName: string, seasonYear: number) => {
        try {
            const newTeam = await createTeam({ name: teamName, seasonYear });
            if (newTeam) {
                setActiveTeamId(newTeam.teamId);
                setCurrentView('dashboard');
                setActiveTeamCodes({ playerCode: newTeam.playerCode, coachCode: newTeam.coachCode });
                setIsInviteModalOpen(true);
            }
        } finally {
            setIsCreateTeamModalOpen(false);
        }
    }

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayer(player);
    };
    
    const handleBackToPlayerList = () => {
        setSelectedPlayer(null);
    }

    const handleInviteClick = async () => {
        if (!activeTeam) return;
        const codes = await getJoinCodesForTeam(activeTeam.id);
        setActiveTeamCodes(codes);
        setIsInviteModalOpen(true);
    };

    const handleJoinTeamWithCode = async (code: string) => {
        const cleaned = code.trim().toUpperCase();
        if (!cleaned) {
            throw new Error('Enter a valid team code.');
        }
        await joinTeamAsCoach(cleaned);
        setCurrentView('dashboard');
        setIsCreateTeamModalOpen(false);
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Players', icon: <UsersIcon />, view: 'players' },
        { name: 'Drills', icon: <ClipboardListIcon />, view: 'drills' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
        { name: 'Profile', icon: <ProfileIcon />, view: 'profile' },
    ];
    
    const pageTitles: { [key: string]: string } = {
        dashboard: `Team Overview: ${activeTeam?.name || ''}`,
        players: 'Players',
        drills: 'Drill Library',
        analytics: 'Team Analytics',
        profile: 'Profile'
    };

    React.useEffect(() => {
        if(currentView !== 'players') {
            setSelectedPlayer(null);
        }
    }, [currentView]);

    const performanceOverTimeData = useMemo(() => {
        if (sessions.length === 0) {
            return [];
        }

        const dailyTotals = sessions.reduce((acc, session) => {
            const dayKey = new Date(session.date).toISOString().split('T')[0];
            if (!acc.has(dayKey)) {
                acc.set(dayKey, {
                    label: formatDate(session.date, { month: 'short', day: 'numeric' }),
                    attempted: 0,
                    executed: 0,
                    hardHits: 0,
                    strikeouts: 0,
                });
            }
            const entry = acc.get(dayKey)!;
            session.sets.forEach((set) => {
                entry.attempted += set.repsAttempted ?? 0;
                entry.executed += set.repsExecuted ?? 0;
                entry.hardHits += set.hardHits ?? 0;
                entry.strikeouts += set.strikeouts ?? 0;
            });
            return acc;
        }, new Map<string, { label: string; attempted: number; executed: number; hardHits: number; strikeouts: number }>());

        return Array.from(dailyTotals.entries())
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([, totals]) => {
                const aggregateSet: SetResult = {
                    setNumber: 1,
                    repsAttempted: totals.attempted,
                    repsExecuted: totals.executed,
                    hardHits: totals.hardHits,
                    strikeouts: totals.strikeouts,
                };
                const aggregateSets: SetResult[] = [aggregateSet];
                return {
                    name: totals.label,
                    'Execution %': calculateExecutionPercentage(aggregateSets),
                    'Hard Hit %': calculateHardHitPercentage(aggregateSets),
                    'Total Reps': totals.attempted,
                };
            });
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
            const drill = session.drillId ? drills.find(d => d.id === session.drillId) : undefined;
            const sessionDrillType = drill?.drillType || (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);

            session.sets.forEach(set => {
                const focusType = set.drillType || sessionDrillType;
                if (focusType) {
                    if (!byDrillType[focusType]) byDrillType[focusType] = { executed: 0, attempted: 0 };
                    byDrillType[focusType]!.executed += set.repsExecuted;
                    byDrillType[focusType]!.attempted += set.repsAttempted;
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
        
        const calculateBreakdownData = (
            data: { [key: string]: { executed: number, attempted: number } | undefined },
            filterFn: (name: string, set: SetResult, session: Session, drill?: Drill) => boolean,
        ) => {
            return Object.entries(data)
                .map(([name, values]) => ({
                    name,
                    reps: Math.round(values!.attempted),
                    execution: values!.attempted > 0 ? Math.round((values!.executed / values!.attempted) * 100) : 0,
                    topPlayers: getTopPlayersForFilter((set, session, drill) => filterFn(name, set, session, drill), 'execution'),
                }))
                .filter(item => item.reps > 0)
                .sort((a, b) => b.reps - a.reps);
        };
        
        const teamBreakdowns = {
            byDrillType: calculateBreakdownData(byDrillType, (entryName, set, session, drill) => {
                const sessionType = drill?.drillType || (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);
                return (set.drillType || sessionType) === entryName;
            }),
            byPitchType: calculateBreakdownData(byPitchType, (entryName, set) => set.pitchTypes?.includes(entryName as PitchType) ?? false),
            byCount: calculateBreakdownData(byCount, (entryName, set) => (set.countSituation || 'Even') === entryName),
            byZone: calculateBreakdownData(byZone, (entryName, set) => set.targetZones?.includes(entryName as TargetZone) ?? false).map(d => ({...d, zone: d.name as TargetZone})),
        };
        
        return { performanceOverTimeData, drillSuccessData, drillEffectiveness, teamBreakdowns };
    }, [sessions, drills, players, performanceOverTimeData, drillSuccessData]);
    
    const headerContent = {
        dashboard: (
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleInviteClick}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm"
                >
                    Invite Players
                </button>
                <button
                    onClick={() => setIsCreateTeamModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm"
                >
                    + New Team
                </button>
            </div>
        ),
        drills: (
            <button
                onClick={() => setIsCreateDrillModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm"
            >
                + Create Drill
            </button>
        ),
    }[currentView];

    return (
        <Dashboard 
            navItems={navItems} 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            pageTitle={pageTitles[currentView]}
            headerContent={headerContent}
        teams={coachTeams}
        activeTeamId={activeTeam?.id ?? currentUser?.coachTeamIds?.[0] ?? ''}
        setActiveTeamId={setActiveTeamId}
    >
            {activeTeam && showCoachTips && (
                <div className="mb-6 rounded-xl border border-border/70 bg-card/60 p-5 pr-12 relative">
                    <button
                        type="button"
                        onClick={() => setShowCoachTips(false)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xl font-bold leading-none"
                        aria-label="Dismiss coaching tips"
                    >
                        ×
                    </button>
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                            <InfoIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">
                                Game plan: keep invites, drills, and goals in sync.
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>
                                    <span className="text-foreground font-semibold">Invite Players:</span> Use the header button to
                                    grab join codes and send them out in seconds.
                                </li>
                                <li>
                                    <span className="text-foreground font-semibold">Assign Work:</span> New drills or templates appear in
                                    the Drills tab immediately so staff and players stay aligned.
                                </li>
                                <li>
                                    <span className="text-foreground font-semibold">Watch Progress:</span> Team goals and analytics refresh
                                    as soon as players log sets—no manual updates required.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            {teamLoading && (
                <div className="mb-6 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground flex items-center gap-3">
                    <Spinner />
                    <div>
                        <p className="font-semibold">Welcome back!</p>
                        <p className="text-xs text-muted-foreground">Pulling up your team dashboard so you can invite players and log sessions.</p>
                    </div>
                </div>
            )}
            {databaseStatus === 'error' && (
                <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {databaseError ?? 'Unable to reach the database. Please refresh or check your connection.'}
                </div>
            )}
            {currentView === 'dashboard' && (
                <CoachDashboard
                    players={players}
                    drills={drills}
                    sessions={sessions}
                    teamGoals={teamGoals}
                    onInviteClick={handleInviteClick}
                />
            )}
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
            {currentView === 'drills' && (
                <div className="space-y-6">
                    {drillStatus && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`rounded-lg border px-4 py-2 text-sm ${drillStatus.type === 'success' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}
                        >
                            {drillStatus.message}
                        </div>
                    )}
                    {assignmentStatus && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`rounded-lg border px-4 py-2 text-sm ${assignmentStatus.type === 'success' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}
                        >
                            {assignmentStatus.message}
                        </div>
                    )}
                    {goalTemplateStatus && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`rounded-lg border px-4 py-2 text-sm ${goalTemplateStatus.type === 'success' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}
                        >
                            {goalTemplateStatus.message}
                        </div>
                    )}
                    <DrillTemplatesPanel
                        pendingTemplateId={pendingDrillTemplateId}
                        onApply={handleApplyDrillTemplate}
                        disabled={!activeTeam}
                    />
                    <DrillList drills={drills} players={players} createDrill={handleCreateDrill} assignDrill={handleAssignDrill} />
                    <TeamGoalTemplatesPanel
                        sessions={sessions}
                        drills={drills}
                        pendingTemplateId={pendingGoalTemplateId}
                        onApply={handleApplyTeamGoalTemplate}
                        disabled={!activeTeam}
                    />
                    <TeamGoalsOverview teamGoals={teamGoals} sessions={sessions} drills={drills} onDelete={handleDeleteTeamGoalInline} />
                </div>
            )}
            {currentView === 'analytics' && (
                teamAnalyticsData ? (
                    <CoachAnalyticsPage analyticsData={teamAnalyticsData} />
                ) : (
                    <div>
                         <div className="bg-card border border-border p-6 rounded-lg shadow-sm text-center text-muted-foreground">
                             <p>
                                 {players.length === 0
                                     ? 'Invite players to your roster to unlock team analytics.'
                                     : 'Log more team sessions to unlock detailed analytics and insights.'}
                             </p>
                         </div>
                    </div>
                )
            )}
            {currentView === 'profile' && <ProfileTab />}
            <InvitePlayersModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                codes={activeTeamCodes} 
            />
            <Modal 
                isOpen={isCreateTeamModalOpen} 
                onClose={() => setIsCreateTeamModalOpen(false)} 
                title="Create or Join Team"
            >
                <CreateTeamForm
                    onSave={handleCreateTeam}
                    onJoin={handleJoinTeamWithCode}
                    onCancel={() => setIsCreateTeamModalOpen(false)}
                />
            </Modal>
            <Modal isOpen={isCreateDrillModalOpen} onClose={() => setIsCreateDrillModalOpen(false)} title="Create New Drill">
                <DrillForm onSave={handleCreateDrill} onClose={() => setIsCreateDrillModalOpen(false)} />
            </Modal>
        </Dashboard>
    );
};
