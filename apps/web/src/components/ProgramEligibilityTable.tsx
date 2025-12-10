import React, { useState, useEffect, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Player } from '../types';
import { createClient } from '@supabase/supabase-js';

interface ProgramEligibilityTableProps {
    templateId: string;
    templateName: string;
}

interface PitcherEligibility {
    player: Player;
    daysSinceLastPitch: number;
    eligibilityStatus: 'ready' | 'caution' | 'rest';
    completionCount: number;
    lastCompletionDate?: Date;
}

export const ProgramEligibilityTable: React.FC<ProgramEligibilityTableProps> = ({
    templateId,
    templateName
}) => {
    const {
        activeTeam,
        getPlayersInTeam,
        getAllPitchSessionsForPlayer
    } = useContext(DataContext)!;

    // Create supabase client
    const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
    );

    const [eligibilityData, setEligibilityData] = useState<PitcherEligibility[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeTeam) return;

        const fetchEligibilityData = async () => {
            setLoading(true);
            try {
                // 1. Get all pitchers assigned to this program
                const { data: assignments, error: assignError } = await supabase
                    .from('pitch_simulation_assignments')
                    .select('player_id')
                    .eq('template_id', templateId)
                    .eq('active', true);

                if (assignError) throw assignError;

                const assignedPlayerIds = assignments?.map(a => a.player_id) || [];
                const teamPlayers = getPlayersInTeam(activeTeam.id);
                const assignedPlayers = teamPlayers.filter(p => assignedPlayerIds.includes(p.id));

                // 2. For each pitcher, calculate eligibility and completions
                const eligibilityPromises = assignedPlayers.map(async (player) => {
                    // Get pitching sessions to calculate rest
                    const pitchSessions = await getAllPitchSessionsForPlayer(player.id, activeTeam.id);

                    let daysSinceLastPitch = 999; // Default to "ready" if never pitched
                    if (pitchSessions.length > 0) {
                        // Find most recent session
                        const sortedSessions = pitchSessions.sort((a, b) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                        );
                        const lastPitchDate = new Date(sortedSessions[0].date);
                        const daysDiff = Math.floor((Date.now() - lastPitchDate.getTime()) / (1000 * 60 * 60 * 24));
                        daysSinceLastPitch = daysDiff;
                    }

                    // Determine eligibility status
                    let eligibilityStatus: 'ready' | 'caution' | 'rest';
                    if (daysSinceLastPitch >= 4) {
                        eligibilityStatus = 'ready';
                    } else if (daysSinceLastPitch >= 2) {
                        eligibilityStatus = 'caution';
                    } else {
                        eligibilityStatus = 'rest';
                    }

                    // Get completion count and last completion date
                    const { data: completions, error: compError } = await supabase
                        .from('pitch_simulation_runs')
                        .select('completed_at')
                        .eq('player_id', player.id)
                        .eq('template_id', templateId)
                        .eq('status', 'completed')
                        .order('completed_at', { ascending: false });

                    if (compError) throw compError;

                    const completionCount = completions?.length || 0;
                    const lastCompletionDate = completions?.[0]?.completed_at
                        ? new Date(completions[0].completed_at)
                        : undefined;

                    return {
                        player,
                        daysSinceLastPitch,
                        eligibilityStatus,
                        completionCount,
                        lastCompletionDate
                    };
                });

                const eligibilityResults = await Promise.all(eligibilityPromises);

                // Sort by eligibility (ready first, then caution, then rest)
                eligibilityResults.sort((a, b) => {
                    const statusOrder = { ready: 0, caution: 1, rest: 2 };
                    return statusOrder[a.eligibilityStatus] - statusOrder[b.eligibilityStatus];
                });

                setEligibilityData(eligibilityResults);
            } catch (err) {
                console.error('Error fetching eligibility data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEligibilityData();
    }, [templateId, activeTeam, getPlayersInTeam, getAllPitchSessionsForPlayer]);

    if (loading) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                Loading eligibility data...
            </div>
        );
    }

    if (eligibilityData.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No pitchers assigned to this program yet.
            </div>
        );
    }

    const getEligibilityColor = (status: 'ready' | 'caution' | 'rest') => {
        switch (status) {
            case 'ready': return 'bg-green-500';
            case 'caution': return 'bg-yellow-500';
            case 'rest': return 'bg-red-500';
        }
    };

    const getEligibilityLabel = (status: 'ready' | 'caution' | 'rest', days: number) => {
        if (days > 900) return 'Never pitched';
        return `${days} day${days !== 1 ? 's' : ''} rest`;
    };

    return (
        <div className="mt-4 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Assigned Pitchers</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                        <tr>
                            <th className="text-left p-2 font-semibold text-muted-foreground">Pitcher</th>
                            <th className="text-left p-2 font-semibold text-muted-foreground">Eligibility</th>
                            <th className="text-left p-2 font-semibold text-muted-foreground">Completions</th>
                            <th className="text-left p-2 font-semibold text-muted-foreground">Last Completed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eligibilityData.map((data) => (
                            <tr key={data.player.id} className="border-b border-border hover:bg-muted/10">
                                <td className="p-2 text-foreground font-medium">{data.player.name}</td>
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getEligibilityColor(data.eligibilityStatus)}`} />
                                        <span className="text-muted-foreground text-xs">
                                            {getEligibilityLabel(data.eligibilityStatus, data.daysSinceLastPitch)}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-2">
                                    <span className={`font-bold ${data.completionCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {data.completionCount}
                                    </span>
                                </td>
                                <td className="p-2 text-muted-foreground text-xs">
                                    {data.lastCompletionDate
                                        ? data.lastCompletionDate.toLocaleDateString()
                                        : 'Never'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
