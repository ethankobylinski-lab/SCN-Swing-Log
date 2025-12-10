import { Player, Session, PitchSession } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EngagementTier = 'active' | 'at-risk' | 'inactive' | 'never-recorded';

export interface PlayerEngagementData {
    playerId: string;
    playerName: string;
    tier: EngagementTier;
    daysSinceLastActivity: number;
    lastActivityDate: string | null;
    totalHittingSessions: number;
    totalPitchingSessions: number;
    totalSessions: number;
}

export interface TeamEngagementDistribution {
    active: number;
    atRisk: number;
    inactive: number;
    neverRecorded: number;
    totalPlayers: number;
}

export interface TrendDataPoint {
    date: string;
    label: string;
    sessionCount: number;
    uniquePlayers: number;
}

// ============================================================================
// ENGAGEMENT TIER THRESHOLDS (in days)
// ============================================================================

const ACTIVE_THRESHOLD = 3;      // 0-3 days = Active (🟢)
const AT_RISK_THRESHOLD = 7;     // 3-7 days = At Risk (🟡)
// 7+ days = Inactive (🔴)

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get the most recent activity date for a player (hitting or pitching)
 */
export function getLastActivityDate(
    playerId: string,
    sessions: Session[],
    pitchSessions: PitchSession[]
): Date | null {
    const playerHittingSessions = sessions.filter(s => s.playerId === playerId);
    const playerPitchingSessions = pitchSessions.filter(s => s.pitcherId === playerId);

    const lastHitting = playerHittingSessions.length > 0
        ? new Date(playerHittingSessions.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date)
        : null;

    const lastPitching = playerPitchingSessions.length > 0
        ? new Date(playerPitchingSessions.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date)
        : null;

    if (!lastHitting && !lastPitching) return null;
    if (!lastHitting) return lastPitching;
    if (!lastPitching) return lastHitting;

    return lastHitting > lastPitching ? lastHitting : lastPitching;
}

/**
 * Calculate days since last activity for a player
 * Returns 999 if player has never recorded a session
 */
export function getDaysSinceLastActivity(
    playerId: string,
    sessions: Session[],
    pitchSessions: PitchSession[]
): number {
    const lastActivity = getLastActivityDate(playerId, sessions, pitchSessions);

    if (!lastActivity) return 999;

    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Determine engagement tier for a player based on days since last activity
 */
export function getPlayerEngagementTier(
    playerId: string,
    sessions: Session[],
    pitchSessions: PitchSession[]
): EngagementTier {
    const days = getDaysSinceLastActivity(playerId, sessions, pitchSessions);

    if (days === 999) return 'never-recorded';
    if (days <= ACTIVE_THRESHOLD) return 'active';
    if (days <= AT_RISK_THRESHOLD) return 'at-risk';
    return 'inactive';
}

/**
 * Get complete engagement data for a player
 */
export function getPlayerEngagement(
    player: Player,
    sessions: Session[],
    pitchSessions: PitchSession[]
): PlayerEngagementData {
    const playerHittingSessions = sessions.filter(s => s.playerId === player.id);
    const playerPitchingSessions = pitchSessions.filter(s => s.pitcherId === player.id);

    const daysSinceLastActivity = getDaysSinceLastActivity(player.id, sessions, pitchSessions);
    const lastActivity = getLastActivityDate(player.id, sessions, pitchSessions);
    const tier = getPlayerEngagementTier(player.id, sessions, pitchSessions);

    return {
        playerId: player.id,
        playerName: player.name,
        tier,
        daysSinceLastActivity,
        lastActivityDate: lastActivity ? lastActivity.toISOString() : null,
        totalHittingSessions: playerHittingSessions.length,
        totalPitchingSessions: playerPitchingSessions.length,
        totalSessions: playerHittingSessions.length + playerPitchingSessions.length
    };
}

/**
 * Get engagement distribution for entire team
 */
export function getTeamEngagementDistribution(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): TeamEngagementDistribution {
    const distribution = {
        active: 0,
        atRisk: 0,
        inactive: 0,
        neverRecorded: 0,
        totalPlayers: players.length
    };

    players.forEach(player => {
        const tier = getPlayerEngagementTier(player.id, sessions, pitchSessions);
        switch (tier) {
            case 'active':
                distribution.active++;
                break;
            case 'at-risk':
                distribution.atRisk++;
                break;
            case 'inactive':
                distribution.inactive++;
                break;
            case 'never-recorded':
                distribution.neverRecorded++;
                break;
        }
    });

    return distribution;
}

/**
 * Get all players with their engagement data, sorted by urgency
 * (never-recorded > inactive > at-risk > active)
 */
export function getAllPlayersEngagement(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): PlayerEngagementData[] {
    const tierPriority: Record<EngagementTier, number> = {
        'never-recorded': 4,
        'inactive': 3,
        'at-risk': 2,
        'active': 1
    };

    return players
        .map(player => getPlayerEngagement(player, sessions, pitchSessions))
        .sort((a, b) => {
            // First sort by tier urgency
            const tierDiff = tierPriority[b.tier] - tierPriority[a.tier];
            if (tierDiff !== 0) return tierDiff;

            // Within same tier, sort by days since activity (most urgent first)
            return b.daysSinceLastActivity - a.daysSinceLastActivity;
        });
}

/**
 * Get players who are at risk (3-7 days since last activity)
 */
export function getAtRiskPlayers(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): PlayerEngagementData[] {
    return getAllPlayersEngagement(players, sessions, pitchSessions)
        .filter(p => p.tier === 'at-risk');
}

/**
 * Get inactive players (7+ days since last activity, but have recorded at least once)
 */
export function getInactivePlayers(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): PlayerEngagementData[] {
    return getAllPlayersEngagement(players, sessions, pitchSessions)
        .filter(p => p.tier === 'inactive');
}

/**
 * Get players who have never recorded any sessions
 */
export function getNeverRecordedPlayers(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): PlayerEngagementData[] {
    return getAllPlayersEngagement(players, sessions, pitchSessions)
        .filter(p => p.tier === 'never-recorded');
}

/**
 * Get players who need attention (at-risk, inactive, or never-recorded)
 * Limited to top N by default
 */
export function getPlayersNeedingAttention(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[],
    limit: number = 5
): PlayerEngagementData[] {
    return getAllPlayersEngagement(players, sessions, pitchSessions)
        .filter(p => p.tier !== 'active')
        .slice(0, limit);
}

/**
 * Calculate daily participation trend over specified number of days
 */
export function getParticipationTrendData(
    sessions: Session[],
    pitchSessions: PitchSession[],
    days: number = 7
): TrendDataPoint[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trendData: TrendDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toISOString().split('T')[0];

        // Filter sessions for this specific day
        const hittingSessionsOnDay = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
        });

        const pitchingSessionsOnDay = pitchSessions.filter(s => {
            const sessionDate = new Date(s.date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
        });

        const totalSessions = hittingSessionsOnDay.length + pitchingSessionsOnDay.length;

        // Count unique players
        const uniquePlayerIds = new Set<string>([
            ...hittingSessionsOnDay.map(s => s.playerId),
            ...pitchingSessionsOnDay.map(s => s.pitcherId)
        ]);

        trendData.push({
            date: dateStr,
            label: dayLabel,
            sessionCount: totalSessions,
            uniquePlayers: uniquePlayerIds.size
        });
    }

    return trendData;
}

/**
 * Calculate team health percentage (0-100)
 * Based on percentage of players who are "active"
 */
export function getTeamHealthScore(
    players: Player[],
    sessions: Session[],
    pitchSessions: PitchSession[]
): number {
    if (players.length === 0) return 0;

    const distribution = getTeamEngagementDistribution(players, sessions, pitchSessions);
    return Math.round((distribution.active / distribution.totalPlayers) * 100);
}

/**
 * Get engagement tier display properties (color, label, icon)
 */
export function getTierDisplayInfo(tier: EngagementTier): {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    icon: string;
} {
    switch (tier) {
        case 'active':
            return {
                color: '#22c55e',
                bgColor: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                label: 'Active',
                icon: '🟢'
            };
        case 'at-risk':
            return {
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                label: 'At Risk',
                icon: '🟡'
            };
        case 'inactive':
            return {
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                label: 'Inactive',
                icon: '🔴'
            };
        case 'never-recorded':
            return {
                color: '#94a3b8',
                bgColor: 'rgba(148, 163, 184, 0.1)',
                borderColor: 'rgba(148, 163, 184, 0.3)',
                label: 'Never Recorded',
                icon: '⚪'
            };
    }
}
