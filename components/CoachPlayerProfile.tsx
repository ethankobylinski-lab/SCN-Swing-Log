import React, { useMemo } from 'react';
import { Player, Session, PitchSession, PersonalGoal } from '../types';
import { formatDate, calculateExecutionPercentage, describeRelativeDay, calculateStrikeoutPercentage } from '../utils/helpers';
import { generatePitchSessionTitle } from '../utils/sessionTitleGenerator';
import { Button } from './Button';
import { PlayerHittingZoneMap } from './analytics/PlayerHittingZoneMap';
import { PlayerHittingPitchDrillSummary } from './analytics/PlayerHittingPitchDrillSummary';
import { PlayerPitchingHeatmaps } from './analytics/PlayerPitchingHeatmaps';
import { PlayerNarrativeSummary } from './analytics/PlayerNarrativeSummary';
import { useTeamColor } from '../hooks/useTeamColor';

interface CoachPlayerProfileProps {
    player: Player;
    sessions: Session[];
    pitchSessions: PitchSession[];
    goals: PersonalGoal[];
    onSelectHittingSession: (session: Session) => void;
    onSelectPitchingSession: (session: PitchSession) => void;
    onBack: () => void;
}

export const CoachPlayerProfile: React.FC<CoachPlayerProfileProps> = ({
    player,
    sessions,
    pitchSessions,
    goals,
    onSelectHittingSession,
    onSelectPitchingSession,
    onBack,
}) => {
    const teamColor = useTeamColor();
    const hittingStats = useMemo(() => {
        const playerSessions = sessions.filter(s => s.playerId === player.id);
        const allSets = playerSessions.flatMap(s => s.sets);
        const totalSwings = allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        const totalHardHits = allSets.reduce((sum, set) => sum + (set.hardHits || 0), 0);
        const executionPct = calculateExecutionPercentage(allSets);
        const hardHitPct = totalSwings > 0 ? Math.round((totalHardHits / totalSwings) * 100) : 0;

        // Calculate trends (last 5 sessions)
        const sortedSessions = [...playerSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentSessions = sortedSessions.slice(0, 10);

        const last5Sessions = sortedSessions.slice(0, 5).reverse(); // Oldest to newest
        const trendData = last5Sessions.map(s => {
            const sessionSwings = s.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
            const sessionHardHits = s.sets.reduce((sum, set) => sum + (set.hardHits || 0), 0);
            return {
                date: formatDate(s.date, { month: 'numeric', day: 'numeric' }),
                hardHitPct: sessionSwings > 0 ? Math.round((sessionHardHits / sessionSwings) * 100) : 0
            };
        });

        return {
            sessions: playerSessions.length,
            totalSwings,
            executionPct,
            hardHitPct,
            recentSessions,
            trendData,
            allSessions: playerSessions // Pass full list for analytics
        };
    }, [sessions, player.id]);

    const pitchingStats = useMemo(() => {
        const playerPitchSessions = pitchSessions.filter(s => s.pitcherId === player.id); // Fixed: use pitcherId
        const totalPitches = playerPitchSessions.reduce((sum, s) => sum + (s.totalPitches || 0), 0);
        const totalStrikes = playerPitchSessions.reduce((sum, s) => {
            if (s.pitchRecords) {
                return sum + s.pitchRecords.filter(p =>
                    ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(p.outcome)
                ).length;
            }
            return sum;
        }, 0);
        const strikePct = totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0;

        // Calculate Pitch Mix
        const pitchTypeCounts: Record<string, number> = {};
        playerPitchSessions.forEach(s => {
            s.pitchRecords?.forEach(p => {
                if (p.pitchTypeId) {
                    pitchTypeCounts[p.pitchTypeId] = (pitchTypeCounts[p.pitchTypeId] || 0) + 1;
                }
            });
        });

        const pitchMix = Object.entries(pitchTypeCounts)
            .map(([type, count]) => ({ type, count, pct: Math.round((count / totalPitches) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); // Top 4 pitch types

        return {
            sessions: playerPitchSessions.length,
            totalPitches,
            strikePct,
            pitchMix,
            recentSessions: playerPitchSessions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10),
            allSessions: playerPitchSessions // Pass full list for analytics
        };
    }, [pitchSessions, player.id]);

    const activityStats = useMemo(() => {
        const lastHitting = hittingStats.recentSessions[0]?.date;
        const lastPitching = pitchingStats.recentSessions[0]?.date;

        let lastActiveDate = 'No activity';
        if (lastHitting || lastPitching) {
            if (!lastHitting) lastActiveDate = formatDate(lastPitching);
            else if (!lastPitching) lastActiveDate = formatDate(lastHitting);
            else lastActiveDate = formatDate(new Date(lastHitting) > new Date(lastPitching) ? lastHitting : lastPitching);
        }

        // Sessions per week (last 4 weeks)
        const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
        const recentHittingCount = sessions.filter(s => s.playerId === player.id && new Date(s.date) > fourWeeksAgo).length;
        const recentPitchingCount = pitchSessions.filter(s => s.pitcherId === player.id && new Date(s.date) > fourWeeksAgo).length;
        const avgSessionsPerWeek = Math.round(((recentHittingCount + recentPitchingCount) / 4) * 10) / 10;

        return {
            lastActiveDate,
            avgSessionsPerWeek,
            totalSessions: hittingStats.sessions + pitchingStats.sessions
        };
    }, [hittingStats, pitchingStats, sessions, pitchSessions, player.id]);

    const activeGoals = goals.filter(g => g.status === 'Active');

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Team Color Accent */}
            <div className="relative">
                <div
                    className="absolute top-0 left-0 h-1 w-32 rounded-full"
                    style={{ backgroundColor: teamColor.primaryColor }}
                />
                <div className="flex justify-between items-start pt-3">
                    <div>
                        <Button onClick={onBack} variant="ghost" size="sm" className="mb-3 pl-0 hover:bg-transparent hover:text-primary">
                            ← Back to Team
                        </Button>
                        <h1 className="text-3xl font-bold text-foreground">{player.name}</h1>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{player.profile.position || 'Player'}</span>
                            <span>•</span>
                            <span>Class of {player.profile.gradYear}</span>
                            <span>•</span>
                            <span>B/T: {player.profile.bats}/{player.profile.throws}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last Active</p>
                        <p className="font-semibold text-foreground">{activityStats.lastActiveDate}</p>
                    </div>
                </div>
            </div>

            {/* Narrative Summary */}
            <PlayerNarrativeSummary
                hittingSessions={hittingStats.allSessions}
                pitchingSessions={pitchingStats.allSessions}
            />

            {/* Activity Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consistency</p>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-foreground">{activityStats.avgSessionsPerWeek}</span>
                        <span className="text-sm text-muted-foreground ml-1">sessions/week</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Workload</p>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-foreground">{activityStats.totalSessions}</span>
                        <span className="text-sm text-muted-foreground ml-1">total sessions</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Goals</p>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-accent">{activeGoals.length}</span>
                        <span className="text-sm text-muted-foreground ml-1">in progress</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hitting Insights */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-foreground">Hitting Insights</h2>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Execution</p>
                                <p className="text-2xl font-bold text-primary">{hittingStats.executionPct}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hard Hit Rate</p>
                                <p className="text-2xl font-bold text-primary">{hittingStats.hardHitPct}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Swings</p>
                                <p className="text-2xl font-bold text-primary">{hittingStats.totalSwings}</p>
                            </div>
                        </div>

                        {/* Hitting Heatmap */}
                        <div className="border-t border-border pt-6">
                            <PlayerHittingZoneMap sessions={hittingStats.allSessions} />
                        </div>

                        {/* Recent Hitting Sessions List */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Sessions</h3>
                            {hittingStats.recentSessions.length > 0 ? (
                                <div className="space-y-2">
                                    {hittingStats.recentSessions.slice(0, 5).map(session => {
                                        const swings = session.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
                                        const hardHits = session.sets.reduce((sum, set) => sum + (set.hardHits || 0), 0);
                                        const hhPct = swings > 0 ? Math.round((hardHits / swings) * 100) : 0;

                                        return (
                                            <button
                                                key={session.id}
                                                onClick={() => onSelectHittingSession(session)}
                                                className="w-full text-left p-3 bg-muted/30 hover:bg-muted rounded-lg transition-colors flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{formatDate(session.date)}</p>
                                                    <p className="text-xs text-muted-foreground">{swings} swings</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                                                        {hhPct}% HH
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">No hitting data available.</p>
                            )}
                        </div>
                    </div>

                    {/* Pitch/Drill Summary */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <PlayerHittingPitchDrillSummary sessions={hittingStats.allSessions} />
                    </div>
                </div>

                {/* Pitching Insights */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-foreground">Pitching Insights</h2>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Strike %</p>
                                <p className="text-2xl font-bold text-secondary">{pitchingStats.strikePct}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pitches</p>
                                <p className="text-2xl font-bold text-secondary">{pitchingStats.totalPitches}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
                                <p className="text-2xl font-bold text-secondary">{pitchingStats.sessions}</p>
                            </div>
                        </div>

                        {/* Pitching Heatmaps */}
                        <div className="border-t border-border pt-6">
                            <PlayerPitchingHeatmaps sessions={pitchingStats.allSessions} />
                        </div>

                        {/* Pitch Mix */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Pitch Types</h3>
                            {pitchingStats.pitchMix.length > 0 ? (
                                <div className="space-y-2">
                                    {pitchingStats.pitchMix.map(pm => (
                                        <div key={pm.type} className="flex items-center gap-2 text-sm">
                                            <div className="w-24 truncate text-muted-foreground">{pm.type}</div>
                                            <div className="flex-1 bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-secondary h-2 rounded-full"
                                                    style={{ width: `${pm.pct}%` }}
                                                />
                                            </div>
                                            <div className="w-10 text-right font-medium">{pm.pct}%</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">Log pitch types to see breakdown.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Development Notes / Goals */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Development Focus</h2>
                    {/* Placeholder for future "Add Note" feature */}
                </div>

                {activeGoals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeGoals.map(goal => (
                            <div key={goal.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent mb-2">
                                            Active Goal
                                        </span>
                                        <h4 className="font-semibold text-foreground">{goal.metric}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Target: {goal.targetValue} {goal.metric.includes('%') ? '%' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        Due {formatDate(goal.targetDate)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-muted-foreground">No active development goals.</p>
                        <p className="text-sm text-muted-foreground mt-1">Assign goals from the Team tab to track progress here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
