import React, { useState } from 'react';
import { PitchRecord, PitchTypeModel, ZoneId } from '../../types';

interface PitchHistoryListProps {
    pitches: PitchRecord[];
    pitchTypes: PitchTypeModel[];
    onEdit: (pitchId: string, updates: Partial<PitchRecord>) => void;
    onUndo: () => void;
}

/**
 * PitchHistoryList Component
 * 
 * Displays list of pitches in this session.
 * Allows editing individual pitches.
 */
export const PitchHistoryList: React.FC<PitchHistoryListProps> = ({
    pitches,
    pitchTypes,
    onEdit,
    onUndo
}) => {
    const [editingPitch, setEditingPitch] = useState<PitchRecord | null>(null);

    const getPitchTypeName = (typeId: string) => {
        return pitchTypes.find(t => t.id === typeId)?.code || '?';
    };

    const formatOutcome = (outcome: string) => {
        return outcome.replace('_', ' ');
    };

    return (
        <div className="max-h-[400px] overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Pitch History ({pitches.length})</h3>
                <button
                    onClick={onUndo}
                    disabled={pitches.length === 0}
                    className={`px-4 py-2 rounded-md border-none font-bold text-white transition-all ${pitches.length > 0
                        ? 'bg-destructive hover:bg-destructive/90 cursor-pointer hover-scale active-press shadow-sm'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                >
                    Undo Last
                </button>
            </div>

            {pitches.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 animate-fadeIn">
                    No pitches recorded yet
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {pitches.map((pitch, index) => (
                        <div
                            key={pitch.id}
                            onClick={() => setEditingPitch(pitch)}
                            className="p-3 bg-card rounded-lg cursor-pointer border border-border hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 animate-fadeInUp"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-foreground">
                                    #{pitch.index} | {getPitchTypeName(pitch.pitchTypeId)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Count {pitch.ballsBefore}–{pitch.strikesBefore}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground/80">
                                Target: {pitch.targetZone} → Actual: {pitch.actualZone} | {formatOutcome(pitch.outcome)}
                                {pitch.velocityMph && ` | ${pitch.velocityMph} mph`}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal (simplified - reuse main UI components if needed) */}
            {editingPitch && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
                    onClick={() => setEditingPitch(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background p-8 rounded-xl shadow-2xl max-w-lg w-[90%] animate-scaleIn transition-all duration-300"
                    >
                        <h3 className="text-xl font-bold mb-4 text-foreground">Edit Pitch #{editingPitch.index}</h3>
                        <p className="text-muted-foreground mb-6">
                            Editing pitch records will be available in the full implementation.
                            For now, use "Undo Last" to remove the most recent pitch.
                        </p>
                        <button
                            onClick={() => setEditingPitch(null)}
                            className="px-4 py-2 rounded-md border-none bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90 hover-scale active-press shadow-sm transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
