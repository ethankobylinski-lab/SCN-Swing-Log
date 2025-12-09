import React, { useMemo, useState } from 'react';
import { PitchSession, ZoneId } from '../../types';

interface PlayerPitchingHeatmapsProps {
    sessions: PitchSession[];
}

type ZoneStat = {
    attempts: number;
    hits: number;
    actualCount: number;
};

export const PlayerPitchingHeatmaps: React.FC<PlayerPitchingHeatmapsProps> = ({ sessions }) => {
    const [viewMode, setViewMode] = useState<'command' | 'location'>('command');
    const [filterType, setFilterType] = useState<'all' | 'strikes'>('all');

    const zoneStats = useMemo(() => {
        const stats: Record<string, ZoneStat> = {
            'Z11': { attempts: 0, hits: 0, actualCount: 0 },
            'Z12': { attempts: 0, hits: 0, actualCount: 0 },
            'Z13': { attempts: 0, hits: 0, actualCount: 0 },
            'Z21': { attempts: 0, hits: 0, actualCount: 0 },
            'Z22': { attempts: 0, hits: 0, actualCount: 0 },
            'Z23': { attempts: 0, hits: 0, actualCount: 0 },
            'Z31': { attempts: 0, hits: 0, actualCount: 0 },
            'Z32': { attempts: 0, hits: 0, actualCount: 0 },
            'Z33': { attempts: 0, hits: 0, actualCount: 0 },
        };

        sessions.forEach(session => {
            session.pitchRecords?.forEach(pitch => {
                // Command Stats (Intended Target)
                if (pitch.intendedZone && stats[pitch.intendedZone]) {
                    stats[pitch.intendedZone].attempts += 1;
                    // Check if hit intended target (exact match)
                    // We could also check pitch.hitIntendedZone if available, but let's compute
                    if (pitch.actualZone === pitch.intendedZone) {
                        stats[pitch.intendedZone].hits += 1;
                    }
                }

                // Location Stats (Actual Location)
                // Apply filter if needed
                if (filterType === 'strikes' && !pitch.isStrike && pitch.outcome !== 'called_strike' && pitch.outcome !== 'swinging_strike' && pitch.outcome !== 'foul' && pitch.outcome !== 'in_play') {
                    return;
                }

                if (pitch.actualZone && stats[pitch.actualZone]) {
                    stats[pitch.actualZone].actualCount += 1;
                }
            });
        });

        return stats;
    }, [sessions, filterType]);

    const getCellValue = (stats: ZoneStat) => {
        if (viewMode === 'command') {
            if (stats.attempts === 0) return 0;
            return Math.round((stats.hits / stats.attempts) * 100);
        } else {
            return stats.actualCount;
        }
    };

    const getMaxVal = () => {
        let max = 0;
        Object.values(zoneStats).forEach(stat => {
            const val = getCellValue(stat);
            if (val > max) max = val;
        });
        return max || 1;
    };

    const maxVal = getMaxVal();

    const getCellColor = (value: number) => {
        if (value === 0) return 'bg-muted/20';

        const intensity = Math.max(0.2, Math.min(1, value / maxVal));

        // Different colors for Command (Green) vs Location (Blue/Orange?)
        // Let's use Green for Command (Success) and Blue for Location (Density)
        const colorBase = viewMode === 'command' ? '34, 197, 94' : '59, 130, 246';
        return `rgba(${colorBase}, ${intensity})`;
    };

    const gridLayout: ZoneId[][] = [
        ['Z11', 'Z12', 'Z13'],
        ['Z21', 'Z22', 'Z23'],
        ['Z31', 'Z32', 'Z33']
    ];

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {viewMode === 'command' ? 'Command: Intended Target' : 'Location: Actual Pitches'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {viewMode === 'command'
                            ? 'Success rate of hitting the intended zone'
                            : 'Density map of where pitches actually land'}
                    </p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('command')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'command' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Command
                        </button>
                        <button
                            onClick={() => setViewMode('location')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'location' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Location
                        </button>
                    </div>

                    {viewMode === 'location' && (
                        <div className="flex bg-muted rounded-lg p-1">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType('strikes')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'strikes' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Strikes
                            </button>
                        </div>
                    )}
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
                                const isPct = viewMode === 'command';

                                return (
                                    <div
                                        key={zone}
                                        className="relative flex flex-col items-center justify-center rounded-md transition-all hover:scale-[1.02] cursor-default border-2 border-border/50"
                                        style={{ backgroundColor: getCellColor(value) }}
                                        title={viewMode === 'command'
                                            ? `${zone}: ${stats.hits}/${stats.attempts} (${value}%)`
                                            : `${zone}: ${stats.actualCount} pitches`
                                        }
                                    >
                                        <span className={`text-2xl font-bold ${value > maxVal * 0.6 ? 'text-white' : 'text-foreground'}`}>
                                            {value}{isPct ? '%' : ''}
                                        </span>
                                        <span className={`text-xs font-medium mt-0.5 ${value > maxVal * 0.6 ? 'text-white/90' : 'text-muted-foreground'}`}>
                                            {viewMode === 'command' ? `${stats.attempts} att` : 'pitches'}
                                        </span>
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
                    <span>Glove</span>
                    <span>Middle</span>
                    <span>Arm</span>
                </div>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border bg-muted/20"></div>
                    <span className="font-medium">Low</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: viewMode === 'command' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(59, 130, 246, 0.5)' }}></div>
                    <span className="font-medium">Average</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: viewMode === 'command' ? 'rgba(34, 197, 94, 1)' : 'rgba(59, 130, 246, 1)' }}></div>
                    <span className="font-medium">High</span>
                </div>
            </div>
        </div>
    );
};
