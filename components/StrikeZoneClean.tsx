import React from 'react';
import { ZoneId, PitchType } from '../types';
import {
    coordsToZone,
    pixelToNormalized,
    zoneIdToRowCol,
    getZoneCenter
} from '../utils/strikeZoneHelpers';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PitchLocation {
    zone: ZoneId;
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
}

export interface PitchDot {
    id: string;
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
    color: string; // Pitch type color
    isCalledStrike?: boolean;
}

export interface StrikeZoneCleanProps {
    // Interaction mode
    mode: 'selectIntent' | 'selectActual';

    // Visual state
    pitchType?: PitchType;
    pitchTypeColor?: string; // Custom color override
    batterSide?: 'R' | 'L';
    pitcherHand?: 'R' | 'L';

    // State from parent
    intendedZone?: ZoneId | null;
    actualLocation?: PitchLocation | null;
    isCalledStrike?: boolean; // Shows backwards K

    // Pitch history
    pitchHistory?: PitchDot[];

    // Callbacks
    onSelectIntent?: (zone: ZoneId, x: number, y: number) => void;
    onSelectActual?: (zone: ZoneId, x: number, y: number) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * StrikeZoneClean - Clean 3x3 strike zone for precise pitch logging
 * 
 * Features:
 * - Two-step interaction: intended target → actual pitch
 * - Precise coordinate tracking (normalized 0-1)
 * - Yellow highlight for intended zone
 * - Colored dot for actual pitch (based on pitch type)
 * - Backwards K overlay for called strikes
 * - Catcher's view vs RHB
 */
export const StrikeZoneClean: React.FC<StrikeZoneCleanProps> = ({
    mode,
    pitchType,
    pitchTypeColor,
    batterSide = 'R',
    pitcherHand = 'R',
    intendedZone,
    actualLocation,
    isCalledStrike = false,
    pitchHistory = [],
    onSelectIntent,
    onSelectActual
}) => {

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();

        // Get click position relative to SVG
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert to SVG coordinate space (0-100 width, 0-120 height based on viewBox)
        const svgX = (clickX / rect.width) * 100;
        const svgY = (clickY / rect.height) * 120;

        // The clickable strike zone area is:
        // - x: 5 to 95 (90 units wide, centered)
        // - y: 10 to 100 (90 units tall)
        // The 3x3 grid within is:
        // - x: 20 to 80 (60 units wide)
        // - y: 20 to 80 (60 units tall)

        // Convert SVG coordinates to normalized 0-1 coordinates
        // Map the 90-unit clickable area (5-95, 10-100) to 0-1
        const normalizedX = Math.max(0, Math.min(1, (svgX - 5) / 90));
        const normalizedY = Math.max(0, Math.min(1, 1 - ((svgY - 10) / 90))); // Flip Y

        // Determine zone (still based on the 3x3 grid within)
        const zone = coordsToZone(normalizedX, normalizedY, pitcherHand as 'R' | 'L');

        // Call appropriate callback with exact normalized coordinates
        if (mode === 'selectIntent' && onSelectIntent) {
            onSelectIntent(zone, normalizedX, normalizedY);
        } else if (mode === 'selectActual' && onSelectActual) {
            onSelectActual(zone, normalizedX, normalizedY);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <svg
                viewBox="0 0 100 120"
                style={{
                    width: '100%',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
                onClick={handleClick}
            >
                {/* Home Plate - at bottom for orientation */}
                <path
                    d="M 35 112 L 50 120 L 65 112 L 65 108 L 35 108 Z"
                    fill="#D1D5DB"
                    stroke="#9CA3AF"
                    strokeWidth="0.5"
                />

                {/* Extended clickable background (for balls outside zone) */}
                <rect
                    x="5"
                    y="10"
                    width="90"
                    height="90"
                    fill="#F3F4F6"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    rx="2"
                />

                {/* 3x3 Strike Zone Grid - centered and smaller (60% of total area) */}
                <g transform="translate(20, 20)">
                    {renderGrid(intendedZone)}
                </g>

                {/* Pitch history dots - map to the 90-unit clickable area */}
                {pitchHistory.map((pitch, index) => {
                    // Map normalized 0-1 to the 90-unit clickable area (5-95, 10-100)
                    const displayX = 5 + pitch.x * 90;
                    const displayY = 10 + (1 - pitch.y) * 90;
                    return (
                        <circle
                            key={pitch.id || index}
                            cx={displayX}
                            cy={displayY}
                            r="2.5"
                            fill={pitch.color}
                            stroke="#FFFFFF"
                            strokeWidth="0.4"
                            opacity="0.8"
                            className="animate-scaleIn"
                            style={{ animationDelay: `${index * 50}ms` }}
                        />
                    );
                })}

                {/* Actual pitch location dot (current pitch being logged) */}
                {actualLocation && renderPitchDot(
                    actualLocation.x,
                    actualLocation.y,
                    pitchTypeColor || getPitchColor(pitchType),
                    isCalledStrike
                )}
            </svg>
        </div>
    );
};

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render the 3x3 grid with optional yellow highlight
 * Grid is now 60x60 units (will be transformed/translated by parent)
 */
function renderGrid(intendedZone?: ZoneId | null): React.ReactElement[] {
    const zones: ZoneId[][] = [
        ['Z11', 'Z12', 'Z13'], // top row
        ['Z21', 'Z22', 'Z23'], // middle row  
        ['Z31', 'Z32', 'Z33']  // bottom row
    ];

    const cells: React.ReactElement[] = [];
    const gridSize = 60; // Smaller grid

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const zone = zones[row][col];

            // Each cell is 1/3 of the grid
            const x = (col / 3) * gridSize;
            const y = (row / 3) * gridSize;
            const size = gridSize / 3;

            const isIntended = intendedZone === zone;

            cells.push(
                <rect
                    key={zone}
                    x={x}
                    y={y}
                    width={size}
                    height={size}
                    fill={isIntended ? '#FBBF24' : '#F9FAFB'} // Yellow or very light gray
                    fillOpacity={isIntended ? 0.7 : 1}
                    stroke="#E5E7EB" // Light gray border
                    strokeWidth="0.5"
                    style={{
                        transition: 'fill 0.2s ease, fill-opacity 0.2s ease'
                    }}
                />
            );
        }
    }

    return cells;
}

/**
 * Render the pitch dot with optional backwards K
 * Coordinates map to the 90-unit clickable area (5-95, 10-100)
 */
function renderPitchDot(
    xNorm: number,
    yNorm: number,
    color: string,
    showK: boolean
): React.ReactElement {
    // Convert normalized (0-1) to SVG coordinates
    // Map to the 90-unit clickable area
    const svgX = 5 + xNorm * 90;
    const svgY = 10 + (1 - yNorm) * 90;

    return (
        <g key="pitch-dot">
            {/* Dot */}
            <circle
                cx={svgX}
                cy={svgY}
                r="3"
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="0.5"
                opacity="0.9"
            />

            {/* Backwards K for called strike */}
            {showK && (
                <text
                    x={svgX}
                    y={svgY}
                    fontSize="6"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ transform: 'scaleX(-1)', transformOrigin: `${svgX}px ${svgY}px` }}
                >
                    K
                </text>
            )}
        </g>
    );
}

/**
 * Get pitch type color
 */
function getPitchColor(pitchType?: PitchType): string {
    if (!pitchType) return '#6B7280'; // Default gray

    const colors: Record<PitchType, string> = {
        'Fastball': '#2196F3',    // Blue
        'Changeup': '#4CAF50',    // Green
        'Curveball': '#FF9800',   // Orange
        'Slider': '#9C27B0',      // Purple
        'Sinker': '#F44336'       // Red
    };

    return colors[pitchType] || '#6B7280';
}
