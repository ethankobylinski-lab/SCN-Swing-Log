import React from 'react';
import { DrillBreakdown } from '../utils/teamInsights';
import { useTeamColor } from '../hooks/useTeamColor';

interface DrillBreakdownChartProps {
    data: DrillBreakdown[];
}

export const DrillBreakdownChart: React.FC<DrillBreakdownChartProps> = ({ data }) => {
    const { primaryColor } = useTeamColor();

    if (data.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center">
                <p className="text-muted-foreground">No drill data available yet</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {/* Description */}
            <div className="flex justify-between items-end">
                <p className="text-sm text-muted-foreground">
                    Showing which drills are being trained and how well players are executing them
                </p>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                <div className="col-span-4">Drill Type</div>
                <div className="col-span-4">Usage Volume</div>
                <div className="col-span-4 text-right">Success Rate</div>
            </div>

            {/* Drill List */}
            <div className="space-y-4">
                {data.map((drill, index) => (
                    <div key={drill.drillType} className="space-y-2">
                        {/* Drill Name and Stats */}
                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4 flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground w-4">
                                    {index + 1}.
                                </span>
                                <div>
                                    <h4 className="font-bold text-foreground text-sm truncate" title={drill.drillType}>
                                        {drill.drillType}
                                    </h4>
                                    {drill.isUndertrained && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-warning/20 text-warning rounded-full inline-block mt-0.5">
                                            Under-trained
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Usage Bar */}
                            <div className="col-span-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${drill.usagePercent}%`,
                                                backgroundColor: drill.isUndertrained ? 'hsl(var(--warning))' : primaryColor
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                                        {drill.usagePercent}%
                                    </span>
                                </div>
                            </div>

                            {/* Success Rate Bar */}
                            <div className="col-span-4">
                                <div className="flex items-center gap-2 justify-end">
                                    <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden max-w-[100px]">
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
                                    <span className={`text-xs font-bold w-8 text-right ${drill.successRate >= 75 ? 'text-success' : drill.successRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                                        {drill.successRate}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                        <span>Usage Volume</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-success rounded-full" />
                        <span>High Success (&gt;75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-warning rounded-full" />
                        <span>Med Success / Under-trained</span>
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
