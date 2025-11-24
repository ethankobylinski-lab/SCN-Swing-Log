import { useState, useEffect, useMemo, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { TeamGoal, Player, PitchType, PitchSession, PitchRecord } from '../types';
import { ReportFiltersState } from '../components/ReportFilters';
import { getCurrentTeamMetricValue } from '../utils/helpers';

// --- Pitching Command Report Hook ---

export interface PitchingReportData {
    summary: {
        totalPitches: number;
        totalStrikes: number;
        strikePercentage: number;
        accuracyPercentage: number;
    };
    playerStats: {
        playerId: string;
        playerName: string;
        totalPitches: number;
        strikePercentage: number;
        accuracyPercentage: number;
        missPatterns: {
            high: number;
            low: number;
            armSide: number;
            gloveSide: number;
        };
        pitchTypeBreakdown: Record<string, {
            count: number;
            strikePercentage: number;
            accuracyPercentage: number;
        }>;
    }[];
    sessions: PitchSession[];
    loading: boolean;
}

export const usePitchingCommandReportData = (
    filters: ReportFiltersState,
    players: Player[],
    teamId: string
): PitchingReportData => {
    const { getAllPitchSessionsForPlayer, getPitchHistory, getPitchTypesForPitcher } = useContext(DataContext)!;
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState<PitchSession[]>([]);
    const [pitchRecordsMap, setPitchRecordsMap] = useState<Record<string, PitchRecord[]>>({});
    const [pitchTypesMap, setPitchTypesMap] = useState<Record<string, Record<string, string>>>({}); // playerId -> { pitchTypeId -> pitchName }

    // 1. Fetch Sessions & Pitches & Pitch Types
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const targetPlayerIds = filters.selectedPlayerIds.length > 0
                    ? filters.selectedPlayerIds
                    : players.map(p => p.id);

                const allFetchedSessions: PitchSession[] = [];
                const newPitchRecordsMap: Record<string, PitchRecord[]> = {};
                const newPitchTypesMap: Record<string, Record<string, string>> = {};

                // Fetch sessions and pitch types for each player
                await Promise.all(targetPlayerIds.map(async (playerId) => {
                    // Fetch Pitch Types
                    const pitchTypes = await getPitchTypesForPitcher(playerId);
                    const typesMap: Record<string, string> = {};
                    pitchTypes.forEach(pt => {
                        typesMap[pt.id] = pt.name;
                    });
                    newPitchTypesMap[playerId] = typesMap;

                    // Fetch Sessions
                    const playerSessions = await getAllPitchSessionsForPlayer(playerId, teamId);

                    // Filter by date
                    const startDate = new Date(filters.dateRange.start);
                    const endDate = new Date(filters.dateRange.end);
                    endDate.setHours(23, 59, 59, 999);

                    const filtered = playerSessions.filter(s => {
                        const d = new Date(s.sessionStartTime); // PitchSession uses sessionStartTime
                        return d >= startDate && d <= endDate;
                    });

                    allFetchedSessions.push(...filtered);

                    // Fetch pitches for these sessions
                    await Promise.all(filtered.map(async (session) => {
                        const records = await getPitchHistory(session.id);
                        newPitchRecordsMap[session.id] = records;
                    }));
                }));

                setSessions(allFetchedSessions);
                setPitchRecordsMap(newPitchRecordsMap);
                setPitchTypesMap(newPitchTypesMap);
            } catch (err) {
                console.error("Error fetching pitching report data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters.dateRange, filters.selectedPlayerIds, players, teamId, getAllPitchSessionsForPlayer, getPitchHistory, getPitchTypesForPitcher]);

    // 2. Aggregate Data
    const data = useMemo(() => {
        let totalPitches = 0;
        let totalStrikes = 0;
        let totalAccurate = 0;

        const playerStatsMap = new Map<string, PitchingReportData['playerStats'][0]>();

        sessions.forEach((session) => {
            const player = players.find((p) => p.id === session.pitcherId); // PitchSession uses pitcherId
            if (!player) return;

            if (!playerStatsMap.has(player.id)) {
                playerStatsMap.set(player.id, {
                    playerId: player.id,
                    playerName: player.name,
                    totalPitches: 0,
                    strikePercentage: 0,
                    accuracyPercentage: 0,
                    missPatterns: { high: 0, low: 0, armSide: 0, gloveSide: 0 },
                    pitchTypeBreakdown: {},
                });
            }

            const stats = playerStatsMap.get(player.id)!;
            const records = pitchRecordsMap[session.id] || [];
            const playerPitchTypes = pitchTypesMap[player.id] || {};

            records.forEach((pitch) => {
                totalPitches++;
                stats.totalPitches++;

                const isStrike = pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike' || pitch.outcome === 'in_play' || pitch.outcome === 'foul';
                if (isStrike) {
                    totalStrikes++;
                    // We need to track player strikes for their %
                }

                const isAccurate = pitch.actualZone === pitch.targetZone;
                if (isAccurate) {
                    totalAccurate++;
                }

                // Miss patterns (simplified logic based on zone strings)
                if (!isAccurate && pitch.actualZone) {
                    if (pitch.actualZone.includes('High')) stats.missPatterns.high++;
                    if (pitch.actualZone.includes('Low')) stats.missPatterns.low++;
                    // Arm/Glove side logic depends on batter handedness and pitcher handedness
                }

                // Pitch Type Breakdown
                const pitchTypeName = playerPitchTypes[pitch.pitchTypeId] || 'Unknown';
                if (!stats.pitchTypeBreakdown[pitchTypeName]) {
                    stats.pitchTypeBreakdown[pitchTypeName] = {
                        count: 0,
                        strikePercentage: 0,
                        accuracyPercentage: 0,
                    };
                    // Initialize raw counts for this pitch type
                    (stats.pitchTypeBreakdown[pitchTypeName] as any)._rawStrikes = 0;
                    (stats.pitchTypeBreakdown[pitchTypeName] as any)._rawAccurate = 0;
                }

                const ptStats = stats.pitchTypeBreakdown[pitchTypeName];
                ptStats.count++;
                if (isStrike) (ptStats as any)._rawStrikes++;
                if (isAccurate) (ptStats as any)._rawAccurate++;
            });

            // Temporary hack to store counts for % calc
            // In a real app, we'd store raw counts in the stats object
            (stats as any)._rawStrikes = ((stats as any)._rawStrikes || 0) + (records.filter(p => p.outcome === 'called_strike' || p.outcome === 'swinging_strike' || p.outcome === 'in_play' || p.outcome === 'foul').length);
            (stats as any)._rawAccurate = ((stats as any)._rawAccurate || 0) + (records.filter(p => p.actualZone === p.targetZone).length);
        });

        const playerStats = Array.from(playerStatsMap.values()).map(stat => {
            // Calculate percentages for pitch types
            Object.keys(stat.pitchTypeBreakdown).forEach(ptName => {
                const ptStats = stat.pitchTypeBreakdown[ptName];
                ptStats.strikePercentage = ptStats.count > 0 ? Math.round(((ptStats as any)._rawStrikes / ptStats.count) * 100) : 0;
                ptStats.accuracyPercentage = ptStats.count > 0 ? Math.round(((ptStats as any)._rawAccurate / ptStats.count) * 100) : 0;
            });

            return {
                ...stat,
                strikePercentage: stat.totalPitches > 0 ? Math.round(((stat as any)._rawStrikes / stat.totalPitches) * 100) : 0,
                accuracyPercentage: stat.totalPitches > 0 ? Math.round(((stat as any)._rawAccurate / stat.totalPitches) * 100) : 0,
            };
        });

        return {
            summary: {
                totalPitches,
                totalStrikes,
                strikePercentage: totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0,
                accuracyPercentage: totalPitches > 0 ? Math.round((totalAccurate / totalPitches) * 100) : 0,
            },
            playerStats,
            sessions,
            loading
        };
    }, [sessions, pitchRecordsMap, players, pitchTypesMap]);

    return data;
};

// --- Team Goal Progress Report Hook ---

export interface TeamGoalReportData {
    goal: TeamGoal | undefined;
    summary: {
        currentValue: number;
        targetValue: number;
        percentComplete: number;
        isOnPace: boolean;
        daysRemaining: number;
    };
    leaderboard: {
        playerId: string;
        playerName: string;
        contribution: number;
        percentOfTotal: number;
    }[];
}

export const useTeamGoalProgressReportData = (
    filters: ReportFiltersState,
    players: Player[],
    teamId: string
): TeamGoalReportData | null => {
    const { getTeamGoals, getSessionsForTeam, getDrillsForTeam } = useContext(DataContext)!;

    const goal = useMemo(() => {
        if (!filters.selectedGoalId) return undefined;
        return getTeamGoals(teamId).find((g) => g.id === filters.selectedGoalId);
    }, [filters.selectedGoalId, teamId, getTeamGoals]);

    const sessions = getSessionsForTeam(teamId);
    const drills = getDrillsForTeam(teamId);

    const data = useMemo(() => {
        if (!goal) return null;

        const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);
        const percentComplete = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));

        const startDate = new Date(goal.startDate);
        const targetDate = new Date(goal.targetDate);
        const today = new Date();
        const totalDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        const expectedProgress = (daysElapsed / totalDays) * goal.targetValue;
        const isOnPace = currentValue >= expectedProgress;

        const leaderboard = players.map(player => {
            // This is an approximation. Ideally we'd filter sessions by player and re-run metric calc.
            // But getCurrentTeamMetricValue might not support single player filtering easily without refactoring.
            // We'll assume we can filter sessions.
            const playerSessions = sessions.filter(s => s.playerId === player.id);
            // We need a way to calculate metric for just these sessions.
            // Since getCurrentTeamMetricValue takes sessions as input, we can pass playerSessions!
            const contribution = getCurrentTeamMetricValue(goal, playerSessions, drills);

            return {
                playerId: player.id,
                playerName: player.name,
                contribution,
                percentOfTotal: currentValue > 0 ? Math.round((contribution / currentValue) * 100) : 0,
            };
        })
            .filter(p => p.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution);

        return {
            goal,
            summary: {
                currentValue,
                targetValue: goal.targetValue,
                percentComplete,
                isOnPace,
                daysRemaining,
            },
            leaderboard,
        };
    }, [goal, sessions, drills, players]);

    return data;
};
