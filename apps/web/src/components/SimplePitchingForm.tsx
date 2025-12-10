import React, { useState } from 'react';

interface SimplePitchingFormProps {
    onSave: (data: {
        sessionName: string;
        totalPitches: number;
        strikes: number;
        balls: number;
        notes?: string;
    }) => void;
    onCancel: () => void;
    isSaving: boolean;
    errorMessage: string | null;
}

export const SimplePitchingForm: React.FC<SimplePitchingFormProps> = ({
    onSave,
    onCancel,
    isSaving,
    errorMessage,
}) => {
    const [sessionName, setSessionName] = useState('Bullpen Session');
    const [totalPitches, setTotalPitches] = useState<number>(0);
    const [strikes, setStrikes] = useState<number>(0);
    const [balls, setBalls] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            sessionName,
            totalPitches,
            strikes,
            balls,
            notes: notes.trim() || undefined,
        });
    };

    const strikePercentage = totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border p-6 rounded-lg">
                <h2 className="text-xl font-bold text-foreground mb-4">Log Pitching Session</h2>

                <div className="space-y-4">
                    {/* Session Name */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Session Name
                        </label>
                        <input
                            type="text"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                            placeholder="Bullpen Session"
                            required
                        />
                    </div>

                    {/* Total Pitches */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Total Pitches Thrown
                        </label>
                        <input
                            type="number"
                            value={totalPitches || ''}
                            onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setTotalPitches(val);
                                // Auto-adjust strikes/balls if they exceed total
                                if (strikes + balls > val) {
                                    setStrikes(Math.min(strikes, val));
                                    setBalls(Math.min(balls, val - Math.min(strikes, val)));
                                }
                            }}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                            min="0"
                            required
                        />
                    </div>

                    {/* Strikes */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Strikes
                        </label>
                        <input
                            type="number"
                            value={strikes || ''}
                            onChange={(e) => setStrikes(Math.min(totalPitches, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                            min="0"
                            max={totalPitches}
                        />
                    </div>

                    {/* Balls */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Balls
                        </label>
                        <input
                            type="number"
                            value={balls || ''}
                            onChange={(e) => setBalls(Math.min(totalPitches - strikes, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                            min="0"
                            max={totalPitches - strikes}
                        />
                    </div>

                    {/* Strike Percentage Display */}
                    {totalPitches > 0 && (
                        <div className="bg-muted p-3 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">Strike Percentage</div>
                            <div className="text-2xl font-bold text-foreground">{strikePercentage}%</div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
                            rows={3}
                            placeholder="How did you feel? What were you working on?"
                        />
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-700 text-sm">
                        {errorMessage}
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || totalPitches === 0}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Session'}
                    </button>
                </div>
            </div>
        </form>
    );
};
