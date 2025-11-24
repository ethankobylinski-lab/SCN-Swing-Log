import { useMemo } from 'react';
import { PitchSession, PitchRecord, Player, TargetZone, PitchType, CountSituation, ZoneId } from '../types';
import { formatDate } from '../utils/helpers';
import { PITCH_TYPES } from '../constants';

export interface TopPlayer {
    name: string;
    value: number;
    reps: number;
}

export interface PitchingBreakdownData {
    name: string;
    pitches: number;
    strikePct: number;
    topPlayers: TopPlayer[];
}

export interface CoachPitchingAnalyticsData {
    performanceOverTimeData: { name: string; 'Strike %': number; 'Total Pitches': number }[];
    pitchingBreakdowns: {
        byPitchType: PitchingBreakdownData[];
        byCount: PitchingBreakdownData[];
        byZone: (PitchingBreakdownData & { zone: TargetZone })[];
    };
    topPerformers: {
        velocity: TopPlayer[];
        command: TopPlayer[];
    };
}

export const usePitchingAnalytics = (
    pitchSessions: PitchSession[],
    players: Player[]
): CoachPitchingAnalyticsData | null => {
    return useMemo((): CoachPitchingAnalyticsData | null => {
        if (pitchSessions.length === 0 || players.length === 0) {
            return null;
        }

        // 1. Performance Over Time (Strike % and First Pitch Strike %)
        const dailyStats = new Map<string, { total: number; strikes: number; }>();

        pitchSessions.forEach(session => {
            const dateKey = new Date(session.date).toISOString().split('T')[0];
            if (!dailyStats.has(dateKey)) {
                dailyStats.set(dateKey, { total: 0, strikes: 0 });
            }
            const entry = dailyStats.get(dateKey)!;

            if (session.pitchRecords && session.pitchRecords.length > 0) {
                session.pitchRecords.forEach(pitch => {
                    entry.total++;
                    if (pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike' || pitch.outcome === 'foul' || pitch.outcome === 'in_play') {
                        entry.strikes++;
                    }
                });
            }
        });

        const performanceOverTimeData = Array.from(dailyStats.entries())
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, stats]) => ({
                name: formatDate(date, { month: 'short', day: 'numeric' }),
                'Strike %': stats.total > 0 ? Math.round((stats.strikes / stats.total) * 100) : 0,
                'Total Pitches': stats.total,
            }));

        // 2. Top Performers Helper
        const playerTotals = new Map<string, {
            pitches: number;
            strikes: number;
            velocitySum: number;
            velocityCount: number;
        }>();

        pitchSessions.forEach(session => {
            if (!playerTotals.has(session.pitcherId)) {
                playerTotals.set(session.pitcherId, { pitches: 0, strikes: 0, velocitySum: 0, velocityCount: 0 });
            }
            const stats = playerTotals.get(session.pitcherId)!;

            if (session.pitchRecords) {
                session.pitchRecords.forEach(pitch => {
                    stats.pitches++;
                    if (pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike' || pitch.outcome === 'foul' || pitch.outcome === 'in_play') {
                        stats.strikes++;
                    }
                    if (pitch.velocityMph) {
                        stats.velocitySum += pitch.velocityMph;
                        stats.velocityCount++;
                    }
                });
            }
        });

        const topVelocity = Array.from(playerTotals.entries())
            .map(([id, stats]) => {
                const player = players.find(p => p.id === id);
                return player && stats.velocityCount > 0 ? {
                    name: player.name,
                    value: Math.round(stats.velocitySum / stats.velocityCount),
                    reps: stats.velocityCount
                } : null;
            })
            .filter((p): p is TopPlayer => p !== null)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

        // 3. Breakdowns
        const byPitchTypeMap = new Map<string, { pitches: number; strikes: number; playerStats: Map<string, { pitches: number; strikes: number }> }>();
        const byCountMap = new Map<string, { pitches: number; strikes: number; playerStats: Map<string, { pitches: number; strikes: number }> }>();
        const byZoneMap = new Map<string, { pitches: number; strikes: number; playerStats: Map<string, { pitches: number; strikes: number }> }>();

        const getZoneName = (zoneId: ZoneId, batterSide: 'R' | 'L' = 'R'): TargetZone | null => {
            const isRighty = batterSide === 'R';
            switch (zoneId) {
                case 'Z11': return isRighty ? 'Inside High' : 'Outside High';
                case 'Z12': return 'Middle High';
                case 'Z13': return isRighty ? 'Outside High' : 'Inside High';
                case 'Z21': return isRighty ? 'Inside Middle' : 'Outside Middle';
                case 'Z22': return 'Middle Middle';
                case 'Z23': return isRighty ? 'Outside Middle' : 'Inside Middle';
                case 'Z31': return isRighty ? 'Inside Low' : 'Outside Low';
                case 'Z32': return 'Middle Low';
                case 'Z33': return isRighty ? 'Outside Low' : 'Inside Low';
                default: return null;
            }
        };

        pitchSessions.forEach(session => {
            if (session.pitchRecords) {
                session.pitchRecords.forEach(pitch => {
                    const isStrike = pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike' || pitch.outcome === 'foul' || pitch.outcome === 'in_play';

                    // Helper to update maps
                    const updateMap = (map: Map<string, any>, key: string) => {
                        if (!map.has(key)) {
                            map.set(key, { pitches: 0, strikes: 0, playerStats: new Map() });
                        }
                        const entry = map.get(key)!;
                        entry.pitches++;
                        if (isStrike) entry.strikes++;

                        if (!entry.playerStats.has(session.pitcherId)) {
                            entry.playerStats.set(session.pitcherId, { pitches: 0, strikes: 0 });
                        }
                        const pStats = entry.playerStats.get(session.pitcherId)!;
                        pStats.pitches++;
                        if (isStrike) pStats.strikes++;
                    };

                    // Pitch Type
                    if (pitch.pitchTypeId) {
                        // Assuming pitchTypeId might be like 'PT1', 'PT2' etc or just the name
                        // We try to map it to a name if it looks like an ID, otherwise use it as is
                        let pitchTypeName = pitch.pitchTypeId;
                        if (pitch.pitchTypeId.startsWith('PT')) {
                             const index = parseInt(pitch.pitchTypeId.replace('PT', '')) - 1;
                             if (PITCH_TYPES[index]) {
                                 pitchTypeName = PITCH_TYPES[index];
                             }
                        }
                        updateMap(byPitchTypeMap, pitchTypeName);
                    }

                    // Count (Balls-Strikes)
                    const count = `${pitch.ballsBefore}-${pitch.strikesBefore}`;
                    updateMap(byCountMap, count);

                    // Zone
                    if (pitch.actualZone) {
                        const targetZone = getZoneName(pitch.actualZone, pitch.batterSide);
                        if (targetZone) updateMap(byZoneMap, targetZone);
                    }
                });
            }
        });

        const formatBreakdown = (map: Map<string, any>, keyLabel: string = 'name') => {
            return Array.from(map.entries()).map(([key, data]) => {
                const topPlayers = Array.from(data.playerStats.entries())
                    .map(([pid, pData]: [string, any]) => {
                        const player = players.find(p => p.id === pid);
                        return player ? {
                            name: player.name,
                            value: pData.pitches > 0 ? Math.round((pData.strikes / pData.pitches) * 100) : 0,
                            reps: pData.pitches
                        } : null;
                    })
                    .filter((p): p is TopPlayer => p !== null && p.reps >= 10) // Min 10 pitches to qualify
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);

                return {
                    [keyLabel]: key,
                    pitches: data.pitches,
                    strikePct: data.pitches > 0 ? Math.round((data.strikes / data.pitches) * 100) : 0,
                    topPlayers
                };
            }).sort((a, b) => b.pitches - a.pitches);
        };

        return {
            performanceOverTimeData,
            pitchingBreakdowns: {
                byPitchType: formatBreakdown(byPitchTypeMap) as any,
                byCount: formatBreakdown(byCountMap) as any,
                byZone: formatBreakdown(byZoneMap, 'zone') as any,
            },
            topPerformers: {
                velocity: topVelocity,
                command: [] // Placeholder
            }
        };
    }, [pitchSessions, players]);
};
