import React, { useMemo } from 'react';
import { Session, Player } from '../types';
import { formatDate } from '../utils/helpers';

interface PitchingBullpenChartProps {
    sessions: Session[];
    players: Player[];
}

interface ChartDataPoint {
    date: string;
    displayDate: string;
    strikePercentage: number;
    totalPitches: number;
    playerName: string;
    playerId: string;
}

/**
 * PitchingBullpenChart - Enhanced visualization for pitching bullpen data
 * Shows strike % trends over time with interactive chart
 */
export const PitchingBullpenChart: React.FC<PitchingBullpenChartProps> = ({ sessions, players }) => {
    const chartData = useMemo<ChartDataPoint[]>(() => {
        const playerMap = new Map(players.map(p => [p.id, p.name]));

        return sessions
            .map(session => {
                const summarySet = session.sets[0];
                const total = summarySet ? Math.max(0, summarySet.repsAttempted) : 0;
                const strikes = summarySet ? Math.max(0, summarySet.repsExecuted) : 0;
                const strikePct = total > 0 ? Math.round((strikes / total) * 100) : 0;

                return {
                    date: session.date,
                    displayDate: formatDate(session.date, { month: 'short', day: 'numeric' }),
                    strikePercentage: strikePct,
                    totalPitches: total,
                    playerName: playerMap.get(session.playerId) || 'Unknown',
                    playerId: session.playerId
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-10); // Last 10 sessions
    }, [sessions, players]);

    const maxStrike = Math.max(...chartData.map(d => d.strikePercentage), 75);
    const avgStrike = chartData.length > 0
        ? Math.round(chartData.reduce((sum, d) => sum + d.strikePercentage, 0) / chartData.length)
        : 0;

    if (chartData.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Bullpen Performance Trends</h3>
                <p className="text-sm text-muted-foreground">No pitching sessions logged yet. Start tracking bullpen sessions to see performance trends.</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Bullpen Performance Trends</h3>
                    <p className="text-sm text-muted-foreground">Strike % over last {chartData.length} sessions</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{avgStrike}%</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Strike %</p>
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-64 mt-6">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                    {[100, 75, 50, 25, 0].map(value => (
                        <div key={value} className="flex items-center w-full border-t border-border/30">
                            <span className="text-xs text-muted-foreground w-8 -ml-10">{value}%</span>
                        </div>
                    ))}
                </div>

                {/* Average line */}
                <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-secondary/50"
                    style={{ bottom: `${avgStrike}%` }}
                >
                    <span className="absolute -top-2 right-0 text-xs text-secondary font-semibold bg-background px-1">
                        Avg
                    </span>
                </div>

                {/* Data points and lines */}
                <div className="absolute inset-0 flex items-end justify-around pb-8">
                    {chartData.map((point, idx) => {
                        const height = point.strikePercentage;
                        const isAboveAvg = point.strikePercentage >= avgStrike;

                        return (
                            <div key={idx} className="flex flex-col items-center group relative" style={{ width: `${90 / chartData.length}%` }}>
                                {/* Tooltip */}
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                    <p className="text-xs font-semibold text-popover-foreground">{point.playerName}</p>
                                    <p className="text-xs text-muted-foreground">{point.displayDate}</p>
                                    <p className="text-sm font-bold text-primary">{point.strikePercentage}% strikes</p>
                                    <p className="text-xs text-muted-foreground">{point.totalPitches} pitches</p>
                                </div>

                                {/* Bar */}
                                <div
                                    className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${isAboveAvg ? 'bg-success' : 'bg-destructive/60'
                                        }`}
                                    style={{ height: `${height}%` }}
                                />

                                {/* Date label */}
                                <p className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-top-left ml-2 whitespace-nowrap">
                                    {point.displayDate}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-success" />
                    <span className="text-muted-foreground">Above Average</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-destructive/60" />
                    <span className="text-muted-foreground">Below Average</span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Best</p>
                    <p className="text-lg font-semibold text-success">{maxStrike}%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
                    <p className="text-lg font-semibold text-foreground">{chartData.length}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pitches</p>
                    <p className="text-lg font-semibold text-foreground">
                        {chartData.reduce((sum, d) => sum + d.totalPitches, 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};
