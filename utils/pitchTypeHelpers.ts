/**
 * Pitch Type Helpers
 * 
 * Centralizes pitch type code-to-name mapping and related utilities.
 * This ensures consistent display of pitch types across the entire app.
 */

/**
 * Maps pitch type codes to human-readable names.
 * 
 * @param code - The pitch type code (e.g. "FB", "CH", "CB")
 * @param fallbackName - Optional fallback name from PitchTypeModel.name
 * @returns Human-readable pitch type name (e.g. "Fastball", "Changeup", "Curveball")
 * 
 * To customize the labels shown to users, edit the codeMap below.
 */
export function getPitchTypeDisplayName(code: string, fallbackName?: string): string {
    // Map of standard pitch type codes to full display names
    const codeMap: Record<string, string> = {
        'FB': 'Fastball',
        'CH': 'Changeup',
        'CB': 'Curveball',
        'SL': 'Slider',
        'SI': 'Sinker',
    };

    // Normalize code to uppercase for case-insensitive matching
    const normalizedCode = code.toUpperCase();

    // Return mapped name, or fallback name, or original code if no match
    return codeMap[normalizedCode] || fallbackName || code;
}

/**
 * Gets a short display code for a pitch type (2-3 characters).
 * This is useful for compact displays like charts or small labels.
 * 
 * @param code - The pitch type code
 * @returns Short display code (e.g. "FB", "CH")
 */
export function getPitchTypeShortCode(code: string): string {
    return code.toUpperCase();
}
