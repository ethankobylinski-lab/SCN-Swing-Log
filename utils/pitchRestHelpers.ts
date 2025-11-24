import { PitchSession } from '../types';

export type RestStatusColor = 'green' | 'yellow' | 'red';

export interface PitchRestStatus {
    lastSessionDate: Date | null;
    totalPitches: number | null;
    requiredRestDays: number | null;
    daysSinceLast: number | null;
    diffDays: number | null;
    restHoursPerPitch: number;
    status: RestStatusColor;
    statusLabel: string;
    statusMessage: string;
}

/**
 * Computes pitching rest status based on the last pitching session.
 * 
 * Logic:
 * - Required rest hours = totalPitches * restHoursPerPitch
 * - Required rest days = requiredRestHours / 24
 * - Days since last = (now - lastSessionEnd) / 24 hours
 * - diffDays = requiredRestDays - daysSinceLast
 * 
 * Status:
 * - Green (diffDays <= 0): Player has met or exceeded required rest
 * - Yellow (0 < diffDays <= 1): Within 24 hours of required rest
 * - Red (diffDays > 1): Still needs more than 1 day of rest
 * 
 * @param lastPitchingSession - Most recent pitching session
 * @param now - Current timestamp
 * @param restHoursPerPitch - Hours of rest required per pitch thrown (default 1.0)
 * @returns PitchRestStatus object with all calculated fields
 */
/**
 * Computes pitching rest status based on a history of pitching sessions.
 * 
 * Logic:
 * - Sort sessions by date (oldest to newest).
 * - Iterate through sessions to calculate running "rest debt" in hours.
 * - For each session:
 *   - Reduce current debt by hours passed since previous session (min 0).
 *   - Add new debt from current session (pitches * restRate).
 * - Finally, reduce debt by hours passed since the last session to now.
 * 
 * Status:
 * - Green (debt <= 0): Player has met or exceeded required rest
 * - Yellow (0 < debt <= 24): Within 24 hours of required rest
 * - Red (debt > 24): Still needs more than 1 day of rest
 * 
 * @param pitchingSessions - List of pitching sessions
 * @param now - Current timestamp
 * @param restHoursPerPitch - Hours of rest required per pitch thrown (default 1.0)
 * @returns PitchRestStatus object with all calculated fields
 */
export function computePitchRestStatus(
    pitchingSessions: PitchSession[],
    now: Date,
    restHoursPerPitch: number = 1.0
): PitchRestStatus {
    // No pitching session yet - neutral status
    if (!pitchingSessions || pitchingSessions.length === 0) {
        return {
            lastSessionDate: null,
            totalPitches: null,
            requiredRestDays: null,
            daysSinceLast: null,
            diffDays: null,
            restHoursPerPitch,
            status: 'green',
            statusLabel: 'No pitching data yet',
            statusMessage: 'Log your first bullpen to start tracking rest.',
        };
    }

    // Sort sessions by date (oldest first)
    const sortedSessions = [...pitchingSessions].sort((a, b) => {
        const dateA = new Date(a.sessionEndTime || a.sessionStartTime).getTime();
        const dateB = new Date(b.sessionEndTime || b.sessionStartTime).getTime();
        return dateA - dateB;
    });

    let currentRestDebtHours = 0;
    let lastSessionTime = 0;

    // Iterate through sessions to accumulate debt
    for (const session of sortedSessions) {
        const sessionTime = new Date(session.sessionEndTime || session.sessionStartTime).getTime();

        if (lastSessionTime > 0) {
            // Calculate hours passed since the previous session
            const hoursPassed = (sessionTime - lastSessionTime) / (1000 * 60 * 60);
            // Reduce debt by hours passed, but don't go below 0
            currentRestDebtHours = Math.max(0, currentRestDebtHours - hoursPassed);
        }

        // Add new debt from this session
        const pitches = session.totalPitches || 0;
        const newDebt = pitches * restHoursPerPitch;
        currentRestDebtHours += newDebt;

        lastSessionTime = sessionTime;
    }

    // Calculate final status relative to NOW
    const nowTime = now.getTime();
    const hoursSinceLast = (nowTime - lastSessionTime) / (1000 * 60 * 60);
    const daysSinceLast = hoursSinceLast / 24;

    // Remaining debt after accounting for time since last session
    const remainingDebtHours = Math.max(0, currentRestDebtHours - hoursSinceLast);
    const requiredRestDays = remainingDebtHours / 24;

    // "diffDays" in the original logic was (Required - Since), so positive means debt remains.
    // Here, requiredRestDays IS the remaining debt in days.
    // So diffDays is effectively requiredRestDays.
    // However, to match the previous return shape where diffDays <= 0 was Green:
    // Let's define diffDays as remainingDebtDays. 
    // If remainingDebtDays > 0, we need rest.
    const diffDays = requiredRestDays;

    // Determine status based on rules
    let status: RestStatusColor;
    let statusLabel: string;
    let statusMessage: string;

    if (diffDays <= 0) {
        // Green: Met or exceeded required rest
        status = 'green';
        statusLabel = 'Good to go';
        statusMessage = "You've had enough rest based on your recent workload.";
    } else if (diffDays <= 1) {
        // Yellow: Within 1 day of required rest
        status = 'yellow';
        statusLabel = 'Borderline';
        statusMessage = "You're within 1 day of your required rest. Monitor workload.";
    } else {
        // Red: Still need more rest
        status = 'red';
        statusLabel = 'Not enough rest';
        statusMessage = `You still need ${diffDays.toFixed(1)} days of rest before a full-intensity outing.`;
    }

    const lastSession = sortedSessions[sortedSessions.length - 1];
    const lastSessionDate = new Date(lastSession.sessionEndTime || lastSession.sessionStartTime);

    return {
        lastSessionDate,
        totalPitches: lastSession.totalPitches, // Displaying last session's pitches for context
        requiredRestDays, // This is now the REMAINING required rest
        daysSinceLast,
        diffDays,
        restHoursPerPitch,
        status,
        statusLabel,
        statusMessage,
    };
}

/**
 * Helper to get the most recent pitching session from a list
 */
export function getMostRecentPitchingSession(sessions: PitchSession[]): PitchSession | null {
    if (sessions.length === 0) return null;

    return sessions.reduce((latest, session) => {
        const sessionEnd = new Date(session.sessionEndTime || session.sessionStartTime);
        const latestEnd = new Date(latest.sessionEndTime || latest.sessionStartTime);
        return sessionEnd > latestEnd ? session : latest;
    });
}
