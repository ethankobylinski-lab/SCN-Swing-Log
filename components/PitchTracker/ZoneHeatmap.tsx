import React from 'react';
import { PitchSessionAnalytics, ZoneId } from '../../types';
import { calculateZoneHeatmap } from '../../utils/pitchAnalytics';
import { PitchRecord } from '../../types';

interface ZoneHeatmapProps {
    pitches: PitchRecord[];
    mode: 'intended' | 'actual' | 'overlay';
}

/**
 * ZoneHeatmap - 3x3 zone heatmap with intended vs actual visualization
 */
export const ZoneHeatmap: React.FC<ZoneHeatmapProps> = ({ pitches, mode }) => {
    const heatmapData = calculateZoneHeatmap(pitches);

    // Find most targeted zone
    const mostTargeted = heatmapData
        .filter(z => z.zone.startsWith('Z'))
        .sort((a, b) => b.intendedCount - a.intendedCount)[0];

    const generateInsight = (): string => {
        if (!mostTargeted || mostTargeted.intendedCount === 0) {
            return 'No zone data available.';
        }

        const zoneName = getZoneName(mostTargeted.zone as ZoneId);
        const percentage = Math.round((mostTargeted.intendedCount / pitches.length) * 100);

        return `You worked mostly ${zoneName}. ${percentage}% of your pitches clustered in that area.`;
    };

    return (
        <div>
            {/* Toggle Controls */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                justifyContent: 'center'
            }}>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>View:</span>
                {/* Note: mode toggle would be controlled by parent component */}
            </div>

            {/* SVG Heatmap */}
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%' }}>
                    {/* 3x3 Grid */}
                    {renderHeatmapGrid(heatmapData, mode)}
                </svg>
            </div>

            {/* Insight */}
            <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#555',
                fontStyle: 'italic'
            }}>
                {generateInsight()}
            </div>
        </div>
    );
};

function renderHeatmapGrid(heatmapData: any[], mode: string) {
    const zones: ZoneId[] = [
        'Z11', 'Z12', 'Z13',
        'Z21', 'Z22', 'Z23',
        'Z31', 'Z32', 'Z33'
    ];

    const cells = [];

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const zoneId = zones[row * 3 + col];
            const zoneData = heatmapData.find(z => z.zone === zoneId);

            const x = 10 + col * 26.67;
            const y = 10 + row * 26.67;
            const w = 26.67;
            const h = 26.67;

            let count = 0;
            if (mode === 'intended') count = zoneData?.intendedCount || 0;
            else if (mode === 'actual') count = zoneData?.actualCount || 0;
            else count = Math.max(zoneData?.intendedCount || 0, zoneData?.actualCount || 0);

            const maxCount = Math.max(...heatmapData.map(z =>
                mode === 'intended' ? z.intendedCount : z.actualCount
            ));

            const intensity = maxCount > 0 ? count / maxCount : 0;
            const fillColor = getHeatColor(intensity);

            cells.push(
                <g key={zoneId}>
                    <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={fillColor}
                        stroke="#333"
                        strokeWidth="1"
                    />
                    {count > 0 && (
                        <>
                            <text
                                x={x + w / 2}
                                y={y + h / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill="#000"
                            >
                                {count}
                            </text>
                            {mode === 'overlay' && zoneData && (
                                <text
                                    x={x + w / 2}
                                    y={y + h / 2 + 8}
                                    textAnchor="middle"
                                    fontSize="6"
                                    fill="#666"
                                >
                                    {zoneData.intendedCount}/{zoneData.actualCount}
                                </text>
                            )}
                        </>
                    )}
                </g>
            );
        }
    }

    return cells;
}

function getHeatColor(intensity: number): string {
    if (intensity === 0) return '#f5f5f5';

    // Blue gradient from light to dark
    const lightness = 90 - (intensity * 40);
    return `hsl(210, 70%, ${lightness}%)`;
}

function getZoneName(zone: ZoneId): string {
    const zoneNames: Record<string, string> = {
        'Z11': 'up and arm-side',
        'Z12': 'up and middle',
        'Z13': 'up and glove-side',
        'Z21': 'middle arm-side',
        'Z22': 'middle-middle',
        'Z23': 'middle glove-side',
        'Z31': 'low arm-side',
        'Z32': 'low and middle',
        'Z33': 'low glove-side'
    };

    return zoneNames[zone] || zone;
}
