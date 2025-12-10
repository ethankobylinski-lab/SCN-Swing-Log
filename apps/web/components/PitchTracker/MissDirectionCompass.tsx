import React from 'react';
import { MissPattern } from '../../types';

interface MissDirectionCompassProps {
    missPattern: MissPattern;
}

/**
 * MissDirectionCompass - Circular compass showing miss direction distribution
 */
export const MissDirectionCompass: React.FC<MissDirectionCompassProps> = ({ missPattern }) => {
    // Determine primary miss direction
    const maxMiss = Math.max(
        missPattern.missUpPct,
        missPattern.missDownPct,
        missPattern.missArmSidePct,
        missPattern.missGloveSidePct
    );

    let primaryDirection = '';
    let insight = '';

    if (maxMiss === 0) {
        insight = 'Excellent command! Very few misses detected.';
    } else {
        if (missPattern.missArmSidePct === maxMiss && maxMiss > 0) {
            primaryDirection = 'arm-side';
            insight = `Most misses were arm-side (${maxMiss}%). Indicates early torso rotation or pulling off line.`;
        } else if (missPattern.missGloveSidePct === maxMiss) {
            primaryDirection = 'glove-side';
            insight = `Most misses were glove-side (${maxMiss}%). Focus on staying through the pitch.`;
        } else if (missPattern.missUpPct === maxMiss) {
            primaryDirection = 'up';
            insight = `Most

 misses were up (${maxMiss}%). Check release point consistency.`;
        } else {
            primaryDirection = 'down';
            insight = `Most misses were down (${maxMiss}%). Focus on lower half engagement.`;
        }
    }

    return (
        <div>
            {/* Compass SVG */}
            <div style={{ maxWidth: 300, margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 200 200" style={{ width: '100%' }}>
                    {/* Center circle */}
                    <circle cx="100" cy="100" r="70" fill="#f5f5f5" stroke="#ddd" strokeWidth="2" />

                    {/* Direction labels */}
                    <text x="100" y="25" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">UP</text>
                    <text x="100" y="185" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">DOWN</text>
                    <text x="25" y="105" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">GLOVE</text>
                    <text x="175" y="105" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">ARM</text>

                    {/* Directional wedges */}
                    {renderWedge(100, 100, 60, -90, missPattern.missUpPct, '#FF5722')}
                    {renderWedge(100, 100, 60, 0, missPattern.missArmSidePct, '#2196F3')}
                    {renderWedge(100, 100, 60, 90, missPattern.missDownPct, '#4CAF50')}
                    {renderWedge(100, 100, 60, 180, missPattern.missGloveSidePct, '#FF9800')}

                    {/* Percentage labels */}
                    {renderPercentageLabel(100, 55, missPattern.missUpPct)}
                    {renderPercentageLabel(145, 100, missPattern.missArmSidePct)}
                    {renderPercentageLabel(100, 145, missPattern.missDownPct)}
                    {renderPercentageLabel(55, 100, missPattern.missGloveSidePct)}
                </svg>
            </div>

            {/* Miss Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.85rem'
            }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ color: '#666' }}>Up</div>
                    <div style={{ fontWeight: 'bold', color: '#FF5722' }}>{missPattern.missUpPct}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ color: '#666' }}>Down</div>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>{missPattern.missDownPct}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ color: '#666' }}>Arm-Side</div>
                    <div style={{ fontWeight: 'bold', color: '#2196F3' }}>{missPattern.missArmSidePct}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ color: '#666' }}>Glove-Side</div>
                    <div style={{ fontWeight: 'bold', color: '#FF9800' }}>{missPattern.missGloveSidePct}%</div>
                </div>
            </div>

            {/* Insight */}
            <div style={{
                padding: '0.75rem',
                backgroundColor: '#f0f7ff',
                borderLeft: '3px solid #2196F3',
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#555',
                fontStyle: 'italic'
            }}>
                {insight}
            </div>
        </div>
    );
};

function renderWedge(cx: number, cy: number, radius: number, startAngleDeg: number, percentage: number, color: string) {
    if (percentage === 0) return null;

    // Scale the wedge based on percentage (0-100)
    const wedgeRadius = (percentage / 100) * radius;
    const startAngle = (startAngleDeg - 45) * (Math.PI / 180);
    const endAngle = (startAngleDeg + 45) * (Math.PI / 180);

    const x1 = cx + Math.cos(startAngle) * wedgeRadius;
    const y1 = cy + Math.sin(startAngle) * wedgeRadius;
    const x2 = cx + Math.cos(endAngle) * wedgeRadius;
    const y2 = cy + Math.sin(endAngle) * wedgeRadius;

    const largeArcFlag = 0;

    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${wedgeRadius} ${wedgeRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return <path d={pathData} fill={color} fillOpacity="0.7" stroke="#fff" strokeWidth="1" />;
}

function renderPercentageLabel(x: number, y: number, percentage: number) {
    if (percentage === 0) return null;

    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#000"
        >
            {percentage}%
        </text>
    );
}
