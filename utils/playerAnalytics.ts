import { Session, PitchSession, Drill } from '../types';

export interface StrengthWeakness {
    metric: string;
    value: string | number;
    type: 'strength' | 'weakness';
    insight: string;
}

export interface RecentTrend {
    date: string;
    volume: number;
    type: 'hitting' | 'pitching';
}

/**
 * Analyzes player sessions to identify strengths and weaknesses.
 * Focuses on execution quality, consistency, and volume.
 */
export const analyzePlayerStrengths = (
    sessions: Session[],
    pitchSessions: PitchSession[]
): StrengthWeakness[] => {
    const insights: StrengthWeakness[] = [];

    // 1. Analyze Hitting Consistency (Last 5 sessions)
    const recentHitting = sessions.slice(0, 5);
    if (recentHitting.length >= 3) {
        const avgReps = recentHitting.reduce((sum, s) => sum + s.sets.reduce((acc, set) => acc + set.repsAttempted, 0), 0) / recentHitting.length;

        if (avgReps > 50) {
            insights.push({
                metric: 'Volume',
                value: Math.round(avgReps),
                type: 'strength',
                insight: 'High training volume'
            });
        } else if (avgReps < 20) {
            insights.push({
                metric: 'Volume',
                value: Math.round(avgReps),
                type: 'weakness',
                insight: 'Low rep count per session'
            });
        }
    }

    // 2. Analyze Pitching Strike % (Last 5 sessions)
    const recentPitching = pitchSessions.slice(0, 5);
    if (recentPitching.length >= 3) {
        const validSessions = recentPitching.filter(s => s.analytics?.strikePct !== undefined || (s.pitchRecords && s.pitchRecords.length > 0));

        if (validSessions.length >= 3) {
            const avgStrikeRate = validSessions.reduce((sum, s) => {
                if (s.analytics?.strikePct) return sum + s.analytics.strikePct;
                // Fallback to calculating from records if analytics missing but records exist
                if (s.pitchRecords && s.pitchRecords.length > 0) {
                    const strikes = s.pitchRecords.filter(p => ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(p.outcome)).length;
                    return sum + (strikes / s.pitchRecords.length) * 100;
                }
                return sum;
            }, 0) / validSessions.length;

            if (avgStrikeRate > 65) {
                insights.push({
                    metric: 'Strike %',
                    value: `${Math.round(avgStrikeRate)}%`,
                    type: 'strength',
                    insight: 'Excellent command'
                });
            } else if (avgStrikeRate < 50) {
                insights.push({
                    metric: 'Strike %',
                    value: `${Math.round(avgStrikeRate)}%`,
                    type: 'weakness',
                    insight: 'Struggling with zone control'
                });
            }
        }
    }

    // 3. Consistency Check (Sessions per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklySessions = sessions.filter(s => new Date(s.date) >= oneWeekAgo).length +
        pitchSessions.filter(s => new Date(s.date) >= oneWeekAgo).length;

    if (weeklySessions >= 4) {
        insights.push({
            metric: 'Consistency',
            value: `${weeklySessions} sessions`,
            type: 'strength',
            insight: 'Consistent daily work'
        });
    } else if (weeklySessions === 0) {
        insights.push({
            metric: 'Consistency',
            value: '0 sessions',
            type: 'weakness',
            insight: 'No activity this week'
        });
    }

    return insights.sort((a, b) => (a.type === 'strength' ? -1 : 1)).slice(0, 4);
};

/**
 * Calculates daily session volume for the last 14 days.
 */
export const calculateRecentTrends = (
    sessions: Session[],
    pitchSessions: PitchSession[]
): RecentTrend[] => {
    const trends: RecentTrend[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const hittingCount = sessions.filter(s => s.date.startsWith(dateStr)).length;
        const pitchingCount = pitchSessions.filter(s => s.date.startsWith(dateStr)).length;

        if (hittingCount > 0) {
            trends.push({ date: dateStr, volume: hittingCount, type: 'hitting' });
        }
        if (pitchingCount > 0) {
            trends.push({ date: dateStr, volume: pitchingCount, type: 'pitching' });
        }
        if (hittingCount === 0 && pitchingCount === 0) {
            trends.push({ date: dateStr, volume: 0, type: 'hitting' }); // Placeholder
        }
    }

    return trends;
};
