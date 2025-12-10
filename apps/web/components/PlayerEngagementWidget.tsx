import React, { useState, useMemo } from 'react';
import { Player, Session, PitchSession } from '../types';
import {
    PlayerEngagementData,
    getAllPlayersEngagement,
    getTierDisplayInfo,
    EngagementTier
} from '../utils/engagementHelpers';

interface PlayerEngagementWidgetProps {
    players: Player[];
    sessions: Session[];
    pitchSessions: PitchSession[];
    onPlayerClick?: (playerId: string) => void;
    maxHeight?: string;
}

type FilterOption = 'all' | 'active' | 'at-risk' | 'inactive' | 'never-recorded';
type SortOption = 'urgency' | 'name' | 'lastActive' | 'totalSessions';

export const PlayerEngagementWidget: React.FC<PlayerEngagementWidgetProps> = ({
    players,
    sessions,
    pitchSessions,
    onPlayerClick,
    maxHeight = '400px'
}) => {
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [sortBy, setSortBy] = useState<SortOption>('urgency');

    const engagementData = useMemo(() =>
        getAllPlayersEngagement(players, sessions, pitchSessions),
        [players, sessions, pitchSessions]
    );

    const filteredAndSortedData = useMemo(() => {
        let filtered = engagementData;

        // Apply filter
        if (filterBy !== 'all') {
            filtered = engagementData.filter(p => p.tier === filterBy);
        }

        // Apply sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'urgency':
                // Already sorted by urgency in getAllPlayersEngagement
                break;
            case 'name':
                sorted.sort((a, b) => a.playerName.localeCompare(b.playerName));
                break;
            case 'lastActive':
                sorted.sort((a, b) => a.daysSinceLastActivity - b.daysSinceLastActivity);
                break;
            case 'totalSessions':
                sorted.sort((a, b) => b.totalSessions - a.totalSessions);
                break;
        }

        return sorted;
    }, [engagementData, filterBy, sortBy]);

    const formatLastActivity = (data: PlayerEngagementData): string => {
        if (data.tier === 'never-recorded') return 'Never';
        if (data.daysSinceLastActivity === 0) return 'Today';
        if (data.daysSinceLastActivity === 1) return '1 day ago';
        return `${data.daysSinceLastActivity} days ago`;
    };

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border space-y-3">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Player Engagement</h3>
                    <p className="text-sm text-muted-foreground">
                        {filteredAndSortedData.length} {filteredAndSortedData.length === 1 ? 'player' : 'players'}
                        {filterBy !== 'all' && ` (filtered)`}
                    </p>
                </div>

                {/* Filters and Sort */}
                <div className="flex flex-col sm:flex-row gap-2">
                    {/* Filter Dropdown */}
                    <select
                        value={filterBy}
                        onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                        className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Players</option>
                        <option value="active">Active Only</option>
                        <option value="at-risk">At Risk</option>
                        <option value="inactive">Inactive</option>
                        <option value="never-recorded">Never Recorded</option>
                    </select>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="urgency">Sort by Urgency</option>
                        <option value="name">Sort by Name</option>
                        <option value="lastActive">Sort by Last Active</option>
                        <option value="totalSessions">Sort by Sessions</option>
                    </select>
                </div>
            </div>

            {/* Player List */}
            <div className="divide-y divide-border" style={{ maxHeight, overflowY: 'auto' }}>
                {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map((player) => {
                        const tierInfo = getTierDisplayInfo(player.tier);

                        return (
                            <button
                                key={player.playerId}
                                onClick={() => onPlayerClick?.(player.playerId)}
                                className="w-full p-4 hover:bg-muted transition-colors text-left"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        {/* Tier Indicator */}
                                        <div className="flex-shrink-0 mt-1">
                                            <span className="text-xl">{tierInfo.icon}</span>
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-foreground">
                                                    {player.playerName}
                                                </p>
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                                    style={{
                                                        backgroundColor: tierInfo.bgColor,
                                                        color: tierInfo.color,
                                                        borderColor: tierInfo.borderColor,
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    {tierInfo.label}
                                                </span>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                                <span>
                                                    Last: {formatLastActivity(player)}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {player.totalSessions} total sessions
                                                </span>
                                                {player.totalSessions > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>
                                                            ⚾️ {player.totalHittingSessions} / 🎯 {player.totalPitchingSessions}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* View Arrow */}
                                    {onPlayerClick && (
                                        <span className="text-primary text-sm flex-shrink-0 mt-1">
                                            View →
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="p-12 text-center">
                        <p className="text-muted-foreground">
                            {filterBy === 'all'
                                ? 'No players on team'
                                : `No ${filterBy.replace('-', ' ')} players`
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            {filteredAndSortedData.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground text-center">
                        {filterBy === 'all'
                            ? `Showing all ${filteredAndSortedData.length} players`
                            : `${filteredAndSortedData.length} of ${players.length} players match filter`
                        }
                    </p>
                </div>
            )}
        </div>
    );
};
