import { Session, Player, Drill, TeamGoal, SetResult } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TeamGoalProgress {
    goalName: string;
    targetValue: number;
    currentValue: number;
    progressPct: number;
    totalReps: number;
    avgQuality: number;
    topContributors: { name: string; value: number; playerId: string }[];
    lowEngagement: { name: string; daysInactive: number; playerId: string }[];
}

export interface ConsistencyData {
    weeklyData: { day: string; date: string; sessionCount: number }[];
    totalWeeklySessions: number;
    inactivePlayers: { name: string; lastActive: string; daysAgo: number; playerId: string }[];
}

export type PlayerQuadrant = 'high-high' | 'high-low' | 'low-high' | 'low-low';

export interface PlayerQuadrantData {
    name: string;
    playerId: string;
    reps: number;
    quality: number;
    quadrant: PlayerQuadrant;
}

export interface DrillBreakdown {
    drillType: string;
    totalReps: number;
    usagePercent: number;
    successRate: number;
    isUndertrained: boolean;
}

export type IntegrityAlertType = 'perfect-streak' | 'identical-counts' | 'no-variation' | 'too-fast';

export interface IntegrityAlert {
    playerId: string;
    playerName: string;
    alertType: IntegrityAlertType;
    description: string;
    severity: 'low' | 'medium' | 'high';
}

export interface WeeklyTrend {
    weekLabel: string;
    weekStartDate: string;
    avgReps: number;
    avgQuality: number;
    avgExecution: number;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate team goal progress with top contributors and low engagement players
 */
export function calculateTeamGoalProgress(
    goal: TeamGoal,
    sessions: Session[],
    players: Player[]
): TeamGoalProgress {
    // Calculate current value based on goal metric
    let currentValue = 0;
    let totalReps = 0;
    let totalExecuted = 0;
    let totalAttempted = 0;

    const playerContributions = new Map<string, number>();

    sessions.forEach(session => {
        const playerReps = session.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
        const playerExecuted = session.sets.reduce((sum, set) => sum + set.repsExecuted, 0);

        totalReps += playerReps;
        totalAttempted += playerReps;
        totalExecuted += playerExecuted;

        // Track per-player contributions
        const existing = playerContributions.get(session.playerId) || 0;
        playerContributions.set(session.playerId, existing + playerReps);
    });

    // Calculate current value based on metric type
    switch (goal.metric) {
        case 'Execution %':
            currentValue = totalAttempted > 0 ? Math.round((totalExecuted / totalAttempted) * 100) : 0;
            break;
        case 'Total Reps':
            currentValue = totalReps;
            break;
        case 'Hard Hit %':
            const totalHardHits = sessions.reduce((sum, s) =>
                sum + s.sets.reduce((setSum, set) => setSum + set.hardHits, 0), 0
            );
            currentValue = totalAttempted > 0 ? Math.round((totalHardHits / totalAttempted) * 100) : 0;
            break;
        case 'No Strikeouts':
            currentValue = sessions.reduce((sum, s) =>
                sum + s.sets.reduce((setSum, set) => setSum + set.strikeouts, 0), 0
            );
            break;
    }

    const progressPct = goal.targetValue > 0 ? Math.min((currentValue / goal.targetValue) * 100, 100) : 0;
    const avgQuality = totalAttempted > 0 ? Math.round((totalExecuted / totalAttempted) * 100) : 0;

    // Get top contributors
    const topContributors = Array.from(playerContributions.entries())
        .map(([playerId, value]) => ({
            playerId,
            name: players.find(p => p.id === playerId)?.name || 'Unknown',
            value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Get low engagement players (no sessions in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activePlayers = new Set(
        sessions
            .filter(s => new Date(s.date) > sevenDaysAgo)
            .map(s => s.playerId)
    );

    const lowEngagement = players
        .filter(p => !activePlayers.has(p.id))
        .map(p => {
            const lastSession = sessions
                .filter(s => s.playerId === p.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            const daysInactive = lastSession
                ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (24 * 60 * 60 * 1000))
                : 999;

            return {
                playerId: p.id,
                name: p.name,
                daysInactive
            };
        })
        .sort((a, b) => b.daysInactive - a.daysInactive)
        .slice(0, 5);

    return {
        goalName: goal.description,
        targetValue: goal.targetValue,
        currentValue,
        progressPct,
        totalReps,
        avgQuality,
        topContributors,
        lowEngagement
    };
}

/**
 * Get consistency data for the past 7 days
 */
export function getConsistencyData(sessions: Session[], players: Player[]): ConsistencyData {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeklyData: { day: string; date: string; sessionCount: number }[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toISOString().split('T')[0];

        const sessionsOnDay = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
        });

        weeklyData.push({
            day: dayLabel,
            date: dateStr,
            sessionCount: sessionsOnDay.length
        });
    }

    const totalWeeklySessions = weeklyData.reduce((sum, d) => sum + d.sessionCount, 0);

    // Find inactive players (7+ days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPlayerIds = new Set(
        sessions
            .filter(s => new Date(s.date) > sevenDaysAgo)
            .map(s => s.playerId)
    );

    const inactivePlayers = players
        .filter(p => !recentPlayerIds.has(p.id))
        .map(p => {
            const lastSession = sessions
                .filter(s => s.playerId === p.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            return {
                playerId: p.id,
                name: p.name,
                lastActive: lastSession ? new Date(lastSession.date).toLocaleDateString() : 'Never',
                daysAgo: lastSession
                    ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (24 * 60 * 60 * 1000))
                    : 999
            };
        })
        .sort((a, b) => b.daysAgo - a.daysAgo);

    return {
        weeklyData,
        totalWeeklySessions,
        inactivePlayers
    };
}

/**
 * Categorize players into quality vs quantity quadrants
 */
export function categorizePlayersByQuadrant(sessions: Session[], players: Player[]): PlayerQuadrantData[] {
    // Calculate reps and quality for each player
    const playerStats = players.map(player => {
        const playerSessions = sessions.filter(s => s.playerId === player.id);
        const totalReps = playerSessions.reduce((sum, s) =>
            sum + s.sets.reduce((setSum, set) => setSum + set.repsAttempted, 0), 0
        );
        const totalExecuted = playerSessions.reduce((sum, s) =>
            sum + s.sets.reduce((setSum, set) => setSum + set.repsExecuted, 0), 0
        );
        const quality = totalReps > 0 ? Math.round((totalExecuted / totalReps) * 100) : 0;

        return {
            playerId: player.id,
            name: player.name,
            reps: totalReps,
            quality
        };
    }).filter(p => p.reps > 0); // Only include players with activity

    if (playerStats.length === 0) {
        return [];
    }

    // Calculate median reps to determine high/low volume
    const sortedReps = playerStats.map(p => p.reps).sort((a, b) => a - b);
    const medianReps = sortedReps[Math.floor(sortedReps.length / 2)];
    const qualityThreshold = 75; // 75% execution is "high quality"

    return playerStats.map(player => ({
        ...player,
        quadrant: (
            player.reps > medianReps
                ? (player.quality >= qualityThreshold ? 'high-high' : 'high-low')
                : (player.quality >= qualityThreshold ? 'low-high' : 'low-low')
        ) as PlayerQuadrant
    }));
}

/**
 * Analyze drill type usage and success rates
 */
export function analyzeDrillBreakdown(sessions: Session[], drills: Drill[]): DrillBreakdown[] {
    const drillTypeStats = new Map<string, { totalReps: number; totalExecuted: number }>();

    sessions.forEach(session => {
        session.sets.forEach(set => {
            const drillType = set.drillType || 'Unknown';
            const stats = drillTypeStats.get(drillType) || { totalReps: 0, totalExecuted: 0 };
            stats.totalReps += set.repsAttempted;
            stats.totalExecuted += set.repsExecuted;
            drillTypeStats.set(drillType, stats);
        });
    });

    const totalAllReps = Array.from(drillTypeStats.values()).reduce((sum, s) => sum + s.totalReps, 0);

    const breakdown = Array.from(drillTypeStats.entries()).map(([drillType, stats]) => ({
        drillType,
        totalReps: stats.totalReps,
        usagePercent: totalAllReps > 0 ? Math.round((stats.totalReps / totalAllReps) * 100) : 0,
        successRate: stats.totalReps > 0 ? Math.round((stats.totalExecuted / stats.totalReps) * 100) : 0,
        isUndertrained: totalAllReps > 0 && (stats.totalReps / totalAllReps) < 0.20 // Less than 20%
    }));

    return breakdown.sort((a, b) => b.totalReps - a.totalReps);
}

/**
 * Detect potential data integrity issues
 */
export function detectIntegrityIssues(sessions: Session[], players: Player[]): IntegrityAlert[] {
    const alerts: IntegrityAlert[] = [];

    players.forEach(player => {
        const playerSessions = sessions
            .filter(s => s.playerId === player.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (playerSessions.length < 3) return; // Need at least 3 sessions to detect patterns

        // Check 1: Perfect execution streak
        const perfectStreak = playerSessions.slice(-5).every(session => {
            const totalAttempted = session.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
            const totalExecuted = session.sets.reduce((sum, set) => sum + set.repsExecuted, 0);
            return totalAttempted > 0 && totalExecuted === totalAttempted;
        });

        if (perfectStreak && playerSessions.length >= 5) {
            alerts.push({
                playerId: player.id,
                playerName: player.name,
                alertType: 'perfect-streak',
                description: '100% execution for 5+ consecutive sessions',
                severity: 'medium'
            });
        }

        // Check 2: Identical rep counts
        const recentRepCounts = playerSessions.slice(-5).map(s =>
            s.sets.reduce((sum, set) => sum + set.repsAttempted, 0)
        );
        const allSame = recentRepCounts.every((count, _, arr) => count === arr[0]);

        if (allSame && recentRepCounts.length >= 3 && recentRepCounts[0] > 0) {
            alerts.push({
                playerId: player.id,
                playerName: player.name,
                alertType: 'identical-counts',
                description: `Same rep count (${recentRepCounts[0]}) for 3+ sessions`,
                severity: 'low'
            });
        }

        // Check 3: No variation in results
        const recentQualities = playerSessions.slice(-5).map(s => {
            const totalAttempted = s.sets.reduce((sum, set) => sum + set.repsAttempted, 0);
            const totalExecuted = s.sets.reduce((sum, set) => sum + set.repsExecuted, 0);
            return totalAttempted > 0 ? Math.round((totalExecuted / totalAttempted) * 100) : 0;
        });

        if (recentQualities.length >= 5) {
            const variance = calculateVariance(recentQualities);
            if (variance < 5) { // Very low variance
                alerts.push({
                    playerId: player.id,
                    playerName: player.name,
                    alertType: 'no-variation',
                    description: 'Almost no variation in execution % over 5 sessions',
                    severity: 'low'
                });
            }
        }

        // Check 4: Sessions logged too quickly
        playerSessions.slice(-3).forEach(session => {
            if (session.createdAt && session.date) {
                const sessionDate = new Date(session.date);
                const createdDate = new Date(session.createdAt);
                const minutesDiff = (createdDate.getTime() - sessionDate.getTime()) / (1000 * 60);

                if (minutesDiff < 5 && minutesDiff >= 0) {
                    alerts.push({
                        playerId: player.id,
                        playerName: player.name,
                        alertType: 'too-fast',
                        description: 'Session logged less than 5 minutes after start time',
                        severity: 'high'
                    });
                }
            }
        });
    });

    return alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
    });
}

/**
 * Calculate weekly trends over the past 4 weeks
 */
export function calculateWeeklyTrends(sessions: Session[]): WeeklyTrend[] {
    const trends: WeeklyTrend[] = [];
    const today = new Date();

    for (let weekOffset = 3; weekOffset >= 0; weekOffset--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (weekOffset * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() - (weekOffset * 7));
        weekEnd.setHours(23, 59, 59, 999);

        const weekSessions = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= weekStart && sessionDate <= weekEnd;
        });

        const totalReps = weekSessions.reduce((sum, s) =>
            sum + s.sets.reduce((setSum, set) => setSum + set.repsAttempted, 0), 0
        );
        const totalExecuted = weekSessions.reduce((sum, s) =>
            sum + s.sets.reduce((setSum, set) => setSum + set.repsExecuted, 0), 0
        );

        const avgReps = weekSessions.length > 0 ? Math.round(totalReps / weekSessions.length) : 0;
        const avgExecution = totalReps > 0 ? Math.round((totalExecuted / totalReps) * 100) : 0;
        const avgQuality = avgExecution; // Same as execution for simplicity

        const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        trends.push({
            weekLabel,
            weekStartDate: weekStart.toISOString().split('T')[0],
            avgReps,
            avgQuality,
            avgExecution
        });
    }

    return trends;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate variance for a set of numbers
 */
function calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;

    return Math.sqrt(variance); // Return standard deviation
}
