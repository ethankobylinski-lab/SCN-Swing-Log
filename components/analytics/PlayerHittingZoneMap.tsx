import React, { useMemo, useState } from 'react';
import { Session, TargetZone } from '../../types';

interface PlayerHittingZoneMapProps {
    sessions: Session[];
}

type ZoneStat = {
    reps: number;
    hardHits: number;
    execution: number; // repsExecuted
};

export const PlayerHittingZoneMap: React.FC<PlayerHittingZoneMapProps> = ({ sessions }) => {
    const [metric, setMetric] = useState<'reps' | 'hardHitPct' | 'executionPct'>('hardHitPct');

    const zoneStats = useMemo(() => {
        const stats: Record<TargetZone, ZoneStat> = {
            'Inside High': { reps: 0, hardHits: 0, execution: 0 },
            'Inside Middle': { reps: 0, hardHits: 0, execution: 0 },
            'Inside Low': { reps: 0, hardHits: 0, execution: 0 },
            'Middle High': { reps: 0, hardHits: 0, execution: 0 },
            'Middle Middle': { reps: 0, hardHits: 0, execution: 0 },
            'Middle Low': { reps: 0, hardHits: 0, execution: 0 },
            'Outside High': { reps: 0, hardHits: 0, execution: 0 },
            'Outside Middle': { reps: 0, hardHits: 0, execution: 0 },
            'Outside Low': { reps: 0, hardHits: 0, execution: 0 },
        };

        sessions.forEach(session => {
            session.sets.forEach(set => {
                if (set.targetZones && set.targetZones.length > 0) {
                    // Distribute reps equally among target zones if multiple are selected
                    // or just count it for all? Counting for all is simpler and likely intended context.
                    // If a set of 10 reps has target "Inside High" and "Inside Middle", 
                    // it implies the batter was working on that general area.
                    // We'll add the full rep count to each zone to show volume/focus.
                    set.targetZones.forEach(zone => {
                        if (stats[zone]) {
                            stats[zone].reps += set.repsAttempted;
                            stats[zone].hardHits += set.hardHits || 0;
                            stats[zone].execution += set.repsExecuted || 0;
                        }
                    });
                }
            });
        });

        return stats;
    }, [sessions]);

    const getCellValue = (stats: ZoneStat) => {
        if (metric === 'reps') return stats.reps;
        if (stats.reps === 0) return 0;
        if (metric === 'hardHitPct') return Math.round((stats.hardHits / stats.reps) * 100);
        if (metric === 'executionPct') return Math.round((stats.execution / stats.reps) * 100);
        return 0;
    };

    const getMaxVal = () => {
        let max = 0;
        Object.values(zoneStats).forEach(stat => {
            const val = getCellValue(stat);
            if (val > max) max = val;
        });
        return max || 1; // Avoid divide by zero
    };

    const maxVal = getMaxVal();

    const getCellColor = (value: number) => {
        if (value === 0) return 'bg-muted/20';

        // Calculate intensity (0.2 to 1.0)
        const intensity = Math.max(0.2, Math.min(1, value / maxVal));

        // Use primary color with opacity
        // We'll use inline styles for precise opacity if needed, or tailwind classes if we map them.
        // For simplicity and better look, let's use a function to return RGBA or mapped classes.
        // Let's use a simple mapping to tailwind classes for consistency if possible, 
        // but dynamic opacity is easier with style.
        return `rgba(59, 130, 246, ${intensity})`; // Using a blue-ish primary color base
    };

    const gridLayout: TargetZone[][] = [
        ['Inside High', 'Middle High', 'Outside High'],
        ['Inside Middle', 'Middle Middle', 'Outside Middle'],
        ['Inside Low', 'Middle Low', 'Outside Low']
    ];

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Strike Zone Performance</h3>
                <div className="flex bg-muted rounded-lg p-1">
                    <button
                        onClick={() => setMetric('reps')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${metric === 'reps' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Volume
                    </button>
                    <button
                        onClick={() => setMetric('hardHitPct')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${metric === 'hardHitPct' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Hard Hit %
                    </button>
                    <button
                        onClick={() => setMetric('executionPct')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${metric === 'executionPct' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Execution %
                    </button>
                </div>
            </div>

            <div className="aspect-square max-w-[400px] mx-auto relative">
                {/* Strike Zone Grid */}
                <div className="grid grid-cols-3 gap-2 h-full border-4 border-border p-2 bg-muted/10 rounded-lg">
                    {gridLayout.map((row, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            {row.map((zone) => {
                                const stats = zoneStats[zone];
                                const value = getCellValue(stats);
                                const isPct = metric !== 'reps';

                                return (
                                    <div
                                        key={zone}
                                        className="relative flex flex-col items-center justify-center rounded-md transition-all hover:scale-[1.02] cursor-default border-2 border-border/50"
                                        style={{ backgroundColor: getCellColor(value) }}
                                        title={`${zone}: ${stats.reps} reps, ${Math.round((stats.hardHits / stats.reps) * 100)}% HH`}
                                    >
                                        <span className={`text-2xl font-bold ${value > maxVal * 0.6 ? 'text-white' : 'text-foreground'}`}>
                                            {value}{isPct ? '%' : ''}
                                        </span>
                                        {metric !== 'reps' && (
                                            <span className={`text-xs font-medium mt-0.5 ${value > maxVal * 0.6 ? 'text-white/90' : 'text-muted-foreground'}`}>
                                                {stats.reps} reps
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                {/* Labels */}
                <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between py-8 text-xs text-muted-foreground font-semibold uppercase writing-mode-vertical">
                    <span>High</span>
                    <span>Mid</span>
                    <span>Low</span>
                </div>
                <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-8 text-xs text-muted-foreground font-semibold uppercase">
                    <span>Inside</span>
                    <span>Middle</span>
                    <span>Outside</span>
                </div>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border bg-muted/20"></div>
                    <span className="font-medium">Low</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}></div>
                    <span className="font-medium">Average</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: 'rgba(59, 130, 246, 1)' }}></div>
                    <span className="font-medium">High</span>
                </div>
            </div>
        </div>
    );
};
