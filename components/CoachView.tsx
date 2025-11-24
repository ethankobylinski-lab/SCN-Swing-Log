import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { DataContext, PitchingStatsSummary } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { ProfileTab } from './ProfileTab';
import { GoalForm, GoalFormValues, GoalProgress } from './PlayerView';
import { ProfileIcon } from './icons/ProfileIcon';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { InfoIcon } from './icons/InfoIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { ReportsIcon } from './icons/ReportsIcon';
import { ReportsPage } from './ReportsPage';
import {
    User, Team, Player, Drill, Session, DrillAssignment, PersonalGoal, TeamGoal,
    GoalType, DrillType, TargetZone, PitchType, SetResult, StatusMessage,
    PitchSession, PitchRecord, DayOfWeek, CountSituation, BaseRunner, ZoneId
} from '../types';
import { AnalyticsCharts } from './AnalyticsCharts';
import { Modal } from './Modal';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, GOAL_TYPES, DRILL_TYPES } from '../constants';
import { DRILL_TEMPLATES, DrillTemplate, TEAM_GOAL_TEMPLATES, TeamGoalTemplate } from '../templates';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, getCurrentMetricValue, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName, resolveDrillTypeForSet } from '../utils/helpers';
import { Avatar } from './Avatar';
import { TeamTrendChart } from './TeamTrendChart';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { Tooltip } from './Tooltip';
import { Spinner } from './Spinner';
import { SessionDetail } from './SessionDetail';
import { PitchSessionDetailModal } from './PitchSessionDetailModal';
import { PitchingBullpenChart } from './PitchingBullpenChart';
import { PitchingProgramsSection } from './PitchingProgramsSection';
import { TeamInsightsTab } from './TeamInsightsTab';
import { LoadingSkeleton, StatCardSkeleton, ListSkeleton, ChartSkeleton } from './LoadingSkeleton';
import { EmptyState, NoPlayersEmpty, NoDrillsEmpty, NoGoalsEmpty } from './EmptyState';
import { Button, CreateButton, SaveButton, CancelButton } from './Button';
import { usePitchingAnalytics, CoachPitchingAnalyticsData } from '../hooks/usePitchingAnalytics';
import { WorkloadCalendar } from './WorkloadCalendar';


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

const EffectivenessCard: React.FC<{ title: string; drills: { name: string; value: number; topPlayers: TopPlayer[] }[] }> = ({ title, drills }) => (
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

const CoachAnalyticsPage: React.FC<{ analyticsData: CoachAnalyticsData; pitchingData: CoachPitchingAnalyticsData | null }> = ({ analyticsData, pitchingData }) => {
    const [activeTab, setActiveTab] = useState<'hitting' | 'pitching'>('hitting');

    if (activeTab === 'pitching') {
        return (
            <div className="space-y-8">
                <div className="flex justify-end">
                    <div className="bg-muted p-1 rounded-lg inline-flex">
                        <button
                            onClick={() => setActiveTab('hitting')}
                            className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
                        >
                            Hitting
                        </button>
                        <button
                            onClick={() => setActiveTab('pitching')}
                            className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-background text-foreground shadow-sm"
                        >
                            Pitching
                        </button>
                    </div>
                </div>

                {pitchingData ? (
                    <>
                        <AnalyticsCharts
                            performanceOverTimeData={pitchingData.performanceOverTimeData}
                            drillSuccessData={[]} // Not applicable for pitching yet
                            performanceMetricKey="Strike %"
                            performanceMetricLabel="Strike %"
                            volumeMetricKey="Total Pitches"
                            volumeMetricLabel="Total Pitches"
                        />

                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Pitching Breakdowns</h2>
                            <p className="text-sm text-muted-foreground mb-4">Hover over bars to see top performers.</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                                <div className="lg:col-span-1">
                                    {/* Reusing StrikeZoneHeatmap but mapping props if needed */}
                                    <StrikeZoneHeatmap data={pitchingData.pitchingBreakdowns.byZone.map(z => ({ ...z, execution: z.strikePct, reps: z.pitches }))} />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Pitch Type</h3>
                                        <div className="space-y-4">
                                            {pitchingData.pitchingBreakdowns.byPitchType.length > 0 ? pitchingData.pitchingBreakdowns.byPitchType.map(d => (
                                                <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                    <BreakdownBar label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-accent" />
                                                </Tooltip>
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Count</h3>
                                        <div className="space-y-4">
                                            {pitchingData.pitchingBreakdowns.byCount.length > 0 ? pitchingData.pitchingBreakdowns.byCount.map(d => (
                                                <Tooltip key={d.name} content={<PlayerLeaderboard players={d.topPlayers} />} disabled={d.topPlayers.length === 0}>
                                                    <BreakdownBar label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-secondary" />
                                                </Tooltip>
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-card border border-border p-12 rounded-lg shadow-sm text-center">
                        <p className="text-muted-foreground text-lg mb-2">No pitching data available</p>
                        <p className="text-sm text-muted-foreground">Team members need to log pitching sessions to see analytics here.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <div className="bg-muted p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveTab('hitting')}
                        className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-background text-foreground shadow-sm"
                    >
                        Hitting
                    </button>
                    <button
                        onClick={() => setActiveTab('pitching')}
                        className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
                    >
                        Pitching
                    </button>
                </div>
            </div>

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

const summarizeTeamPitchingSession = (session: Session) => {
    const summarySet = session.sets[0];
    const total = summarySet ? Math.max(0, summarySet.repsAttempted) : 0;
    const strikes = summarySet ? Math.max(0, summarySet.repsExecuted) : 0;
    const balls = summarySet ? Math.max(0, summarySet.strikeouts ?? total - strikes) : 0;
    const strikePct = total > 0 ? Math.round((strikes / total) * 100) : 0;
    return { total, strikes, balls, strikePct };
};

const TeamPitchingOverview: React.FC<{ stats: PitchingStatsSummary }> = ({ stats }) => {
    const lastSessionLabel = stats.lastSessionDate ? formatDate(stats.lastSessionDate) : 'Awaiting first log';
    const lastSessionDetail = stats.lastSessionDate ? `${stats.recentStrikePercentage}% strike rate` : 'Encourage pitchers to log their bullpen.';

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Team Pitching Overview</h3>
                    <p className="text-sm text-muted-foreground">Bullpen volume and strike efficiency.</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{stats.overallStrikePercentage}%</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Team Strike %</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
                    <p className="text-xl font-semibold text-foreground">{stats.totalSessions}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pitches</p>
                    <p className="text-xl font-semibold text-foreground">{stats.totalPitches}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Strike %</p>
                    <p className="text-xl font-semibold text-foreground">{stats.avgStrikePercentage}%</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Best Strike %</p>
                    <p className="text-xl font-semibold text-foreground">{stats.bestStrikePercentage}%</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Session</p>
                    <p className="text-sm font-semibold text-foreground">{lastSessionLabel}</p>
                    <p className="text-xs text-muted-foreground">{lastSessionDetail}</p>
                </div>
                {stats.avgVelocity !== null && (
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Velo</p>
                        <p className="text-xl font-semibold text-foreground">{stats.avgVelocity} mph</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RecentTeamPitchingSessions: React.FC<{ sessions: Session[]; players: Player[] }> = ({ sessions, players }) => {
    const latestSessions = sessions.slice(0, 5);
    const playerNameById = useMemo<Record<string, string>>(() => {
        return players.reduce((acc, player) => {
            acc[player.id] = player.name;
            return acc;
        }, {} as Record<string, string>);
    }, [players]);

    const visibleCount = Math.min(latestSessions.length, 5);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">Recent Pitching Sessions</h3>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{visibleCount > 0 ? `Last ${visibleCount}` : 'No Logs'}</span>
            </div>
            {latestSessions.length > 0 ? (
                <ul className="divide-y divide-border text-sm">
                    {latestSessions.map((session) => {
                        const summary = summarizeTeamPitchingSession(session);
                        const playerName = playerNameById[session.playerId] ?? 'Player';
                        return (
                            <li key={session.id} className="py-3 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-card-foreground">{playerName}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(session.date)} • {summary.total} pitches</p>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                    <p className="font-semibold text-foreground">{summary.strikePct}% strike rate</p>
                                    <p>{summary.strikes} strikes / {summary.balls} balls</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No bullpen logs yet. Encourage pitchers to record their sessions.</p>
            )}
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
    pitchingSessions: PitchSession[],
    teamGoals: TeamGoal[],
    onInviteClick: () => void;
    onSelectSession?: (session: Session) => void;
    loading?: boolean;
}> = ({ players, drills, sessions, pitchingSessions, teamGoals, onInviteClick, onSelectSession, loading = false }) => {

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
                    weekLabel: bucket.label,
                    weekStartDate: bucket.key,
                    avgReps: bucket.attempted,
                    avgQuality: 0, // Not tracked in this view
                    avgExecution: bucket.attempted > 0 ? Math.round((bucket.executed / bucket.attempted) * 100) : 0,
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

    const StatCard: React.FC<{ title: string; value: string; subValue?: string }> = ({ title, value, subValue }) => (
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
                {loading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard title="Active Players (7d)" value={activePlayersCountLast7Days.toString()} subValue={players.length.toString()} />
                        <StatCard title="Total Reps (7d)" value={totalRepsLast7Days.toLocaleString()} />
                        <StatCard title="Execution % (7d)" value={`${teamExecutionPctLast7Days}%`} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {loading ? (
                        <ChartSkeleton />
                    ) : (
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
                                            className={`px-3 py-1 transition-colors ${trendRange === rangeOption
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
                    )}

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
                                    <li key={session.id} className="py-1">
                                        <button
                                            type="button"
                                            onClick={() => onSelectSession?.(session)}
                                            className="w-full flex items-center gap-4 px-2 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors"
                                        >
                                            <Avatar name={player.name} className="w-10 h-10" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-card-foreground">
                                                    {player.name} completed <span className="text-primary font-bold">{session.name}</span>
                                                </p>
                                                <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                                            </div>
                                            <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                                {goalType}: {progress.value}%
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                            {recentSessions.length === 0 && <p className="text-muted-foreground text-center py-4">No recent activity.</p>}
                        </ul>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <WorkloadCalendar
                            hittingSessions={sessions}
                            pitchingSessions={pitchingSessions}
                            players={players}
                            days={14}
                        />
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
                            <Button
                                onClick={() => {
                                    setTeamGoalFormError(null);
                                    setIsGoalModalOpen(true);
                                }}
                                variant="accent"
                                size="sm"
                            >
                                + Set Goal
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {teamGoalListError && <p className="text-sm text-destructive">{teamGoalListError}</p>}
                            {loading ? (
                                <ListSkeleton count={2} />
                            ) : teamGoals.length > 0 ? (
                                teamGoals.map(goal => (
                                    <TeamGoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} onDelete={handleDeleteTeamGoal} />
                                ))
                            ) : (
                                <EmptyState
                                    icon="🏆"
                                    title="No Team Goals"
                                    message="Set a team goal to track collective progress."
                                    actionLabel="Set Goal"
                                    onAction={() => {
                                        setTeamGoalFormError(null);
                                        setIsGoalModalOpen(true);
                                    }}
                                />
                            )}
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
    onAssignGoal: (playerId: string) => void,
    selectedGradYear: number | null,
    setSelectedGradYear: (year: number | null) => void;
    loading?: boolean;
}> = ({ players, sessionsByPlayer, onPlayerClick, onAssignGoal, selectedGradYear, setSelectedGradYear, loading = false }) => {

    const gradYears = useMemo(() => {
        const years = new Set<number>(players.map(p => p.profile.gradYear));
        return Array.from(years).sort((a, b) => a - b);
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
                {loading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : sortedPlayers.length > 0 ? (
                    sortedPlayers.map(player => {
                        const playerSessions = sessionsByPlayer[player.id] || [];
                        const avgExec = playerSessions.length > 0
                            ? Math.round(playerSessions.reduce((acc, s) => acc + calculateExecutionPercentage(s.sets), 0) / playerSessions.length)
                            : 0;
                        const hardHit = playerSessions.length > 0
                            ? Math.round(playerSessions.reduce((acc, s) => acc + calculateHardHitPercentage(s.sets), 0) / playerSessions.length)
                            : 0;

                        return (
                            <div key={player.id} onClick={() => onPlayerClick(player)} className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-3 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar name={player.name} className="w-12 h-12 text-lg" />
                                        <div>
                                            <h3 className="font-bold text-lg text-foreground">{player.name}</h3>
                                            <p className="text-sm text-muted-foreground">Sessions: {playerSessions.length}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onAssignGoal(player.id);
                                        }}
                                        variant="link"
                                        size="sm"
                                    >
                                        Assign Goal
                                    </Button>
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
                    })
                ) : (
                    <div className="col-span-full">
                        <NoPlayersEmpty />
                    </div>
                )}
            </div>
        </div>
    )
};




const getPlayerStrengthsAndWeaknesses = (sessions: Session[], drills: Drill[]) => {
    const zoneStats = new Map<TargetZone, { executed: number; attempted: number }>();
    const pitchStats = new Map<PitchType, { executed: number; attempted: number }>();

    sessions.forEach(session => {
        session.sets.forEach(set => {
            if (!set.repsAttempted) return;

            set.targetZones?.forEach(zone => {
                const current = zoneStats.get(zone) || { executed: 0, attempted: 0 };
                zoneStats.set(zone, {
                    executed: current.executed + set.repsExecuted,
                    attempted: current.attempted + set.repsAttempted
                });
            });

            set.pitchTypes?.forEach(pitch => {
                const current = pitchStats.get(pitch) || { executed: 0, attempted: 0 };
                pitchStats.set(pitch, {
                    executed: current.executed + set.repsExecuted,
                    attempted: current.attempted + set.repsAttempted
                });
            });
        });
    });

    const calculatePct = (stats: { executed: number; attempted: number }) =>
        stats.attempted >= 10 ? (stats.executed / stats.attempted) * 100 : -1;

    let bestZone: { name: string; pct: number } | null = null;
    let worstZone: { name: string; pct: number } | null = null;
    let bestPitch: { name: string; pct: number } | null = null;
    let worstPitch: { name: string; pct: number } | null = null;

    zoneStats.forEach((stats, zone) => {
        const pct = calculatePct(stats);
        if (pct === -1) return;
        if (!bestZone || pct > bestZone.pct) bestZone = { name: zone, pct };
        if (!worstZone || pct < worstZone.pct) worstZone = { name: zone, pct };
    });

    pitchStats.forEach((stats, pitch) => {
        const pct = calculatePct(stats);
        if (pct === -1) return;
        if (!bestPitch || pct > bestPitch.pct) bestPitch = { name: pitch, pct };
        if (!worstPitch || pct < worstPitch.pct) worstPitch = { name: pitch, pct };
    });

    return { bestZone, worstZone, bestPitch, worstPitch };
};

const generateSuggestedGoal = (player: Player, sessions: Session[], drills: Drill[]): GoalFormValues | null => {
    const { worstZone, worstPitch } = getPlayerStrengthsAndWeaknesses(sessions, drills);

    if (worstZone) {
        return {
            metric: 'Execution %',
            targetValue: Math.min(Math.round(worstZone.pct + 10), 90),
            targetDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            targetZones: [worstZone.name as TargetZone],
            minReps: 50
        };
    }

    if (worstPitch) {
        return {
            metric: 'Execution %',
            targetValue: Math.min(Math.round(worstPitch.pct + 10), 90),
            targetDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            pitchTypes: [worstPitch.name as PitchType],
            minReps: 50
        };
    }

    return null;
};

const PlayerDetail: React.FC<{
    player: Player;
    sessions: Session[];
    drills: Drill[];
    goals: PersonalGoal[];
    onBack: () => void;
    onAssignGoal: (goalData: GoalFormValues) => Promise<void> | void;
    onAddFeedback: (sessionId: string, reaction: string) => Promise<void> | void;
    getAllPitchSessionsForPlayer: (playerId: string) => Promise<PitchSession[]>;
}> = ({ player, sessions, drills, goals, onBack, onAssignGoal, onAddFeedback, getAllPitchSessionsForPlayer }) => {
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [suggestedGoal, setSuggestedGoal] = useState<GoalFormValues | null>(null);
    const [sessionFilter, setSessionFilter] = useState<'all' | 'batting' | 'pitching'>('all');
    const [assignError, setAssignError] = useState<string | null>(null);
    const [pitchingSessions, setPitchingSessions] = useState<PitchSession[]>([]);
    const [selectedPitchingSession, setSelectedPitchingSession] = useState<PitchSession | null>(null);

    // Fetch pitching sessions for this player
    useEffect(() => {
        let isMounted = true;
        const fetchPitchingSessions = async () => {
            try {
                const sessions = await getAllPitchSessionsForPlayer(player.id);
                if (isMounted) {
                    setPitchingSessions(sessions);
                }
            } catch (error) {
                console.error('Error fetching pitching sessions:', error);
            }
        };
        fetchPitchingSessions();
        return () => { isMounted = false; };
    }, [player.id, getAllPitchSessionsForPlayer]);


    const totalReps = useMemo(() =>
        sessions.reduce((sum, s) => sum + s.sets.reduce((setSum, set) => setSum + set.repsAttempted, 0), 0),
        [sessions]);

    const { bestZone, worstZone, bestPitch, worstPitch } = useMemo(() =>
        getPlayerStrengthsAndWeaknesses(sessions, drills),
        [sessions, drills]);

    const heatmapData = useMemo(() => {
        const zoneMap = new Map<TargetZone, { executed: number; reps: number }>();
        sessions.forEach(s => s.sets.forEach(set => {
            set.targetZones?.forEach(z => {
                const curr = zoneMap.get(z) || { executed: 0, reps: 0 };
                zoneMap.set(z, {
                    executed: curr.executed + set.repsExecuted,
                    reps: curr.reps + set.repsAttempted
                });
            });
        }));

        return Array.from(zoneMap.entries()).map(([zone, stats]) => ({
            zone,
            execution: stats.reps > 0 ? (stats.executed / stats.reps) * 100 : 0,
            reps: stats.reps,
            topPlayers: [] // Not needed for individual view
        }));
    }, [sessions]);

    // Create display list for pitching sessions
    const displayPitchingSessions = useMemo(() => {
        return pitchingSessions.map(ps => {
            const strikes = ps.pitchRecords?.filter(p =>
                p.outcome === 'called_strike' ||
                p.outcome === 'swinging_strike' ||
                p.outcome === 'foul' ||
                p.outcome === 'in_play'
            ).length || 0;
            const total = ps.pitchRecords?.length || ps.totalPitches || 0;
            const strikeRate = total > 0 ? Math.round((strikes / total) * 100) : 0;

            return {
                id: ps.id,
                name: ps.sessionName,
                date: ps.date,
                pitches: ps.totalPitches,
                strikeRate,
                type: 'pitching' as const,
                fullSession: ps
            };
        });
    }, [pitchingSessions]);

    const handleSuggestGoal = () => {
        // TODO: Re-implement generateSuggestedGoal function in utils/helpers
        // const suggestion = generateSuggestedGoal(player, sessions, drills);
        // if (suggestion) {
        //     setSuggestedGoal(suggestion);
        //     setShowGoalModal(true);
        // }
        // For now, just open the goal modal
        setSuggestedGoal(null);
        setShowGoalModal(true);
    };

    // Filter sessions based on selected filter
    const filteredSessions = useMemo(() => {
        if (sessionFilter === 'batting') {
            return sessions.filter(s => s.type === 'hitting' || !s.type);
        } else if (sessionFilter === 'pitching') {
            // Return pitching sessions converted to a display format
            return [];
        }
        return sessions;
    }, [sessions, sessionFilter]);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-sm text-primary hover:underline font-semibold">
                    &larr; Back to Player List
                </button>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSuggestGoal}
                        variant="secondary"
                        size="sm"
                        leftIcon={<LightbulbIcon className="w-4 h-4" />}
                    >
                        Suggest Goal
                    </Button>
                    <Button
                        onClick={() => {
                            setSuggestedGoal(null);
                            setAssignError(null);
                            setShowGoalModal(true);
                        }}
                        size="sm"
                    >
                        Assign Custom Goal
                    </Button>
                </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex items-center gap-4">
                    <Avatar name={player.name} className="w-12 h-12 text-lg" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{player.name}</h1>
                        <p className="text-xs text-muted-foreground">Grad: {player.profile.gradYear}</p>
                    </div>
                </div>
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Reps</p>
                    <p className="text-2xl font-bold text-foreground">{totalReps.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Strength</p>
                    <div className="flex flex-col items-center">
                        {bestZone && <span className="text-sm font-semibold text-success">{bestZone.name} ({Math.round(bestZone.pct)}%)</span>}
                        {bestPitch && <span className="text-xs text-muted-foreground">{bestPitch.name} ({Math.round(bestPitch.pct)}%)</span>}
                        {!bestZone && !bestPitch && <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                </div>
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Weakness</p>
                    <div className="flex flex-col items-center">
                        {worstZone && <span className="text-sm font-semibold text-destructive">{worstZone.name} ({Math.round(worstZone.pct)}%)</span>}
                        {worstPitch && <span className="text-xs text-muted-foreground">{worstPitch.name} ({Math.round(worstPitch.pct)}%)</span>}
                        {!worstZone && !worstPitch && <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Heatmap & Goals */}
                <div className="lg:col-span-1 space-y-6">
                    <StrikeZoneHeatmap data={heatmapData} battingSide={player.profile.bats as any} />

                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-4">Active Goals</h3>
                        {goals.length > 0 ? (
                            <div className="space-y-4">
                                {goals.map(goal => <GoalProgress key={goal.id} goal={goal} sessions={sessions} pitchSessions={pitchingSessions} drills={drills} onDelete={async () => { }} />)}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No active goals.</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Session History */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Session History</h2>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-muted-foreground">Filter:</span>
                        <div className="inline-flex rounded-lg border border-border overflow-hidden">
                            {(['all', 'batting', 'pitching'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setSessionFilter(filter)}
                                    className={`px-4 py-2 text-sm font-semibold transition-colors ${sessionFilter === filter
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {filter === 'all' ? 'All Sessions' : filter === 'batting' ? 'Batting' : 'Pitching'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Sessions</p>
                            <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Batting Reps</p>
                            <p className="text-2xl font-bold text-primary">
                                {sessions
                                    .filter(s => s.type === 'hitting' || !s.type)
                                    .reduce((sum, s) => sum + s.sets.reduce((setSum, set) => setSum + set.repsAttempted, 0), 0)
                                    .toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pitches Thrown</p>
                            <p className="text-2xl font-bold text-accent">
                                {pitchingSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Strike %</p>
                            <p className="text-2xl font-bold text-success">
                                {(() => {
                                    const totalPitches = pitchingSessions.reduce((sum, s) => {
                                        return sum + (s.pitchRecords?.length || 0);
                                    }, 0);
                                    const strikes = pitchingSessions.reduce((sum, s) => {
                                        return sum + (s.pitchRecords?.filter(p =>
                                            p.outcome === 'called_strike' ||
                                            p.outcome === 'swinging_strike' ||
                                            p.outcome === 'foul' ||
                                            p.outcome === 'in_play'
                                        ).length || 0);
                                    }, 0);
                                    return totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0;
                                })()}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
                        <ul className="divide-y divide-border">
                            {/* Show batting sessions */}
                            {sessionFilter !== 'pitching' && filteredSessions.length > 0 && filteredSessions.slice().reverse().map(session => {
                                const drill = drills.find(d => d.id === session.drillId);
                                const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: true };
                                const goalType = drill ? drill.goalType : "Exec %";
                                const sessionReps = session.sets.reduce((sum, s) => sum + s.repsAttempted, 0);

                                return (
                                    <li key={session.id} className="p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-primary">{session.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDate(session.date)} • {sessionReps} reps
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                                {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                            </div>
                                        </div>

                                        {/* Quick Feedback Section */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => onAddFeedback(session.id, '👍')}
                                                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <span className="text-lg">👍</span> Great Job
                                            </button>
                                            <div className="h-4 w-px bg-border mx-2"></div>
                                            <p className="text-xs text-muted-foreground italic">
                                                {session.coachFeedback ? `"${session.coachFeedback}"` : "No feedback yet"}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}

                            {/* Show pitching sessions */}
                            {(sessionFilter === 'pitching' || sessionFilter === 'all') && displayPitchingSessions.length > 0 && displayPitchingSessions.slice().reverse().map(ps => (
                                <li key={ps.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedPitchingSession(ps.fullSession)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-primary">{ps.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(ps.date)} • {ps.pitches} pitches
                                            </p>
                                        </div>
                                        <div className="px-3 py-1 text-sm font-semibold rounded-full bg-success/20 text-success">
                                            Strike Rate: {ps.strikeRate}%
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Click to view details</p>
                                </li>
                            ))}

                            {filteredSessions.length === 0 && displayPitchingSessions.length === 0 && (
                                <p className="text-center text-muted-foreground p-6">
                                    {sessionFilter === 'all'
                                        ? 'This player has not completed any sessions yet.'
                                        : sessionFilter === 'batting'
                                            ? 'This player has not completed any batting sessions yet.'
                                            : 'This player has not completed any pitching sessions yet.'}
                                </p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Pitching Session Details Modal */}
                <PitchSessionDetailModal
                    session={selectedPitchingSession}
                    onClose={() => setSelectedPitchingSession(null)}
                />
            </div>

            <Modal
                isOpen={showGoalModal}
                onClose={() => {
                    setShowGoalModal(false);
                    setSuggestedGoal(null);
                    setAssignError(null);
                }}
                title={suggestedGoal ? "Assign Suggested Goal" : "Assign New Goal"}
            >
                <GoalForm
                    onSave={async (data) => {
                        setAssignError(null);
                        try {
                            await onAssignGoal(data);
                            setShowGoalModal(false);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'Failed to assign goal.';
                            setAssignError(message);
                            throw err;
                        }
                    }}
                    errorMessage={assignError}
                    // Pre-fill if suggested
                    {...(suggestedGoal ? { initialValues: suggestedGoal } : {})}
                />
            </Modal>
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
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                >
                    Save Goal
                </Button>
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
        setDrill(prev => ({ ...prev, [field]: value }));
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
                        <input type="number" value={drill.goalTargetValue} onChange={e => handleChange('goalTargetValue', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Sets</label>
                        <input type="number" value={drill.sets} onChange={e => handleChange('sets', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Reps/Set</label>
                        <input type="number" value={drill.repsPerSet} onChange={e => handleChange('repsPerSet', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <CancelButton onClick={onClose} disabled={isSaving} />
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                >
                    Save Drill
                </Button>
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
                                <input type="checkbox" id={`p-${p.id}`} checked={selectedPlayerIds.includes(p.id)} onChange={() => handlePlayerSelect(p.id)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
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
                    <CancelButton onClick={onClose} disabled={isSubmitting} />
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        variant="primary"
                    >
                        Assign Drill
                    </Button>
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
                    <div className="md:col-span-3">
                        <NoDrillsEmpty onCreateDrill={() => setIsCreateModalOpen(true)} />
                    </div>
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
                        <Button
                            onClick={() => onApply(template, recommendedTarget)}
                            disabled={disabled || pendingTemplateId === template.templateId}
                            isLoading={pendingTemplateId === template.templateId}
                            className="w-full mt-auto"
                            size="sm"
                        >
                            {pendingTemplateId === template.templateId ? 'Adding…' : 'Quick Add Goal'}
                        </Button>
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
    loading?: boolean;
}> = ({ teamGoals, sessions, drills, onDelete, loading = false }) => (
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
            {loading ? (
                <ListSkeleton count={2} />
            ) : teamGoals.length > 0 ? (
                teamGoals.map((goal) => (
                    <TeamGoalProgress key={goal.id} goal={goal} sessions={sessions} drills={drills} onDelete={onDelete} />
                ))
            ) : (
                <EmptyState
                    title="No Active Goals"
                    message="Use a template above or create a custom goal from the dashboard to track team progress."
                    icon="🎯"
                />
            )}
        </div>
    </div>
);

const CreateTeamForm: React.FC<{
    onSave: (teamName: string, seasonYear: number) => Promise<void>;
    onJoin?: (joinCode: string) => Promise<void>;
    onCancel?: () => void;
}> = ({ onSave, onJoin, onCancel }) => {
    const [teamName, setTeamName] = useState('');
    const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
    const [mode, setMode] = useState<'create' | 'join'>(onJoin ? 'create' : 'create');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        if (!teamName.trim()) {
            setCreateError('Enter a team name.');
            return;
        }
        setIsCreating(true);
        try {
            await onSave(teamName.trim(), seasonYear);
            setTeamName('');
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unable to create that team right now.';
            setCreateError(message);
        } finally {
            setIsCreating(false);
        }
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
                    <Button
                        type="button"
                        onClick={() => setMode('create')}
                        variant={mode === 'create' ? 'secondary' : 'ghost'}
                        size="sm"
                    >
                        Create team
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setMode('join')}
                        variant={mode === 'join' ? 'secondary' : 'ghost'}
                        size="sm"
                    >
                        Join as co-coach
                    </Button>
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
                        <Button
                            type="submit"
                            disabled={isJoining}
                            isLoading={isJoining}
                        >
                            {isJoining ? 'Joining…' : 'Join Team'}
                        </Button>
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
                    {createError && <p className="text-sm text-destructive">{createError}</p>}
                    <div className="flex justify-end pt-2">
                        <CreateButton
                            type="submit"
                            isLoading={isCreating}
                            label="Create Team"
                        />
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
            <Button
                onClick={() => handleCopy(code, type)}
                disabled={!code}
                className="w-full"
                size="sm"
            >
                Copy {label}
            </Button>
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
                <Button onClick={onClose} variant="secondary" className="mt-2 w-full">
                    Done
                </Button>
            </div>
        </Modal>
    );
};


export const CoachView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [showCoachTips, setShowCoachTips] = useState(true);
    const { currentUser, getTeamsForCoach, getPlayersInTeam, getDrillsForTeam, getSessionsForTeam, createDrill, createAssignment, getGoalsForPlayer, createTeam, getJoinCodesForTeam, getTeamGoals, createTeamGoal, deleteTeamGoal, joinTeamAsCoach, activeTeam, setActiveTeamId, databaseStatus, databaseError, setCoachFeedbackOnSession, getPitchingSessionsForTeam, getPitchingStatsForSessions, createPersonalGoalForPlayerAsCoach, addSessionFeedback, deleteGoal, getAllPitchSessionsForPlayer } = useContext(DataContext)!;
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
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [savingFeedback, setSavingFeedback] = useState(false);
    const drillStatusTimeout = useRef<number | null>(null);
    const assignmentStatusTimeout = useRef<number | null>(null);
    const goalTemplateStatusTimeout = useRef<number | null>(null);
    const getDateString = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];
    const [goalModalPlayerId, setGoalModalPlayerId] = useState<string | null>(null);
    const [goalMetric, setGoalMetric] = useState<GoalType>('Execution %');
    const [goalTargetValue, setGoalTargetValue] = useState<number>(75);
    const [goalStartDate, setGoalStartDate] = useState<string>(() => getDateString());
    const [goalTargetDate, setGoalTargetDate] = useState<string>(() => getDateString(30));
    const [goalStatus, setGoalStatus] = useState<'Active' | 'Completed' | 'Archived'>('Active');
    const [goalDrillType, setGoalDrillType] = useState<DrillType | undefined>(undefined);
    const [goalSaving, setGoalSaving] = useState(false);
    const [goalError, setGoalError] = useState<string | null>(null);

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
    const [teamPitchingSessions, setTeamPitchingSessions] = useState<PitchSession[]>([]);

    useEffect(() => {
        let isMounted = true;
        const fetchPitchingSessions = async () => {
            if (!activeTeam) {
                setTeamPitchingSessions([]);
                return;
            }
            try {
                const sessions = await getPitchingSessionsForTeam(activeTeam.id);
                if (isMounted) {
                    setTeamPitchingSessions(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                }
            } catch (error) {
                console.error("Error fetching pitching sessions:", error);
            }
        };
        fetchPitchingSessions();
        return () => { isMounted = false; };
    }, [activeTeam, getPitchingSessionsForTeam]);

    // const teamPitchingStats = useMemo(() => getPitchingStatsForSessions(teamPitchingSessions), [teamPitchingSessions, getPitchingStatsForSessions]);

    const sessionsByPlayer = useMemo(() => {
        return sessions.reduce((acc, session) => {
            if (!acc[session.playerId]) {
                acc[session.playerId] = [];
            }
            acc[session.playerId].push(session);
            return acc;
        }, {} as Record<string, Session[]>);
    }, [sessions]);
    const resetGoalModalState = () => {
        setGoalMetric('Execution %');
        setGoalTargetValue(75);
        setGoalStartDate(getDateString());
        setGoalTargetDate(getDateString(30));
        setGoalStatus('Active');
        setGoalDrillType(undefined);
        setGoalError(null);
    };
    const handleOpenAssignGoal = (playerId: string) => {
        resetGoalModalState();
        setGoalModalPlayerId(playerId);
    };
    const handleCloseGoalModal = (force = false) => {
        if (goalSaving && !force) return;
        setGoalModalPlayerId(null);
        resetGoalModalState();
    };
    const handleAssignGoal = async (playerId: string, goalData: GoalFormValues) => {
        if (!activeTeam) {
            throw new Error('Select a team before assigning goals.');
        }
        const payload: Omit<PersonalGoal, 'id' | 'playerId' | 'teamId' | 'createdByUserId' | 'createdByRole'> = {
            metric: goalData.metric,
            targetValue: goalData.targetValue,
            startDate: new Date().toISOString(),
            targetDate: goalData.targetDate,
            status: 'Active',
            targetZones: goalData.targetZones ?? [],
            pitchTypes: goalData.pitchTypes ?? [],
            ...(goalData.drillType ? { drillType: goalData.drillType } : {}),
            ...(goalData.minReps ? { minReps: goalData.minReps } : {}),
        };
        await createPersonalGoalForPlayerAsCoach(playerId, activeTeam.id, payload);
    };
    const handleSaveCoachGoal = async () => {
        if (!goalModalPlayerId || !activeTeam) {
            return;
        }
        try {
            setGoalSaving(true);
            setGoalError(null);
            const payload: Omit<PersonalGoal, 'id' | 'playerId' | 'teamId' | 'createdByUserId' | 'createdByRole'> = {
                metric: goalMetric,
                targetValue: goalTargetValue,
                startDate: goalStartDate,
                targetDate: goalTargetDate,
                status: goalStatus,
                targetZones: [],
                pitchTypes: [],
                ...(goalDrillType ? { drillType: goalDrillType } : {}),
            };
            await createPersonalGoalForPlayerAsCoach(goalModalPlayerId, activeTeam.id, payload);
            handleCloseGoalModal(true);
        } catch (err) {
            setGoalError('Failed to assign goal. Please try again.');
            setGoalSaving(false);
        }
    };

    const handleAddQuickFeedback = async (sessionId: string, reaction: string) => {
        if (!activeTeam) return;
        try {
            await addSessionFeedback(sessionId, activeTeam.id, { reaction });
        } catch (err) {
            console.error('Failed to add feedback:', err);
        }
    };

    const goalModalPlayer = goalModalPlayerId ? players.find((player) => player.id === goalModalPlayerId) : null;


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
        const newTeam = await createTeam({ name: teamName, seasonYear });
        if (newTeam) {
            setActiveTeamId(newTeam.teamId);
            setCurrentView('dashboard');
            setActiveTeamCodes({ playerCode: newTeam.playerCode, coachCode: newTeam.coachCode });
            setIsInviteModalOpen(true);
            setIsCreateTeamModalOpen(false);
        }
    };

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
        { name: 'Team Overview', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Players', icon: <UsersIcon />, view: 'players' },
        { name: 'Drills & Goals', icon: <ClipboardListIcon />, view: 'drills' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
        { name: 'Insights', icon: <LightbulbIcon />, view: 'insights' },
        { name: 'Reports', icon: <ReportsIcon />, view: 'reports' },
        { name: 'Profile', icon: <ProfileIcon />, view: 'profile' },
    ];

    const pageTitles: { [key: string]: string } = {
        dashboard: `Team Overview: ${activeTeam?.name || ''}`,
        players: 'Players',
        drills: 'Drills & Goals',
        analytics: 'Team Analytics',
        insights: 'Team Insights',
        reports: 'Reports',
        profile: 'Profile'
    };

    React.useEffect(() => {
        if (currentView !== 'players') {
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
                        case 'execution': value = calculateExecutionPercentage([{ ...stats, setNumber: 1 }]); break;
                        case 'hardHit': value = calculateHardHitPercentage([{ ...stats, setNumber: 1 }]); break;
                        case 'contact': value = 100 - calculateStrikeoutPercentage([{ ...stats, setNumber: 1 }]); break;
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
            execution: [...drillPerformance].sort((a, b) => b.execution - a.execution).slice(0, 5).map(d => ({ name: d.name, value: d.execution, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'execution') })),
            hardHit: [...drillPerformance].sort((a, b) => b.hardHit - a.hardHit).slice(0, 5).map(d => ({ name: d.name, value: d.hardHit, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'hardHit') })),
            contact: [...drillPerformance].sort((a, b) => b.contact - a.contact).slice(0, 5).map(d => ({ name: d.name, value: d.contact, topPlayers: getTopPlayersForFilter((s, sess) => sess.drillId === drills.find(dr => dr.name === d.name)?.id, 'contact') })),
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
            byZone: calculateBreakdownData(byZone, (entryName, set) => set.targetZones?.includes(entryName as TargetZone) ?? false).map(d => ({ ...d, zone: d.name as TargetZone })),
        };

        return { performanceOverTimeData, drillSuccessData, drillEffectiveness, teamBreakdowns };
    }, [sessions, drills, players, performanceOverTimeData, drillSuccessData]);

    const teamPitchingAnalyticsData = usePitchingAnalytics(teamPitchingSessions, players);

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
            <CreateButton
                onClick={() => setIsCreateDrillModalOpen(true)}
                label="Create Drill"
            />
        ),
    }[currentView];

    return (
        <>
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
                    <div className="mb-6 rounded-lg border border-muted/50 bg-muted/50 px-4 py-3 text-sm text-foreground flex items-center gap-3">
                        <Spinner />
                        <div>
                            <p className="font-semibold">Welcome back!</p>
                            <p className="text-xs text-muted-foreground">Pulling up your team dashboard so you can invite players and log sessions.</p>
                        </div>
                    </div>
                )}
                {databaseStatus === 'error' && (
                    <EmptyState
                        title="Connection Error"
                        message={databaseError ?? 'Unable to reach the database. Please refresh or check your connection.'}
                        icon="⚠️"
                        actionLabel="Retry"
                        onAction={() => window.location.reload()}
                    />
                )}
                {currentView === 'dashboard' && (
                    <div className="space-y-6">
                        <CoachDashboard
                            players={players}
                            drills={drills}
                            sessions={sessions}
                            pitchingSessions={teamPitchingSessions}
                            teamGoals={teamGoals}
                            onInviteClick={() => setIsInviteModalOpen(true)}
                            onSelectSession={setSelectedSession}
                            loading={teamLoading}
                        />
                        {/* Pitching dashboard components have been simplified - detailed analytics available in Analytics tab */}
                    </div>
                )}
                {currentView === 'players' && (
                    selectedPlayer ? (
                        <PlayerDetail
                            player={selectedPlayer}
                            sessions={sessionsByPlayer[selectedPlayer.id] || []}
                            drills={drills}
                            goals={getGoalsForPlayer(selectedPlayer.id)}
                            onBack={() => setSelectedPlayer(null)}
                            onAssignGoal={(goalData) => handleAssignGoal(selectedPlayer.id, goalData)}
                            onAddFeedback={handleAddQuickFeedback}
                            getAllPitchSessionsForPlayer={getAllPitchSessionsForPlayer}
                        />
                    ) : (
                        <PlayerList
                            players={players}
                            sessionsByPlayer={sessionsByPlayer}
                            onPlayerClick={setSelectedPlayer}
                            onAssignGoal={(playerId) => {
                                setGoalModalPlayerId(playerId);
                                setGoalStatus('Active');
                            }}
                            selectedGradYear={selectedGradYear}
                            setSelectedGradYear={setSelectedGradYear}
                            loading={teamLoading}
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
                        <PitchingProgramsSection />
                        <TeamGoalTemplatesPanel
                            sessions={sessions}
                            drills={drills}
                            pendingTemplateId={pendingGoalTemplateId}
                            onApply={handleApplyTeamGoalTemplate}
                            disabled={!activeTeam}
                        />
                        <TeamGoalsOverview teamGoals={teamGoals} sessions={sessions} drills={drills} onDelete={handleDeleteTeamGoalInline} loading={teamLoading} />
                    </div>
                )}
                {currentView === 'analytics' && (
                    teamAnalyticsData ? (
                        <CoachAnalyticsPage analyticsData={teamAnalyticsData} pitchingData={teamPitchingAnalyticsData} />
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
                {
                    currentView === 'insights' && (
                        <TeamInsightsTab
                            players={players}
                            sessions={sessions}
                            drills={drills}
                            teamGoals={teamGoals}
                            teamId={activeTeam?.id || ''}
                        />
                    )
                }
                {
                    currentView === 'reports' && activeTeam && (
                        <ReportsPage
                            team={activeTeam}
                            players={players}
                        />
                    )
                }
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
            </Dashboard >
            {goalModalPlayerId && activeTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Assign Personal Goal</h2>
                                <p className="text-sm text-muted-foreground">
                                    {goalModalPlayer ? `Goal for ${goalModalPlayer.name}` : 'Select a player to assign a goal.'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleCloseGoalModal()}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Metric</label>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={goalMetric}
                                onChange={(event) => setGoalMetric(event.target.value as GoalType)}
                                disabled={goalSaving}
                            >
                                {GOAL_TYPES.map((metric) => (
                                    <option key={metric} value={metric}>
                                        {metric}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Target Value</label>
                            <input
                                type="number"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={goalTargetValue}
                                onChange={(event) => setGoalTargetValue(Number(event.target.value))}
                                disabled={goalSaving}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={goalStartDate}
                                    onChange={(event) => setGoalStartDate(event.target.value)}
                                    disabled={goalSaving}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Target Date</label>
                                <input
                                    type="date"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={goalTargetDate}
                                    onChange={(event) => setGoalTargetDate(event.target.value)}
                                    disabled={goalSaving}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={goalStatus}
                                onChange={(event) => setGoalStatus(event.target.value as 'Active' | 'Completed' | 'Archived')}
                                disabled={goalSaving}
                            >
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Drill Emphasis (Optional)</label>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={goalDrillType ?? ''}
                                onChange={(event) => {
                                    const { value } = event.target;
                                    setGoalDrillType(value ? (value as DrillType) : undefined);
                                }}
                                disabled={goalSaving}
                            >
                                <option value="">No specific drill</option>
                                {DRILL_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {goalError && <p className="text-sm text-destructive">{goalError}</p>}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="text-sm text-muted-foreground hover:text-foreground"
                                onClick={() => handleCloseGoalModal()}
                                disabled={goalSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
                                onClick={handleSaveCoachGoal}
                                disabled={goalSaving}
                            >
                                {goalSaving ? 'Saving…' : 'Save Goal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {
                selectedSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <SessionDetail
                                session={selectedSession}
                                isCoach={true}
                                onClose={() => {
                                    if (savingFeedback) return;
                                    setSelectedSession(null);
                                }}
                                onSaveCoachFeedback={async (feedback) => {
                                    if (!selectedSession) return;
                                    const sessionId = selectedSession.id;
                                    try {
                                        setSavingFeedback(true);
                                        await setCoachFeedbackOnSession(sessionId, feedback);
                                        setSelectedSession((prev) => (prev && prev.id === sessionId ? { ...prev, coachFeedback: feedback } : prev));
                                    } finally {
                                        setSavingFeedback(false);
                                    }
                                }}
                                isSavingCoachFeedback={savingFeedback}
                            />
                        </div>
                    </div>
                )
            }
        </>
    );
};
