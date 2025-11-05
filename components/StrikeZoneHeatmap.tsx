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
        <div className="space-y-1 text-left">
            <h4 className="font-bold text-sm text-secondary">Top Performers</h4>
            {players.map((p, index) => (
                <div key={p.name} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2">{index + 1}. {p.name}</span>
                    <span className="font-bold flex-shrink-0">{p.value}{metricSuffix}</span>
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
    if (isNaN(percentage) || percentage < 0) return 'hsl(var(--muted) / 0.5)';
    const hue = (percentage / 100) * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 70%, 50%)`;
};

export const StrikeZoneHeatmap: React.FC<StrikeZoneHeatmapProps> = ({ data, battingSide }) => {
    const dataMap = new Map<TargetZone, HeatmapData>(data.map(d => [d.zone, d]));

    const zonesForRenderOrder = useMemo(() => {
        if (battingSide !== 'L') {
            return TARGET_ZONES;
        }
        const leftyOrder: TargetZone[] = [];
        for (let i = 0; i < 9; i += 3) {
            const row = TARGET_ZONES.slice(i, i + 3);
            leftyOrder.push(row[2], row[1], row[0]);
        }
        return leftyOrder;
    }, [battingSide]);
    
    const subtitle = useMemo(() => {
        let text = "Catcher's View";
        if (battingSide) {
            if (battingSide === 'L') text += " (Lefty Batter)";
            else if (battingSide === 'R') text += " (Righty Batter)";
            else if (battingSide === 'S') text += " (Switch Hitter - Righty View)";
        } else {
            text += " (Normalized for Righty)";
        }
        return text;
    }, [battingSide]);

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full">
            <h3 className="text-lg font-bold text-primary mb-1 text-center">Strike Zone Execution</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center">{subtitle}</p>
            <div 
                className="grid grid-cols-3 grid-rows-3 gap-1 w-full max-w-xs mx-auto aspect-square border-2 border-border relative"
                style={{
                    backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: '33.33% 33.33%'
                }}
            >
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-4 bg-border" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' }}></div>

                {zonesForRenderOrder.map(zone => {
                    const zoneData = dataMap.get(zone);
                    const execution = zoneData?.execution ?? -1;
                    const color = getColor(execution);
                    
                    return (
                         <Tooltip key={zone} content={<ZoneTooltipContent zone={zone} data={zoneData} />}>
                            <div className="flex items-center justify-center text-white font-bold text-lg h-full w-full" style={{ backgroundColor: color }}>
                               {execution >= 0 ? `${Math.round(execution)}%` : '-'}
                            </div>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
};