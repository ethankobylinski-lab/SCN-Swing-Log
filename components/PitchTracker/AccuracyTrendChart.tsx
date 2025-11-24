import React from 'react';
import { PitchRecord, TrendMetrics } from '../../types';

interface AccuracyTrendChartProps {
    pitches: PitchRecord[];
    trend: TrendMetrics;
}

/**
 * AccuracyTrendChart - Line chart showing proximity accuracy over time
 */
export const AccuracyTrendChart: React.FC<AccuracyTrendChartProps> = ({ pitches, trend }) => {
    if (pitches.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                No pitch data available
            </div>
        );
    }

    // Calculate proximity for each pitch
    const pitchProximities = pitches.map((pitch, index) => {
        if (
            pitch.targetXNorm !== undefined &&
            pitch.targetYNorm !== undefined &&
            pitch.actualXNorm !== undefined &&
            pitch.actualYNorm !== undefined
        ) {
            const distance = Math.sqrt(
                Math.pow(pitch.actualXNorm - pitch.targetXNorm, 2) +
                Math.pow(pitch.actualYNorm - pitch.targetYNorm, 2)
            );
            const maxDistance = Math.sqrt(2);
            const proximity = Math.max(0, 1 - distance / maxDistance);
            return { index: index + 1, proximity };
        }
        return { index: index + 1, proximity: 0 };
    });

    const maxProximity = 1.0;
    const svgHeight = 200;
    const svgWidth = 400;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    // Create path for line
    const pathData = pitchProximities
        .map((point, i) => {
            const x = padding.left + (i / (pitchProximities.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - (point.proximity / maxProximity) * chartHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    // Generate insight
    const improvement = trend.lateAccuracy - trend.earlyAccuracy;
    let insight = '';
    if (pitches.length >= 20) {
        if (improvement > 0.1) {
            insight = `Command improved during the session. Last 10 pitches averaged ${trend.lateAccuracy.toFixed(2)} accuracy.`;
        } else if (improvement < -0.1) {
            insight = `Command declined in later pitches. Consider managing fatigue and maintaining mechanics.`;
        } else {
            insight = `Consistent command throughout the session. Maintained ${trend.earlyAccuracy.toFixed(2)} average accuracy.`;
        }
    } else {
        insight = 'Log more pitches to track trends over the session.';
    }

    return (
        <div>
            {/* SVG Chart */}
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%' }}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((value) => {
                        const y = padding.top + chartHeight - (value / maxProximity) * chartHeight;
                        return (
                            <g key={value}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={svgWidth - padding.right}
                                    y2={y}
                                    stroke="#e0e0e0"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                />
                                <text
                                    x={padding.left - 5}
                                    y={y}
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                    fontSize="10"
                                    fill="#666"
                                >
                                    {value.toFixed(2)}
                                </text>
                            </g >
                        );
                    })}

                    {/* X-axis */}
                    <line
                        x1={padding.left}
                        y1={svgHeight - padding.bottom}
                        x2={svgWidth - padding.right}
                        y2={svgHeight - padding.bottom}
                        stroke="#333"
                        strokeWidth="1"
                    />
                    <text
                        x={svgWidth / 2}
                        y={svgHeight - 5}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#666"
                    >
                        Pitch Number
                    </text>

                    {/* Y-axis */}
                    <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={padding.left}
                        y2={svgHeight - padding.bottom}
                        stroke="#333"
                        strokeWidth="1"
                    />
                    <text
                        x={10}
                        y={svgHeight / 2}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#666"
                        transform={`rotate(-90, 10, ${svgHeight / 2})`}
                    >
                        Proximity (0-1)
                    </text>

                    {/* Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#2196F3"
                        strokeWidth="2"
                    />

                    {/* Dots */}
                    {
                        pitchProximities.map((point, i) => {
                            const x = padding.left + (i / (pitchProximities.length - 1)) * chartWidth;
                            const y = padding.top + chartHeight - (point.proximity / maxProximity) * chartHeight;
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="#2196F3"
                                    stroke="#fff"
                                    strokeWidth="1"
                                />
                            );
                        })
                    }

                    {/* Early/Late comparison zones */}
                    {
                        pitches.length >= 20 && (
                            <>
                                {/* Early zone (first 10) */}
                                <rect
                                    x={padding.left}
                                    y={padding.top}
                                    width={(10 / pitches.length) * chartWidth}
                                    height={chartHeight}
                                    fill="#4CAF50"
                                    fillOpacity="0.1"
                                />
                                <text
                                    x={padding.left + ((5 / pitches.length) * chartWidth)}
                                    y={padding.top + 15}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="#4CAF50"
                                    fontWeight="bold"
                                >
                                    Early: {trend.earlyAccuracy.toFixed(2)}
                                </text>

                                {/* Late zone (last 10) */}
                                <rect
                                    x={svgWidth - padding.right - ((10 / pitches.length) * chartWidth)}
                                    y={padding.top}
                                    width={(10 / pitches.length) * chartWidth}
                                    height={chartHeight}
                                    fill="#FF9800"
                                    fillOpacity="0.1"
                                />
                                <text
                                    x={svgWidth - padding.right - ((5 / pitches.length) * chartWidth)}
                                    y={padding.top + 15}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="#FF9800"
                                    fontWeight="bold"
                                >
                                    Late: {trend.lateAccuracy.toFixed(2)}
                                </text>
                            </>
                        )
                    }
                </svg >
            </div >

            {/* Insight */}
            < div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#555',
                fontStyle: 'italic'
            }}>
                {insight}
            </div >
        </div >
    );
};
