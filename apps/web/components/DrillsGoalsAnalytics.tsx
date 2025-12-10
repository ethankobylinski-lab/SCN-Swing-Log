import React, { useMemo, useState } from 'react';
import { Player, TeamGoal, Session, Drill, PitchSimulationTemplate } from '../types';
import { getCurrentTeamMetricValue, calculateExecutionPercentage, calculateHardHitPercentage, calculateStrikeoutPercentage, formatTeamGoalName } from '../utils/helpers';

interface DrillsGoalsAnalyticsProps {
    players: Player[];
    teamGoals: TeamGoal[];
    sessions: Session[];
    drills: Drill[];
    assignedPrograms?: (PitchSimulationTemplate & { completionCount?: number })[];
}

export const DrillsGoalsAnalytics: React.FC<DrillsGoalsAnalyticsProps> = ({
    players,
    teamGoals,
    sessions,
    drills,
    assignedPrograms = []
}) => {
    const [expandedDrill, setExpandedDrill] = useState<string | null>(null);
    const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

    // Calculate player contributions to team goals
    const goalContributions = useMemo(() => {
        if (teamGoals.length === 0 || players.length === 0) return [];

        const contributions = players.map(player => {
            const playerSessions = sessions.filter(s => s.playerId === player.id);

            let totalContribution = 0;
            teamGoals.forEach(goal => {
                const playerValue = getCurrentTeamMetricValue(goal, playerSessions, drills);
                totalContribution += playerValue;
            });

            return {
                playerId: player.id,
                playerName: player.name,
                contribution: Math.round(totalContribution),
                sessionCount: playerSessions.length
            };
        });

        return contributions
            .filter(c => c.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, 5);
    }, [players, teamGoals, sessions, drills]);

    // Detailed goal contributions by goal
    const goalDetails = useMemo(() => {
        return teamGoals.map(goal => {
            const playerStats = players.map(player => {
                const playerSessions = sessions.filter(s => s.playerId === player.id);
                const playerValue = getCurrentTeamMetricValue(goal, playerSessions, drills);

                if (playerValue === 0) return null;

                const playerSets = playerSessions.flatMap(s => s.sets);
                const executionPct = calculateExecutionPercentage(playerSets);
                const hardHitPct = calculateHardHitPercentage(playerSets);

                return {
                    playerId: player.id,
                    playerName: player.name,
                    contribution: Math.round(playerValue),
                    sessionCount: playerSessions.length,
                    executionPct,
                    hardHitPct
                };
            }).filter((stat): stat is NonNullable<typeof stat> => stat !== null)
                .sort((a, b) => b.contribution - a.contribution);

            return {
                goal,
                playerStats,
                totalContribution: getCurrentTeamMetricValue(goal, sessions, drills)
            };
        }).filter(g => g.playerStats.length > 0);
    }, [teamGoals, players, sessions, drills]);

    const drillCompletions = useMemo(() => {
        const completionMap = new Map<string, { playerId: string; playerName: string; drillsCompleted: number }>();

        sessions.forEach(session => {
            if (session.drillId) {
                const player = players.find(p => p.id === session.playerId);
                if (player) {
                    const key = player.id;
                    if (!completionMap.has(key)) {
                        completionMap.set(key, {
                            playerId: player.id,
                            playerName: player.name,
                            drillsCompleted: 0
                        });
                    }
                    completionMap.get(key)!.drillsCompleted++;
                }
            }
        });

        return Array.from(completionMap.values())
            .sort((a, b) => b.drillsCompleted - a.drillsCompleted)
            .slice(0, 5);
    }, [players, sessions]);

    const drillDetails = useMemo(() => {
        const details = drills.map(drill => {
            const drillSessions = sessions.filter(s => s.drillId === drill.id);

            const playerPerformance = new Map<string, { sessions: Session[]; sets: any[] }>();

            drillSessions.forEach(session => {
                if (!playerPerformance.has(session.playerId)) {
                    playerPerformance.set(session.playerId, { sessions: [], sets: [] });
                }
                const perf = playerPerformance.get(session.playerId)!;
                perf.sessions.push(session);
                perf.sets.push(...session.sets);
            });

            const playerStats = Array.from(playerPerformance.entries()).map(([playerId, data]) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;

                const executionPct = calculateExecutionPercentage(data.sets);
                const hardHitPct = calculateHardHitPercentage(data.sets);
                const strikeoutPct = calculateStrikeoutPercentage(data.sets);
                const totalReps = data.sets.reduce((sum, set) => sum + (set.repsAttempted || 0), 0);

                return {
                    playerId,
                    playerName: player.name,
                    completions: data.sessions.length,
                    executionPct,
                    hardHitPct,
                    strikeoutPct,
                    totalReps
                };
            }).filter((stat): stat is NonNullable<typeof stat> => stat !== null);

            return {
                drill,
                totalCompletions: drillSessions.length,
                uniquePlayers: playerPerformance.size,
                playerStats: playerStats.sort((a, b) => b.completions - a.completions)
            };
        }).filter(d => d.totalCompletions > 0)
            .sort((a, b) => b.totalCompletions - a.totalCompletions);

        return details;
    }, [drills, sessions, players]);

    const programCompletions = useMemo(() => {
        return [];
    }, [assignedPrograms]);

    return (
        <div className="space-y-6 mb-6">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Quick Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Team Goal Contributors */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Goal Contributors</h3>
                        {goalContributions.length > 0 ? (
                            <div className="space-y-2">
                                {goalContributions.map((contrib, index) => (
                                    <div key={contrib.playerId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                            <span className="text-foreground">{contrib.playerName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{contrib.sessionCount} sessions</span>
                                            <span className="font-bold text-primary">{contrib.contribution}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No goal activity yet</p>
                        )}
                    </div>

                    {/* Drill Completions */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Most Active in Drills</h3>
                        {drillCompletions.length > 0 ? (
                            <div className="space-y-2">
                                {drillCompletions.map((comp, index) => (
                                    <div key={comp.playerId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                            <span className="text-foreground">{comp.playerName}</span>
                                        </div>
                                        <span className="font-bold text-primary">{comp.drillsCompleted} drills</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No drill activity yet</p>
                        )}
                    </div>

                    {/* Program Completions */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Program Completions</h3>
                        {programCompletions.length > 0 ? (
                            <div className="space-y-2">
                                {programCompletions.map((comp: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                            <span className="text-foreground">{comp.playerName}</span>
                                        </div>
                                        <span className="font-bold text-primary">{comp.completions} completed</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No program activity yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Goal Contributions */}
            {goalDetails.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Team Goal Contributions</h2>
                    <div className="space-y-3">
                        {goalDetails.map(detail => (
                            <div key={detail.goal.id} className="bg-card border border-border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedGoal(expandedGoal === detail.goal.id ? null : detail.goal.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                                >
                                    <div>
                                        <h3 className="font-semibold text-foreground">{detail.goal.description}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formatTeamGoalName(detail.goal)} • {detail.playerStats.length} player{detail.playerStats.length !== 1 ? 's' : ''} contributing • Total: {Math.round(detail.totalContribution)}
                                        </p>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-muted-foreground transition-transform ${expandedGoal === detail.goal.id ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {expandedGoal === detail.goal.id && (
                                    <div className="px-4 pb-4 border-t border-border">
                                        <div className="mt-3 space-y-2">
                                            {detail.playerStats.map(stat => (
                                                <div key={stat.playerId} className="bg-muted/20 rounded-lg p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-semibold text-foreground">{stat.playerName}</span>
                                                        <span className="text-xs text-muted-foreground">{stat.sessionCount} session{stat.sessionCount !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Contribution</div>
                                                            <div className="font-bold text-primary">{stat.contribution}</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Execution</div>
                                                            <div className="font-bold text-primary">{stat.executionPct}%</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Hard Hit</div>
                                                            <div className="font-bold text-primary">{stat.hardHitPct}%</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Drill Completions */}
            {drillDetails.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Drill Completion Details</h2>
                    <div className="space-y-3">
                        {drillDetails.map(detail => (
                            <div key={detail.drill.id} className="bg-card border border-border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedDrill(expandedDrill === detail.drill.id ? null : detail.drill.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                                >
                                    <div>
                                        <h3 className="font-semibold text-foreground">{detail.drill.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {detail.uniquePlayers} player{detail.uniquePlayers !== 1 ? 's' : ''} • {detail.totalCompletions} completion{detail.totalCompletions !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-muted-foreground transition-transform ${expandedDrill === detail.drill.id ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {expandedDrill === detail.drill.id && (
                                    <div className="px-4 pb-4 border-t border-border">
                                        <div className="mt-3 space-y-2">
                                            {detail.playerStats.map(stat => (
                                                <div key={stat.playerId} className="bg-muted/20 rounded-lg p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-semibold text-foreground">{stat.playerName}</span>
                                                        <span className="text-xs text-muted-foreground">{stat.completions} session{stat.completions !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Execution</div>
                                                            <div className="font-bold text-primary">{stat.executionPct}%</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Hard Hit</div>
                                                            <div className="font-bold text-primary">{stat.hardHitPct}%</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">K Rate</div>
                                                            <div className="font-bold text-primary">{stat.strikeoutPct}%</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-muted-foreground">Total Reps</div>
                                                            <div className="font-bold text-primary">{stat.totalReps}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
