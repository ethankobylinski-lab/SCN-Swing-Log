import React, { useMemo } from 'react';
import { TargetZone } from '../types';
import { TARGET_ZONES } from '../constants';
import { Tooltip } from './Tooltip';

type TopPlayer = { name: string; value: number; reps: number };

interface HeatmapData {
    zone: TargetZone;
    execution: number;
    reps: number;
    topPlayers: TopPlayer[];
}

interface StrikeZoneHeatmapProps {
    data: HeatmapData[];
    battingSide?: 'R' | 'L' | 'S';
}

const PlayerLeaderboard: React.FC<{ players: TopPlayer[], metricSuffix?: string }> = ({ players, metricSuffix = '%' }) => {
    if (players.length === 0) {
        return <p className="text-muted-foreground">Not enough data for top performers.</p>;
    }
    return (
        <div className="space-y-1.5 text-left">
            <h4 className="font-bold text-sm text-secondary mb-2">Top Performers</h4>
            {players.map((p, index) => (
                <div key={p.name} className="flex justify-between items-center text-sm">
                    <span className="truncate pr-2 text-foreground">{index + 1}. {p.name}</span>
                    <span className="font-bold flex-shrink-0 text-secondary">{p.value}{metricSuffix}</span>
                </div>
            ))}
        </div>
    );
};

const ZoneTooltipContent: React.FC<{ zone: TargetZone; data?: HeatmapData }> = ({ zone, data }) => (
    <div className="text-left space-y-1">
        <p className="font-bold text-base">{zone}</p>
        <p>Reps: {data?.reps ?? 0}</p>
        <p>Execution: {data?.execution !== undefined && data.execution >= 0 ? `${Math.round(data.execution)}%` : 'N/A'}</p>
        {data && data.topPlayers.length > 0 && <hr className="my-1 border-border" />}
        {data && <PlayerLeaderboard players={data.topPlayers} />}
    </div>
);


const getColor = (percentage: number): string => {
    if (isNaN(percentage) || percentage < 0) return 'hsl(var(--muted) / 0.3)';
    // Improved color scale: Red -> Yellow -> Green with better saturation
    if (percentage < 50) {
        // Red to Yellow
        return `hsl(${percentage}, 85%, 55%)`;
    } else {
        // Yellow to Green (cap at 140 for a nice emerald green)
        const hue = 50 + ((percentage - 50) / 50) * 90;
        return `hsl(${hue}, 85%, 45%)`;
    }
};

export const StrikeZoneHeatmap: React.FC<StrikeZoneHeatmapProps> = ({ data, battingSide }) => {
    const dataMap = new Map<TargetZone, HeatmapData>(data.map(d => [d.zone, d]));

    // Fixed zone order: Top-to-bottom, left-to-right (Catcher's perspective)
    const zonesRenderOrder: TargetZone[] = [
        'Inside High', 'Middle High', 'Outside High',
        'Inside Middle', 'Middle Middle', 'Outside Middle',
        'Inside Low', 'Middle Low', 'Outside Low'
    ];

    const subtitle = useMemo(() => {
        let text = "Catcher's View";
        if (battingSide) {
            if (battingSide === 'L') text += " • Lefty Batter";
            else if (battingSide === 'R') text += " • Righty Batter";
            else if (battingSide === 'S') text += " • Switch Hitter";
        }
        return text;
    }, [battingSide]);

    return (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm h-full flex flex-col items-center">
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                    <span className="w-2 h-6 bg-primary rounded-full"></span>
                    Strike Zone Execution
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">{subtitle}</p>
            </div>

            <div className="relative p-8 bg-muted/10 rounded-2xl border border-border/50">
                {/* Top Label */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground/70 uppercase tracking-widest">
                    Top
                </div>

                {/* Left Label */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/70 uppercase tracking-widest -rotate-90">
                    Inside
                </div>

                {/* Right Label */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/70 uppercase tracking-widest rotate-90">
                    Outside
                </div>

                {/* Bottom Label */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground/70 uppercase tracking-widest">
                    Bottom
                </div>

                {/* 3x3 Strike Zone Grid */}
                <div
                    className="grid grid-cols-3 grid-rows-3 gap-1.5 w-64 h-64 relative z-10"
                >
                    {zonesRenderOrder.map(zone => {
                        const zoneData = dataMap.get(zone);
                        const execution = zoneData?.execution ?? -1;
                        const color = getColor(execution);
                        const hasData = execution >= 0;

                        return (
                            <Tooltip key={zone} content={<ZoneTooltipContent zone={zone} data={zoneData} />}>
                                <div
                                    className={`
                                        flex flex-col items-center justify-center h-full w-full rounded-md transition-all duration-200
                                        ${hasData ? 'shadow-sm hover:scale-105 hover:z-20 hover:shadow-md cursor-help' : 'bg-muted/20'}
                                    `}
                                    style={{
                                        backgroundColor: color,
                                        border: hasData ? '1px solid rgba(255,255,255,0.2)' : '1px dashed var(--border)'
                                    }}
                                >
                                    {hasData ? (
                                        <>
                                            <span className="text-white font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{Math.round(execution)}%</span>
                                            {zoneData?.reps ? (
                                                <span className="text-xs text-white/95 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{zoneData.reps} reps</span>
                                            ) : null}
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground/30 text-xs">-</span>
                                    )}
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Home Plate */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-32 h-16 z-0 opacity-20 pointer-events-none">
                    <div className="w-full h-full bg-foreground" style={{ clipPath: 'polygon(50% 100%, 100% 50%, 100% 0, 0 0, 0 50%)' }}></div>
                </div>
            </div>
        </div>
    );
};