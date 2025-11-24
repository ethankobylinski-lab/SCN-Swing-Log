import React from 'react';
import { DrillBreakdown } from '../utils/teamInsights';

interface DrillBreakdownChartProps {
    data: DrillBreakdown[];
}

export const DrillBreakdownChart: React.FC<DrillBreakdownChartProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center">
                <p className="text-muted-foreground">No drill data available yet</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-foreground">Drill Type Usage & Success</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Showing which drills are being trained and how well
                </p>
            </div>

            {/* Drill List */}
            <div className="space-y-4">
                {data.map((drill, index) => (
                    <div key={drill.drillType} className="space-y-2">
                        {/* Drill Name and Stats */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground w-6">
                                    #{index + 1}
                                </span>
                                <div>
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        {drill.drillType}
                                        {drill.isUndertrained && (
                                            <span className="text-xs px-2 py-0.5 bg-warning/20 text-warning rounded-full">
                                                Under-trained
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {drill.totalReps.toLocaleString()} reps • {drill.usagePercent}% of total volume
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{drill.successRate}%</p>
                                <p className="text-xs text-muted-foreground">Success</p>
                            </div>
                        </div>

                        {/* Usage Bar */}
                        <div className="flex gap-2">
                            {/* Usage percentage bar */}
                            <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${drill.isUndertrained ? 'bg-warning' : 'bg-accent'
                                        }`}
                                    style={{ width: `${drill.usagePercent}%` }}
                                />
                            </div>
                            {/* Success rate bar */}
                            <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${drill.successRate >= 75
                                            ? 'bg-success'
                                            : drill.successRate >= 50
                                                ? 'bg-warning'
                                                : 'bg-destructive'
                                        }`}
                                    style={{ width: `${drill.successRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-2 bg-accent rounded-full" />
                        <span>Usage Volume</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-2 bg-success rounded-full" />
                        <span>Success Rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-2 bg-warning rounded-full" />
                        <span>Under-trained (\u003c20%)</span>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {data.some(d => d.isUndertrained) && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
                        ⚠️ Training Recommendations
                    </h4>
                    <p className="text-xs text-foreground">
                        Some drill types are under-trained (less than 20% of total volume).
                        Consider adding more variety to the team's training plan.
                    </p>
                </div>
            )}
        </div>
    );
};
