import React from 'react';
import { TeamGoalProgress } from '../utils/teamInsights';

interface TeamGoalProgressCardProps {
    data: TeamGoalProgress;
}

export const TeamGoalProgressCard: React.FC<TeamGoalProgressCardProps> = ({ data }) => {
    const participationPct = data.totalPlayers > 0
        ? Math.round((data.contributingPlayers / data.totalPlayers) * 100)
        : 0;

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6 transition-all duration-300 hover:shadow-md hover:border-border/80 group">
            {/* Header with Goal Name and Progress */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{data.goalName}</h3>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Target: <span className="text-foreground">{data.targetValue}</span> • Current: <span className="text-foreground">{data.currentValue}</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/70">
                        {Math.round(data.progressPct)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">Complete</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted/50 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{
                        width: `${Math.min(data.progressPct, 100)}%`,
                        background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)'
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-xl p-3 text-center border border-transparent hover:border-border/50 transition-colors">
                    <p className="text-2xl font-bold text-foreground">{data.totalReps.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Total Reps</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 text-center border border-transparent hover:border-border/50 transition-colors">
                    <p className="text-2xl font-bold text-primary">{data.avgQuality}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Avg Quality</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 text-center border border-transparent hover:border-border/50 transition-colors">
                    <p className="text-2xl font-bold text-secondary">{data.contributingPlayers}<span className="text-muted-foreground text-lg font-medium">/{data.totalPlayers}</span></p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Contributing</p>
                </div>
            </div>

            {/* Participation Alert */}
            {participationPct < 70 && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm font-medium text-warning-foreground">
                        Only <span className="font-bold">{participationPct}%</span> team participation - Time to rally the squad!
                    </p>
                </div>
            )}

            {/* Top Contributors */}
            <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="text-secondary text-sm">🏆</span>
                    Top Contributors
                </h4>
                {data.topContributors.length > 0 ? (
                    <div className="space-y-2">
                        {data.topContributors.map((contributor, index) => (
                            <div
                                key={contributor.playerId}
                                className="flex items-center justify-between bg-muted/20 hover:bg-muted/40 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-border/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                                            index === 1 ? 'bg-slate-400/20 text-slate-600' :
                                                index === 2 ? 'bg-orange-700/20 text-orange-800' : 'bg-muted text-muted-foreground'}
                                    `}>
                                        {index + 1}
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        {contributor.name}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-secondary">
                                    {contributor.value} reps
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 italic bg-muted/10 rounded-lg">
                        No contributors yet
                    </p>
                )}
            </div>

            {/* Non-Contributors */}
            {data.nonContributors.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="text-destructive text-sm">🔴</span>
                        Not Contributing Yet ({data.nonContributors.length})
                    </h4>
                    <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3">
                        <div className="flex flex-wrap gap-2">
                            {data.nonContributors.map(player => (
                                <span
                                    key={player.playerId}
                                    className="px-2 py-1 bg-background border border-border/50 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-default"
                                >
                                    {player.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Low Engagement */}
            {data.lowEngagement.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="text-warning text-sm">⚠️</span>
                        Needs Engagement
                    </h4>
                    <div className="space-y-2">
                        {data.lowEngagement.slice(0, 3).map(player => (
                            <div
                                key={player.playerId}
                                className="flex items-center justify-between bg-warning/5 border border-warning/20 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium text-foreground">
                                    {player.name}
                                </span>
                                <span className="text-xs font-medium text-warning-foreground/80 bg-warning/10 px-2 py-0.5 rounded-full">
                                    {player.daysInactive === 999
                                        ? 'No sessions'
                                        : `${player.daysInactive} days inactive`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
