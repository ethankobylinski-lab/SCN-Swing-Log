import React, { useState, useMemo } from 'react';
import { PitchRecord, PitchTypeModel, ZoneId } from '../types';

interface PitchingZoneHeatmapProps {
    pitchRecords: PitchRecord[];
    pitchTypes: PitchTypeModel[];
}

const ZONE_GRID: ZoneId[][] = [
    ['Z11', 'Z12', 'Z13'],
    ['Z21', 'Z22', 'Z23'],
    ['Z31', 'Z32', 'Z33'],
];

const getZoneColor = (percentage: number): string => {
    if (percentage < 0) return 'hsl(var(--muted) / 0.3)';
    const hue = (percentage / 100) * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 70%, 50%)`;
};

export const PitchingZoneHeatmap: React.FC<PitchingZoneHeatmapProps> = ({ pitchRecords, pitchTypes }) => {
    const [selectedPitchType, setSelectedPitchType] = useState<string | null>(null);

    const zoneData = useMemo(() => {
        const filteredPitches = selectedPitchType
            ? pitchRecords.filter(p => p.pitchTypeId === selectedPitchType)
            : pitchRecords;

        const zoneMap = new Map<ZoneId, { total: number; strikes: number }>();

        filteredPitches.forEach(pitch => {
            if (!zoneMap.has(pitch.actualZone)) {
                zoneMap.set(pitch.actualZone, { total: 0, strikes: 0 });
            }
            const data = zoneMap.get(pitch.actualZone)!;
            data.total += 1;
            if (pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike' || pitch.outcome === 'foul') {
                data.strikes += 1;
            }
        });

        return zoneMap;
    }, [pitchRecords, selectedPitchType]);

    const getZonePercentage = (zone: ZoneId): number => {
        const data = zoneData.get(zone);
        if (!data || data.total === 0) return -1;
        return Math.round((data.strikes / data.total) * 100);
    };

    const getZonePitches = (zone: ZoneId): number => {
        return zoneData.get(zone)?.total || 0;
    };

    const selectedPitchTypeName = useMemo(() => {
        if (!selectedPitchType) return 'All Pitches';
        return pitchTypes.find(pt => pt.id === selectedPitchType)?.name || 'All Pitches';
    }, [selectedPitchType, pitchTypes]);

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-3 text-center">Strike Zone Heat Map</h3>
            <p className="text-xs text-muted-foreground mb-3 text-center">Pitcher's View - {selectedPitchTypeName}</p>

            {/* Pitch Type Filter Chips */}
            {pitchTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center">
                    <button
                        onClick={() => setSelectedPitchType(null)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedPitchType === null
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                    >
                        All
                    </button>
                    {pitchTypes.map(pt => (
                        <button
                            key={pt.id}
                            onClick={() => setSelectedPitchType(pt.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedPitchType === pt.id
                                ? 'text-white shadow-sm'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                            style={selectedPitchType === pt.id ? { backgroundColor: pt.colorHex } : {}}
                        >
                            {pt.code || pt.name}
                        </button>
                    ))}
                </div>
            )}

            {/* 3x3 Strike Zone Grid */}
            <div
                className="grid grid-cols-3 grid-rows-3 gap-1 w-full max-w-sm mx-auto aspect-square border-2 border-border relative"
                style={{
                    backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: '33.33% 33.33%'
                }}
            >
                {/* Home Plate */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-4 bg-border" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' }}></div>

                {ZONE_GRID.flat().map(zone => {
                    const percentage = getZonePercentage(zone);
                    const pitches = getZonePitches(zone);
                    const color = getZoneColor(percentage);

                    return (
                        <div
                            key={zone}
                            className="flex flex-col items-center justify-center text-white font-bold text-lg h-full w-full relative group cursor-pointer"
                            style={{ backgroundColor: color }}
                        >
                            <div className="text-center">
                                {percentage >= 0 ? `${percentage}%` : '-'}
                                {pitches > 0 && <div className="text-xs opacity-80">{pitches}p</div>}
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute invisible group-hover:visible bg-popover text-popover-foreground border border-border rounded-lg p-2 text-xs font-normal whitespace-nowrap z-10 -top-12 left-1/2 -translate-x-1/2 shadow-lg">
                                <div className="font-semibold">{zone}</div>
                                <div>Pitches: {pitches}</div>
                                {percentage >= 0 && <div>Strike%: {percentage}%</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {pitchRecords.length === 0 && (
                <p className="text-center text-muted-foreground mt-4 text-sm">No pitch data available</p>
            )}
        </div>
    );
};
