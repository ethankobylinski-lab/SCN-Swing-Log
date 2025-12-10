import { PitchSession } from '../types';

/**
 * Generate a unique, readable title for a pitch session
 * Format: "Bullpen - Nov 21, 9:00 AM (45 pitches)"
 */
export const generatePitchSessionTitle = (session: PitchSession): string => {
    const date = new Date(session.sessionEndTime || session.createdAt);

    // Format date: "Nov 21"
    const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    // Format time: "9:00 AM"
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Pitch count
    const pitchCount = session.totalPitches || 0;

    // Generate title
    return `Bullpen - ${dateStr}, ${timeStr} (${pitchCount} pitches)`;
};
