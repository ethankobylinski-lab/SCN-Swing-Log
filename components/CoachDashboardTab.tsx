import React, { useMemo } from 'react';
import { Player, Session, PitchSession, TeamGoal } from '../types';
import { Button } from './Button';
import { useTeamColor } from '../hooks/useTeamColor';
import {
    getTeamHealthScore,
    getPlayersNeedingAttention,
    getParticipationTrendData,
    getTierDisplayInfo
} from '../utils/engagementHelpers';

interface CoachDashboardTabProps {
    players: Player[];
    sessions: Session[];
    pitchSessions: PitchSession[];
    teamGoals: TeamGoal[];
    onNavigateToTab: (tab: 'team' | 'hitting' | 'pitching') => void;
    dateRange?: number; // days to look back, default 7
}

export const CoachDashboardTab: React.FC<CoachDashboardTabProps> = ({
    players,
    sessions,
    pitchSessions,
    teamGoals,
    onNavigateToTab,
    dateRange = 7,
}) => {
    const teamColor = useTeamColor();

    const stats = useMemo(() => {
        const lookbackDate = new Date(Date.now() - dateRange * 86400000);

        const recentHittingSessions = sessions.filter(s => new Date(s.date) > lookbackDate);
        const recentPitchingSessions = pitchSessions.filter(s => new Date(s.date) > lookbackDate);

        const activePlayerIds = new Set([
            ...recentHittingSessions.map(s => s.playerId),
            ...recentPitchingSessions.map(s => s.pitcherId),
        ]);

        const activeGoals = teamGoals.filter(g => g.status === 'Active');

        return {
            hittingSessions: recentHittingSessions.length,
            pitchingSessions: recentPitchingSessions.length,
            activeGoalsCount: activeGoals.length,
            playersWithActivity: activePlayerIds.size,
        };
    }, [sessions, pitchSessions, teamGoals, dateRange]);

    // Engagement analytics
    const teamHealthScore = useMemo(() =>
        getTeamHealthScore(players, sessions, pitchSessions),
        [players, sessions, pitchSessions]
    );

    const playersNeedingAttention = useMemo(() =>
        getPlayersNeedingAttention(players, sessions, pitchSessions, 5),
        [players, sessions, pitchSessions]
    );

    const participationTrend = useMemo(() =>
        getParticipationTrendData(sessions, pitchSessions, 7),
        [sessions, pitchSessions]
    );

    // Calculate health status color
    const getHealthColor = (score: number) => {
        if (score >= 70) return '#22c55e'; // Green
        if (score >= 40) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const healthColor = getHealthColor(teamHealthScore);

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Team Color Accent */}
            <div className="relative">
                <div
                    className="absolute top-0 left-0 h-1 w-24 rounded-full"
                    style={{ backgroundColor: teamColor.primaryColor }}
                />
                <div className="pt-3">
                    <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Quick snapshot of your team's recent activity</p>
                </div>
                {/* Subtle baseball diamond pattern */}
                <div className="absolute -top-8 -right-8 w-32 h-32 opacity-[0.03] pointer-events-none">
                    <svg viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 10 L90 50 L50 90 L10 50 Z" />
                    </svg>
                </div>
            </div>

            {/* Stats Cards with Team Color Accents */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    className="bg-card border rounded-xl p-6 shadow-sm relative overflow-hidden"
                    style={{ borderColor: teamColor.borderColor }}
                >
                    <div
                        className="absolute top-0 right-0 w-20 h-20 opacity-5 pointer-events-none"
                        style={{ color: teamColor.primaryColor }}
                    >
                        ⚾️
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hitting Sessions</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: teamColor.textColor }}>{stats.hittingSessions}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last {dateRange} days</p>
                </div>

                <div
                    className="bg-card border rounded-xl p-6 shadow-sm relative overflow-hidden"
                    style={{ borderColor: teamColor.borderColor }}
                >
                    <div
                        className="absolute top-0 right-0 w-20 h-20 opacity-5 pointer-events-none"
                        style={{ color: teamColor.primaryColor }}
                    >
                        🎯
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pitching Sessions</p>
                    <p className="text-4xl font-bold text-secondary mt-2">{stats.pitchingSessions}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last {dateRange} days</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Goals</p>
                    <p className="text-4xl font-bold text-foreground mt-2">{stats.activeGoalsCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Team goals</p>
                </div>

                <div
                    className="bg-gradient-to-br from-card to-card border rounded-xl p-6 shadow-sm relative"
                    style={{
                        borderColor: teamColor.borderColor,
                        backgroundImage: `linear-gradient(135deg, ${teamColor.lightAccent} 0%, transparent 100%)`
                    }}
                >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Players</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: teamColor.textColor }}>{stats.playersWithActivity}</p>
                    <p className="text-xs text-muted-foreground mt-1">With recent activity</p>
                </div>
            </div>

            {/* NEW: Team Health & Engagement Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team Health Indicator */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Team Health</h3>
                            <p className="text-sm text-muted-foreground">Players active in last 3 days</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold" style={{ color: healthColor }}>
                                {teamHealthScore}%
                            </p>
                        </div>
                    </div>

                    {/* Health Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${teamHealthScore}%`,
                                backgroundColor: healthColor
                            }}
                        />
                    </div>

                    {/* Health Status Message */}
                    <div className="mt-4 text-sm">
                        {teamHealthScore >= 70 && (
                            <p className="text-success">🎉 Great engagement! Team is very active.</p>
                        )}
                        {teamHealthScore >= 40 && teamHealthScore < 70 && (
                            <p className="text-warning">⚠️ Moderate engagement. Some players need encouragement.</p>
                        )}
                        {teamHealthScore < 40 && (
                            <p className="text-destructive">🚨 Low engagement. Many players need attention.</p>
                        )}
                    </div>

                    {/* Participation Trend Sparkline */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            7-Day Trend
                        </p>
                        <div className="flex items-end gap-1 h-12">
                            {participationTrend.map((day, idx) => {
                                const maxSessions = Math.max(...participationTrend.map(d => d.sessionCount), 1);
                                const heightPct = (day.sessionCount / maxSessions) * 100;

                                return (
                                    <div
                                        key={day.date}
                                        className="flex-1 group relative"
                                        title={`${day.label}: ${day.sessionCount} sessions`}
                                    >
                                        <div
                                            className="w-full rounded-t transition-all"
                                            style={{
                                                height: `${Math.max(heightPct, 5)}%`,
                                                backgroundColor: day.sessionCount > 0 ? teamColor.primaryColor : '#e5e7eb',
                                                opacity: day.sessionCount > 0 ? 0.8 : 0.3
                                            }}
                                        />
                                        <p className="text-[8px] text-muted-foreground text-center mt-1">
                                            {day.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Players Needing Attention */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Needs Attention</h3>
                            <p className="text-sm text-muted-foreground">Players who haven't recorded recently</p>
                        </div>
                    </div>

                    {playersNeedingAttention.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {playersNeedingAttention.map((player) => {
                                const tierInfo = getTierDisplayInfo(player.tier);

                                return (
                                    <div
                                        key={player.playerId}
                                        className="flex items-center justify-between gap-3 p-3 rounded-lg"
                                        style={{
                                            backgroundColor: tierInfo.bgColor,
                                            borderColor: tierInfo.borderColor,
                                            borderWidth: '1px'
                                        }}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg flex-shrink-0">{tierInfo.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground text-sm truncate">
                                                    {player.playerName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {player.tier === 'never-recorded'
                                                        ? 'Never recorded'
                                                        : player.daysSinceLastActivity === 0
                                                            ? 'Active today'
                                                            : `${player.daysSinceLastActivity} days ago`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className="text-xs px-2 py-1 rounded font-bold uppercase"
                                            style={{
                                                backgroundColor: tierInfo.color,
                                                color: 'white'
                                            }}
                                        >
                                            {tierInfo.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <p className="text-2xl mb-2">✅</p>
                            <p className="text-sm font-semibold text-success">All players are active!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Everyone has recorded within the last 3 days
                            </p>
                        </div>
                    )}

                    {playersNeedingAttention.length > 0 && (
                        <button
                            onClick={() => onNavigateToTab('team')}
                            className="mt-4 w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                            View All Players →
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                        onClick={() => onNavigateToTab('team')}
                        variant="secondary"
                        className="justify-start gap-3 h-auto py-4"
                    >
                        <div className="text-left">
                            <p className="font-semibold">Manage Team</p>
                            <p className="text-xs text-muted-foreground">View players and activity</p>
                        </div>
                    </Button>

                    <Button
                        onClick={() => onNavigateToTab('hitting')}
                        variant="secondary"
                        className="justify-start gap-3 h-auto py-4"
                    >
                        <div className="text-left">
                            <p className="font-semibold">Hitting Overview</p>
                            <p className="text-xs text-muted-foreground">Analytics & prescription</p>
                        </div>
                    </Button>

                    <Button
                        onClick={() => onNavigateToTab('pitching')}
                        variant="secondary"
                        className="justify-start gap-3 h-auto py-4"
                    >
                        <div className="text-left">
                            <p className="font-semibold">Pitching Overview</p>
                            <p className="text-xs text-muted-foreground">Analytics & prescription</p>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Team Info */}
            {players.length === 0 && (
                <div
                    className="border rounded-xl p-6 text-center"
                    style={{
                        backgroundColor: teamColor.lightAccent,
                        borderColor: teamColor.borderColor
                    }}
                >
                    <p className="text-sm font-semibold text-foreground">No players yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Invite players to your team to start tracking their progress
                    </p>
                </div>
            )}
        </div>
    );
};
