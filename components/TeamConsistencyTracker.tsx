import React from 'react';
import { ConsistencyData } from '../utils/teamInsights';

interface TeamConsistencyTrackerProps {
    data: ConsistencyData;
}

export const TeamConsistencyTracker: React.FC<TeamConsistencyTrackerProps> = ({ data }) => {
    // Find max session count for scaling
    const maxSessions = Math.max(...data.weeklyData.map(d => d.sessionCount), 1);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {/* Weekly Summary */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Last 7 Days</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Team training consistency tracker
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{data.totalWeeklySessions}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Sessions</p>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="space-y-3">
                {data.weeklyData.map(day => {
                    const barHeight = maxSessions > 0
                        ? (day.sessionCount / maxSessions) * 100
                        : 0;

                    return (
                        <div key={day.date} className="flex items-center gap-3">
                            <div className="w-12 text-sm font-medium text-muted-foreground">
                                {day.day}
                            </div>
                            <div className="flex-1 bg-muted/30 rounded-full h-8 relative overflow-hidden">
                                <div
                                    className="bg-secondary h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                                    style={{ width: `${barHeight}%` }}
                                >
                                    {day.sessionCount > 0 && (
                                        <span className="text-xs font-bold text-secondary-foreground">
                                            {day.sessionCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="w-16 text-xs text-muted-foreground text-right">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Inactive Players */}
            {data.inactivePlayers.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="text-warning">⏰</span>
                        Inactive Players (7+ Days)
                    </h4>
                    <div className="space-y-2">
                        {data.inactivePlayers.slice(0, 5).map(player => (
                            <div
                                key={player.playerId}
                                className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium text-foreground">
                                    {player.name}
                                </span>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        {player.daysAgo === 999
                                            ? 'Never logged'
                                            : `${player.daysAgo} days ago`}
                                    </p>
                                    {player.lastActive !== 'Never' && (
                                        <p className="text-[10px] text-muted-foreground">
                                            Last: {player.lastActive}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.inactivePlayers.length === 0 && (
                <div className="border-t border-border pt-4 mt-4">
                    <p className="text-sm text-success text-center py-2">
                        ✅ All players are active!
                    </p>
                </div>
            )}
        </div>
    );
};
