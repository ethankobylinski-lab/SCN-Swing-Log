import React from 'react';
import { TeamGoalProgress } from '../utils/teamInsights';

interface TeamGoalProgressCardProps {
    data: TeamGoalProgress;
}

export const TeamGoalProgressCard: React.FC<TeamGoalProgressCardProps> = ({ data }) => {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {/* Header with Goal Name and Progress */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{data.goalName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Target: {data.targetValue} | Current: {data.currentValue}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{Math.round(data.progressPct)}%</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Complete</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-background rounded-full h-3">
                <div
                    className="bg-secondary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(data.progressPct, 100)}%` }}
                />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{data.totalReps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Reps</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{data.avgQuality}%</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Avg Quality</p>
                </div>
            </div>

            {/* Top Contributors */}
            <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-secondary">🏆</span>
                    Top Contributors
                </h4>
                {data.topContributors.length > 0 ? (
                    <div className="space-y-2">
                        {data.topContributors.map((contributor, index) => (
                            <div
                                key={contributor.playerId}
                                className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-muted-foreground w-6">
                                        #{index + 1}
                                    </span>
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
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No contributors yet
                    </p>
                )}
            </div>

            {/* Low Engagement */}
            {data.lowEngagement.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="text-warning">⚠️</span>
                        Needs Engagement
                    </h4>
                    <div className="space-y-2">
                        {data.lowEngagement.slice(0, 3).map(player => (
                            <div
                                key={player.playerId}
                                className="flex items-center justify-between bg-warning/10 border border-warning/30 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium text-foreground">
                                    {player.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {player.daysInactive === 999
                                        ? 'No sessions logged'
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
