import React, { useState, useMemo } from 'react';
import { Player, Session, PitchSession, PersonalGoal } from '../types';
import { CoachPlayerProfile } from './CoachPlayerProfile';
import { formatDate } from '../utils/helpers';
import { useTeamColor } from '../hooks/useTeamColor';
import { PlayerEngagementWidget } from './PlayerEngagementWidget';
import {
    getTeamEngagementDistribution,
    getPlayerEngagementTier,
    getTierDisplayInfo
} from '../utils/engagementHelpers';

interface CoachTeamTabProps {
    players: Player[];
    sessions: Session[];
    pitchSessions: PitchSession[];
    goals: PersonalGoal[];
    hittingAnalytics?: any; // CoachAnalyticsData
    pitchingAnalytics?: any; // CoachPitchingAnalyticsData
    onSelectHittingSession: (session: Session) => void;
    onSelectPitchingSession: (session: PitchSession) => void;
}

export const CoachTeamTab: React.FC<CoachTeamTabProps> = ({
    players,
    sessions,
    pitchSessions,
    goals,
    hittingAnalytics,
    pitchingAnalytics,
    onSelectHittingSession,
    onSelectPitchingSession,
}) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const teamColor = useTeamColor();

    // Calculate high-level team stats for the summary cards
    const teamStats = useMemo(() => {
        // 1. Activity in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const activePlayers = new Set<string>();

        let recentHittingSessions = 0;
        let recentSwings = 0;
        sessions.forEach(s => {
            if (new Date(s.date) > sevenDaysAgo) {
                recentHittingSessions++;
                s.sets.forEach(set => recentSwings += set.repsAttempted);
                activePlayers.add(s.playerId);
            }
        });

        let recentPitchingSessions = 0;
        let recentPitches = 0;
        pitchSessions.forEach(s => {
            if (new Date(s.date) > sevenDaysAgo) {
                recentPitchingSessions++;
                recentPitches += s.totalPitches;
                activePlayers.add(s.pitcherId);
            }
        });

        // 2. Active Goals
        const activeGoalsCount = goals.filter(g => g.status === 'Active').length;

        // 3. Top Performers (from analytics props or fallback)
        // Hitting: Top 3 by Execution % (if available)
        const topHitters = hittingAnalytics?.drillSuccessData
            ? hittingAnalytics.drillSuccessData
                .map((d: any) => ({ name: d.name, value: d.successRate }))
                .sort((a: any, b: any) => b.value - a.value)
                .slice(0, 3)
            : [];

        // Pitching: Top 3 by Velocity (from analytics props)
        const topPitchers = pitchingAnalytics?.topPerformers?.velocity || [];

        return {
            recentHittingSessions,
            recentSwings,
            recentPitchingSessions,
            recentPitches,
            activePlayersCount: activePlayers.size,
            activeGoalsCount,
            topHitters,
            topPitchers
        };
    }, [sessions, pitchSessions, goals, hittingAnalytics, pitchingAnalytics]);

    // NEW: Engagement distribution
    const engagementDistribution = useMemo(() =>
        getTeamEngagementDistribution(players, sessions, pitchSessions),
        [players, sessions, pitchSessions]
    );

    const playerStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return players.map(player => {
            const playerHittingSessions = sessions.filter(s => s.playerId === player.id);
            const playerPitchingSessions = pitchSessions.filter(s => s.pitcherId === player.id);

            const lastHittingSession = playerHittingSessions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const lastPitchingSession = playerPitchingSessions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            // Determine if player is active today
            const hasActivityToday = [
                ...playerHittingSessions,
                ...playerPitchingSessions
            ].some(s => {
                const sessionDate = new Date(s.date);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === today.getTime();
            });

            // NEW: Get engagement tier
            const engagementTier = getPlayerEngagementTier(player.id, sessions, pitchSessions);
            const tierInfo = getTierDisplayInfo(engagementTier);

            return {
                player,
                hittingSessionsCount: playerHittingSessions.length,
                pitchingSessionsCount: playerPitchingSessions.length,
                lastActivity: lastHittingSession || lastPitchingSession
                    ? formatDate((lastHittingSession?.date && lastPitchingSession?.date
                        ? (new Date(lastHittingSession.date) > new Date(lastPitchingSession.date)
                            ? lastHittingSession.date
                            : lastPitchingSession.date)
                        : lastHittingSession?.date || lastPitchingSession?.date) || '')
                    : 'No activity',
                isActiveToday: hasActivityToday,
                engagementTier,
                tierInfo,
            };
        });
    }, [players, sessions, pitchSessions]);

    if (selectedPlayerId) {
        const selectedPlayer = players.find(p => p.id === selectedPlayerId);
        if (selectedPlayer) {
            const playerGoals = goals.filter(g => g.playerId === selectedPlayerId);
            return (
                <CoachPlayerProfile
                    player={selectedPlayer}
                    sessions={sessions}
                    pitchSessions={pitchSessions}
                    goals={playerGoals}
                    onSelectHittingSession={onSelectHittingSession}
                    onSelectPitchingSession={onSelectPitchingSession}
                    onBack={() => setSelectedPlayerId(null)}
                />
            );
        }
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Team Color */}
            <div className="relative">
                <div
                    className="absolute top-0 left-0 h-1 w-24 rounded-full"
                    style={{ backgroundColor: teamColor.primaryColor }}
                />
                <div className="pt-3">
                    <h1 className="text-3xl font-bold text-foreground">Team</h1>
                    <p className="text-muted-foreground mt-1">Manage your players and view their progress</p>
                </div>
            </div>

            {/* Team Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Hitting Stats */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hitting (7d)</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{teamStats.recentHittingSessions}</p>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{teamStats.recentSwings}</p>
                            <p className="text-xs text-muted-foreground">Swings</p>
                        </div>
                    </div>
                </div>

                {/* Pitching Stats */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pitching (7d)</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{teamStats.recentPitchingSessions}</p>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-secondary">{teamStats.recentPitches}</p>
                            <p className="text-xs text-muted-foreground">Pitches</p>
                        </div>
                    </div>
                </div>

                {/* Activity Stats */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{teamStats.activePlayersCount}</p>
                            <p className="text-xs text-muted-foreground">Active Players (7d)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-accent">{teamStats.activeGoalsCount}</p>
                            <p className="text-xs text-muted-foreground">Active Goals</p>
                        </div>
                    </div>
                </div>

                {/* Top Performers Summary */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Performers</p>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Top Hitter:</span>
                            <span className="font-medium text-foreground">
                                {teamStats.topHitters[0]?.name || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Top Pitcher:</span>
                            <span className="font-medium text-foreground">
                                {teamStats.topPitchers[0]?.name || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* NEW: Engagement Distribution */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                                <span>🟢</span>
                                <span className="text-muted-foreground">Active</span>
                            </div>
                            <span className="font-bold text-foreground">{engagementDistribution.active}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                                <span>🟡</span>
                                <span className="text-muted-foreground">At Risk</span>
                            </div>
                            <span className="font-bold text-foreground">{engagementDistribution.atRisk}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                                <span>🔴</span>
                                <span className="text-muted-foreground">Inactive</span>
                            </div>
                            <span className="font-bold text-foreground">{engagementDistribution.inactive}</span>
                        </div>
                        {engagementDistribution.neverRecorded > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1">
                                    <span>⚪</span>
                                    <span className="text-muted-foreground">Never</span>
                                </div>
                                <span className="font-bold text-foreground">{engagementDistribution.neverRecorded}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW: Detailed Engagement Widget (Collapsible) */}
            <div>
                <details className="group">
                    <summary className="cursor-pointer list-none">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-foreground">Detailed Engagement Tracker</h2>
                                <span className="text-sm text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                            </div>
                        </div>
                    </summary>
                    <div className="mt-4">
                        <PlayerEngagementWidget
                            players={players}
                            sessions={sessions}
                            pitchSessions={pitchSessions}
                            onPlayerClick={(playerId) => setSelectedPlayerId(playerId)}
                        />
                    </div>
                </details>
            </div>

            {/* Player List */}
            {playerStats.length > 0 ? (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">Players</h2>
                        <p className="text-sm text-muted-foreground">{playerStats.length} player{playerStats.length !== 1 ? 's' : ''} on team</p>
                    </div>
                    <div className="divide-y divide-border">
                        {playerStats.map(({ player, hittingSessionsCount, pitchingSessionsCount, lastActivity, isActiveToday, engagementTier, tierInfo }) => (
                            <button
                                key={player.id}
                                onClick={() => setSelectedPlayerId(player.id)}
                                className="w-full p-4 hover:bg-muted transition-colors text-left"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-foreground">{player.name}</p>
                                            {/* Engagement Tier Badge */}
                                            <span
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                                style={{
                                                    backgroundColor: tierInfo.bgColor,
                                                    color: tierInfo.color,
                                                    borderColor: tierInfo.borderColor,
                                                    borderWidth: '1px'
                                                }}
                                            >
                                                <span className="text-xs">{tierInfo.icon}</span>
                                                {tierInfo.label}
                                            </span>
                                            {isActiveToday && (
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                                    style={{
                                                        backgroundColor: teamColor.lightAccent,
                                                        color: teamColor.textColor,
                                                        borderColor: teamColor.borderColor,
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamColor.primaryColor }} />
                                                    Active Today
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-1">
                                            <span className="text-xs text-muted-foreground">
                                                ⚾️ {hittingSessionsCount} hitting
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                🎯 {pitchingSessionsCount} pitching
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Last: {lastActivity}
                                        </p>
                                    </div>
                                    <span className="text-primary text-sm ml-4">View →</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
                    <p className="text-lg font-semibold text-foreground">No players yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Invite players to your team to start tracking their progress
                    </p>
                </div>
            )}
        </div>
    );
};
