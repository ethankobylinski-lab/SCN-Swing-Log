import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../contexts/DataContext';
import { DayOfWeek, Player } from '../types';
import { Modal } from './Modal';

interface PitchingProgramAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateId: string | null;
    templateName?: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Modal for assigning pitch simulation templates to pitchers
 * Supports: individual/team-wide assignment, recurring/one-time scheduling
 */
export const PitchingProgramAssignmentModal: React.FC<PitchingProgramAssignmentModalProps> = ({
    isOpen,
    onClose,
    templateId,
    templateName,
}) => {
    const { activeTeam, getPlayersInTeam, assignSimulationToPitchers } = useContext(DataContext)!;

    const [assignmentType, setAssignmentType] = useState<'team' | 'individual'>('team');
    const [selectedPitcherIds, setSelectedPitcherIds] = useState<string[]>([]);
    const [scheduleType, setScheduleType] = useState<'one-time' | 'recurring'>('one-time');
    const [recurringDays, setRecurringDays] = useState<DayOfWeek[]>([]);
    const [dueDate, setDueDate] = useState('');


    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load team players
    useEffect(() => {
        if (!activeTeam || !isOpen) {
            setPlayers([]);
            return;
        }

        const teamPlayers = getPlayersInTeam(activeTeam.id);
        setPlayers(teamPlayers);
    }, [activeTeam, isOpen, getPlayersInTeam]);

    const handleTogglePitcher = (pitcherId: string) => {
        setSelectedPitcherIds(prev =>
            prev.includes(pitcherId)
                ? prev.filter(id => id !== pitcherId)
                : [...prev, pitcherId]
        );
    };

    const handleToggleDay = (day: DayOfWeek) => {
        setRecurringDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const handleSubmit = async () => {
        if (!activeTeam || !templateId) {
            setError('Invalid template or team');
            return;
        }

        if (assignmentType === 'individual' && selectedPitcherIds.length === 0) {
            setError('Please select at least one pitcher');
            return;
        }

        if (scheduleType === 'recurring' && recurringDays.length === 0) {
            setError('Please select at least one day');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pitchers = assignmentType === 'team' ? [] : selectedPitcherIds;
            const recurring = scheduleType === 'recurring';
            const days = recurring ? recurringDays : undefined;
            const due = scheduleType === 'one-time' && dueDate ? dueDate : undefined;

            await assignSimulationToPitchers(
                templateId,
                activeTeam.id,
                pitchers,
                recurring,
                days,
                due
            );

            // Reset and close
            setAssignmentType('team');
            setSelectedPitcherIds([]);
            setScheduleType('one-time');
            setRecurringDays([]);
            setDueDate('');

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to assign program');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Assign Program</h2>
                    {templateName && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {templateName}
                        </p>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Who: Team or Individual */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">Assign To</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50">
                            <input
                                type="radio"
                                name="assignmentType"
                                checked={assignmentType === 'team'}
                                onChange={() => setAssignmentType('team')}
                                className="w-4 h-4"
                            />
                            <div>
                                <p className="font-medium text-foreground">All Team Pitchers</p>
                                <p className="text-xs text-muted-foreground">Everyone on the roster</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50">
                            <input
                                type="radio"
                                name="assignmentType"
                                checked={assignmentType === 'individual'}
                                onChange={() => setAssignmentType('individual')}
                                className="w-4 h-4"
                            />
                            <div>
                                <p className="font-medium text-foreground">Select Individual Pitchers</p>
                                <p className="text-xs text-muted-foreground">Choose specific players</p>
                            </div>
                        </label>
                    </div>

                    {/* Individual Pitcher Selection */}
                    {assignmentType === 'individual' && (
                        <div className="mt-3 p-4 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium text-foreground mb-2">Select Pitchers</p>
                            {players.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No players on the team yet.</p>
                            ) : (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {players.map(player => (
                                        <label
                                            key={player.id}
                                            className="flex items-center gap-2 p-2 hover:bg-background rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPitcherIds.includes(player.id)}
                                                onChange={() => handleTogglePitcher(player.id)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-foreground">{player.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Schedule: One-Time or Recurring */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">Schedule</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50">
                            <input
                                type="radio"
                                name="scheduleType"
                                checked={scheduleType === 'one-time'}
                                onChange={() => setScheduleType('one-time')}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">One-Time</p>
                                <p className="text-xs text-muted-foreground">Assign once, optional due date</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50">
                            <input
                                type="radio"
                                name="scheduleType"
                                checked={scheduleType === 'recurring'}
                                onChange={() => setScheduleType('recurring')}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">Recurring</p>
                                <p className="text-xs text-muted-foreground">Repeat on specific days</p>
                            </div>
                        </label>
                    </div>

                    {/* One-Time: Due Date */}
                    {scheduleType === 'one-time' && (
                        <div className="mt-3 p-4 bg-muted/30 rounded-md">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Due Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    )}

                    {/* Recurring: Days of Week */}
                    {scheduleType === 'recurring' && (
                        <div className="mt-3 p-4 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium text-foreground mb-2">Select Days</p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => handleToggleDay(day)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${recurringDays.includes(day)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background text-foreground border border-border hover:bg-muted'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-muted text-muted-foreground font-semibold py-2 rounded-md hover:bg-muted/80 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-primary text-primary-foreground font-semibold py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Assigning...' : 'Assign Program'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
