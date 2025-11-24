import React, { useContext } from 'react';
import { Player } from '../types';
import { ReportType } from './ReportTypeSelector';
import { DataContext } from '../contexts/DataContext';
import { PITCH_TYPES } from '../constants';

export interface ReportFiltersState {
    dateRange: {
        start: string;
        end: string;
    };
    selectedPlayerIds: string[];
    includeCharts: boolean;
    includeNotes: boolean;
    // Pitching specific
    pitchType?: string;
    groupBySession?: boolean;
    // Goal specific
    selectedGoalId?: string;
    showActiveGoalsOnly?: boolean;
}

interface ReportFiltersProps {
    reportType: ReportType;
    filters: ReportFiltersState;
    onFilterChange: (filters: ReportFiltersState) => void;
    players: Player[];
    teamId: string;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
    reportType,
    filters,
    onFilterChange,
    players,
    teamId,
}) => {
    const { getTeamGoals } = useContext(DataContext)!;
    const teamGoals = getTeamGoals(teamId);

    const handleDateChange = (field: 'start' | 'end', value: string) => {
        onFilterChange({
            ...filters,
            dateRange: { ...filters.dateRange, [field]: value },
        });
    };

    const handlePlayerToggle = (playerId: string) => {
        const current = filters.selectedPlayerIds;
        const updated = current.includes(playerId)
            ? current.filter((id) => id !== playerId)
            : [...current, playerId];
        onFilterChange({ ...filters, selectedPlayerIds: updated });
    };

    const toggleAllPlayers = () => {
        if (filters.selectedPlayerIds.length === players.length) {
            onFilterChange({ ...filters, selectedPlayerIds: [] });
        } else {
            onFilterChange({ ...filters, selectedPlayerIds: players.map((p) => p.id) });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-foreground">2. Configure Filters</h3>

            {/* Common Filters */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Date Range</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <input
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                </div>
            </div>

            {reportType === 'team-goal-progress' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Select Goal</label>
                    <select
                        value={filters.selectedGoalId}
                        onChange={(e) => onFilterChange({ ...filters, selectedGoalId: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">-- Select a Team Goal --</option>
                        {teamGoals
                            .filter((g) => !filters.showActiveGoalsOnly || g.status === 'Active')
                            .map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                    {goal.description} ({goal.status})
                                </option>
                            ))}
                    </select>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showActiveGoalsOnly"
                            checked={filters.showActiveGoalsOnly}
                            onChange={(e) => onFilterChange({ ...filters, showActiveGoalsOnly: e.target.checked })}
                            className="rounded border-input"
                        />
                        <label htmlFor="showActiveGoalsOnly" className="text-sm text-foreground">
                            Show active goals only
                        </label>
                    </div>
                </div>
            )}

            {reportType !== 'team-goal-progress' && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Players</label>
                        <button
                            onClick={toggleAllPlayers}
                            className="text-xs text-primary hover:underline"
                        >
                            {filters.selectedPlayerIds.length === players.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-input rounded-md p-2 space-y-1">
                        {players.map((player) => (
                            <div key={player.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`player-${player.id}`}
                                    checked={filters.selectedPlayerIds.includes(player.id)}
                                    onChange={() => handlePlayerToggle(player.id)}
                                    className="rounded border-input"
                                />
                                <label htmlFor={`player-${player.id}`} className="text-sm text-foreground truncate">
                                    {player.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Report Specific Filters */}
            {reportType === 'pitching-command' && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Pitch Type</label>
                        <select
                            value={filters.pitchType}
                            onChange={(e) => onFilterChange({ ...filters, pitchType: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="All">All Pitch Types</option>
                            {PITCH_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="groupBySession"
                            checked={filters.groupBySession}
                            onChange={(e) => onFilterChange({ ...filters, groupBySession: e.target.checked })}
                            className="rounded border-input"
                        />
                        <label htmlFor="groupBySession" className="text-sm text-foreground">
                            Group by Session (vs Aggregate)
                        </label>
                    </div>
                </>
            )}

            {/* Toggles */}
            <div className="pt-2 space-y-2 border-t border-border">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="includeCharts"
                        checked={filters.includeCharts}
                        onChange={(e) => onFilterChange({ ...filters, includeCharts: e.target.checked })}
                        className="rounded border-input"
                    />
                    <label htmlFor="includeCharts" className="text-sm text-foreground">
                        Include Charts
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="includeNotes"
                        checked={filters.includeNotes}
                        onChange={(e) => onFilterChange({ ...filters, includeNotes: e.target.checked })}
                        className="rounded border-input"
                    />
                    <label htmlFor="includeNotes" className="text-sm text-foreground">
                        Include Notes
                    </label>
                </div>
            </div>
        </div>
    );
};
