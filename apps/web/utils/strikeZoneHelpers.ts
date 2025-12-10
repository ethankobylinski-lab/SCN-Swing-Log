import { ZoneId, PitchType } from '../types';

/**
 * Strike Zone Helper Functions
 * 
 * These utilities provide precise coordinate mapping and zone calculations
 * for the live pitch logger, ensuring data consistency for analytics.
 */

// ============================================================================
// Zone ID Mapping
// ============================================================================

export interface ZoneCoordinates {
    zoneId: ZoneId;
    row: number; // 0-2, where 0 is top
    col: number; // 0-2, where 0 is left (catcher view)
}

/**
 * Map zone ID to row/col indices
 * Z11 = top-left (row 0, col 0)
 * Z33 = bottom-right (row 2, col 2)
 */
export function zoneIdToRowCol(zoneId: ZoneId): { row: number; col: number } | null {
    const zones3x3: ZoneId[] = [
        'Z11', 'Z12', 'Z13',
        'Z21', 'Z22', 'Z23',
        'Z31', 'Z32', 'Z33'
    ];

    const index = zones3x3.indexOf(zoneId);
    if (index === -1) return null; // Edge zone or invalid

    const row = Math.floor(index / 3);
    const col = index % 3;

    return { row, col };
}

/**
 * Map row/col to zone ID
 */
export function rowColToZoneId(row: number, col: number): ZoneId {
    const zones: ZoneId[][] = [
        ['Z11', 'Z12', 'Z13'], // top row
        ['Z21', 'Z22', 'Z23'], // middle row
        ['Z31', 'Z32', 'Z33']  // bottom row
    ];

    const clampedRow = Math.max(0, Math.min(2, row));
    const clampedCol = Math.max(0, Math.min(2, col));

    return zones[clampedRow][clampedCol];
}

/**
 * Get the center coordinates (normalized 0-1) for a given zone
 */
export function getZoneCenter(zoneId: ZoneId): { x: number; y: number } {
    const rowCol = zoneIdToRowCol(zoneId);
    if (!rowCol) {
        // Default to middle-middle for edge zones
        return { x: 0.5, y: 0.5 };
    }

    const { row, col } = rowCol;

    // Each zone is 1/3 wide and 1/3 tall
    // Center is at col/3 + 1/6 and row/3 + 1/6
    const x = (col / 3) + (1 / 6);
    const y = 1 - ((row / 3) + (1 / 6)); // Flip Y (0 at bottom)

    return { x, y };
}

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert pixel coordinates to normalized (0-1) coordinates
 * @param clientX - Mouse/touch X in viewport
 * @param clientY - Mouse/touch Y in viewport
 * @param rect - Bounding rect of the container element
 * @returns Normalized coordinates where (0,0) is bottom-left, (1,1) is top-right
 */
export function pixelToNormalized(
    clientX: number,
    clientY: number,
    rect: DOMRect
): { x: number; y: number } {
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height; // Flip Y so 0 is bottom

    return { x, y };
}

/**
 * Determine which zone a click falls into based on normalized coordinates
 * @param x - Normalized X (0 = left, 1 = right)
 * @param y - Normalized Y (0 = bottom, 1 = top)
 * @returns Zone ID
 */
export function coordsToZone(x: number, y: number, pitcherHand: 'R' | 'L' = 'R'): ZoneId {
    // Grid boundaries (centered 60% of the 90-unit clickable area)
    // Start: (90-60)/2 / 90 = 15/90 = 0.1667
    // End: (15+60)/90 = 75/90 = 0.8333
    const GRID_START = 15 / 90;
    const GRID_END = 75 / 90;

    // Margin for "touching the edge" (approx ball radius)
    // A baseball is ~2.9" diam, plate is 17". Ball radius is ~8.5% of zone width.
    // Zone width in normalized units is (75-15)/90 = 60/90 = 0.666
    // 8.5% of 0.666 is ~0.056. Let's use 0.05 for a generous "touching" margin.
    const MARGIN = 0.05;

    const EXPANDED_START = GRID_START - MARGIN;
    const EXPANDED_END = GRID_END + MARGIN;

    // Check for Edge/Out of Zone (using expanded boundaries)
    if (y > EXPANDED_END) return 'EDGE_HIGH';
    if (y < EXPANDED_START) return 'EDGE_LOW';

    if (x < EXPANDED_START) {
        // Left side (Catcher View)
        // RHP: Arm Side is Left
        // LHP: Glove Side is Left
        return pitcherHand === 'R' ? 'EDGE_ARM' : 'EDGE_GLOVE';
    }

    if (x > EXPANDED_END) {
        // Right side (Catcher View)
        // RHP: Glove Side is Right
        // LHP: Arm Side is Right
        return pitcherHand === 'R' ? 'EDGE_GLOVE' : 'EDGE_ARM';
    }

    // Inside Expanded Grid - Map to 3x3
    // We clamp the values to the strict grid for row/col calculation
    // so that "touching the edge" maps to the nearest zone (e.g. Z11)
    // instead of calculating a row/col index of -1 or 3.
    const clampedX = Math.max(GRID_START + 0.001, Math.min(GRID_END - 0.001, x));
    const clampedY = Math.max(GRID_START + 0.001, Math.min(GRID_END - 0.001, y));

    // Normalize x/y to 0-1 within the grid for row/col calculation
    const gridX = (clampedX - GRID_START) / (GRID_END - GRID_START);
    const gridY = (clampedY - GRID_START) / (GRID_END - GRID_START);

    // Map x to column (0, 1, 2)
    const col = Math.floor(gridX * 3);
    const clampedCol = Math.max(0, Math.min(2, col));

    // Map y to row (0, 1, 2) - remember y=1 is top
    // Note: Our input y is 0=bottom, 1=top.
    // But row 0 is top. So we invert y.
    const row = Math.floor((1 - gridY) * 3);
    const clampedRow = Math.max(0, Math.min(2, row));

    return rowColToZoneId(clampedRow, clampedCol);
}

// ============================================================================
// Distance Calculations
// ============================================================================

/**
 * Calculate the Euclidean distance between two normalized points
 */
export function distance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance from a point to the intended target
 */
export function distanceToTarget(
    actualX: number,
    actualY: number,
    intendedX: number,
    intendedY: number
): number {
    return distance(actualX, actualY, intendedX, intendedY);
}

/**
 * Calculate proximity score (0-1, where 1 = perfect hit)
 * Uses an exponential decay based on distance
 */
export function proximityScore(
    actualX: number,
    actualY: number,
    intendedX: number,
    intendedY: number
): number {
    const dist = distanceToTarget(actualX, actualY, intendedX, intendedY);

    // Define a threshold distance (e.g., 0.15 normalized units)
    // At this distance, proximity drops to ~0.37 (e^-1)
    const decayRate = 6.67; // 1 / 0.15

    return Math.exp(-decayRate * dist);
}

/**
 * Determine if a point is inside the official strike zone
 * (Simplified: assumes full 3x3 grid is the strike zone)
 */
export function isInStrikeZone(x: number, y: number): boolean {
    // For a simplified implementation, the entire grid is the strike zone
    // If you have specific boundaries, adjust these values
    return x >= 0 && x <= 1 && y >= 0 && y <= 1;
}

/**
 * Calculate the minimum distance from a point to the strike zone boundary
 * Returns 0 if inside the zone, positive if outside
 */
export function distanceToStrikeZone(x: number, y: number): number {
    if (isInStrikeZone(x, y)) return 0;

    // Calculate distance to nearest edge
    const dx = Math.max(0, Math.max(-x, x - 1));
    const dy = Math.max(0, Math.max(-y, y - 1));

    return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// Pitch Type Colors
// ============================================================================

/**
 * Get the color for a pitch type
 * This can be customized per your preference
 */
export function getPitchTypeColor(pitchType: PitchType): string {
    const colors: Record<PitchType, string> = {
        'Fastball': '#2196F3',    // Blue
        'Changeup': '#4CAF50',    // Green
        'Curveball': '#FF9800',   // Orange
        'Slider': '#9C27B0',      // Purple
        'Sinker': '#F44336'       // Red
    };

    return colors[pitchType] || '#757575'; // Default gray
}

/**
 * Get a custom color from a pitch type model
 */
export function getCustomPitchColor(colorHex?: string, fallbackPitchType?: PitchType): string {
    if (colorHex) return colorHex;
    if (fallbackPitchType) return getPitchTypeColor(fallbackPitchType);
    return '#757575'; // Default gray
}

// ============================================================================
// Validation
// ============================================================================

export function validateNormalizedCoords(x: number, y: number): boolean {
    return x >= 0 && x <= 1 && y >= 0 && y <= 1;
}

// ============================================================================
// Real-World Inch Calculations
// ============================================================================

export const STRIKE_ZONE_WIDTH_IN = 19;
export const STRIKE_ZONE_HEIGHT_IN = 24;

export interface ZoneCell {
    row: number;
    col: number;
}

/**
 * Get the center of a grid cell in inches relative to the center of the zone (0,0)
 * x: negative = glove side (left), positive = arm side (right)
 * y: negative = down, positive = up
 */
export function cellCenterInches(row: number, col: number): { x: number; y: number } {
    // Grid is 3x3
    // Cols: 0 (left), 1 (center), 2 (right)
    // Rows: 0 (top), 1 (center), 2 (bottom)

    const cellWidth = STRIKE_ZONE_WIDTH_IN / 3;
    const cellHeight = STRIKE_ZONE_HEIGHT_IN / 3;

    // Calculate x (horizontal)
    // col 0 -> -cellWidth
    // col 1 -> 0
    // col 2 -> +cellWidth
    const x = (col - 1) * cellWidth;

    // Calculate y (vertical)
    // row 0 (top) -> +cellHeight
    // row 1 (center) -> 0
    // row 2 (bottom) -> -cellHeight
    const y = (1 - row) * cellHeight;

    return { x, y };
}

/**
 * Calculate distance between intended and actual target in inches
 */
export function distanceFromTargetInches(
    intended: ZoneCell,
    actual: ZoneCell
): { dxInches: number; dyInches: number; distanceInches: number } {
    const intendedCenter = cellCenterInches(intended.row, intended.col);
    const actualCenter = cellCenterInches(actual.row, actual.col);

    const dxInches = actualCenter.x - intendedCenter.x;
    const dyInches = actualCenter.y - intendedCenter.y;
    const distanceInches = Math.sqrt(dxInches * dxInches + dyInches * dyInches);

    return {
        dxInches: parseFloat(dxInches.toFixed(2)),
        dyInches: parseFloat(dyInches.toFixed(2)),
        distanceInches: parseFloat(distanceInches.toFixed(2))
    };
}
