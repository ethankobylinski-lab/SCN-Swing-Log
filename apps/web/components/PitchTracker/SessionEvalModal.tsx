import React, { useState } from 'react';

interface SessionEvalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (evaluation: {
        overallGrade: number;
        executionGrade: number;
        velocityFeel: number | null;
        notes: string;
    }) => Promise<void>;
    initialNotes?: string;
}

/**
 * SessionEvalModal - End-of-session evaluation modal
 * 
 * Displays three sliders for rating:
 * - Overall Grade (1-10)
 * - Location/Execution (1-10)
 * - Velocity Feel (1-10, optional)
 * 
 * Plus a notes textarea
 */
export const SessionEvalModal: React.FC<SessionEvalModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialNotes = ''
}) => {
    const [overallGrade, setOverallGrade] = useState(7);
    const [executionGrade, setExecutionGrade] = useState(7);
    const [velocityFeel, setVelocityFeel] = useState(7);
    const [notes, setNotes] = useState(initialNotes);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                overallGrade,
                executionGrade,
                velocityFeel,
                notes: notes.trim()
            });
            onClose();
        } catch (error) {
            console.error('Failed to save evaluation:', error);
            alert('Failed to save evaluation. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-background rounded-xl p-8 max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl animate-scaleIn transition-all duration-300">
                <h2 className="m-0 mb-6 text-2xl font-bold text-foreground">
                    Session Evaluation
                </h2>

                {/* Overall Grade Slider */}
                <div className="mb-6">
                    <label className="flex justify-between mb-2 text-sm font-medium text-foreground">
                        <span>Overall Grade</span>
                        <span className="font-bold text-primary">{overallGrade}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={overallGrade}
                        onChange={(e) => setOverallGrade(parseInt(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>

                {/* Location/Execution Slider */}
                <div className="mb-6">
                    <label className="flex justify-between mb-2 text-sm font-medium text-foreground">
                        <span>Location / Execution</span>
                        <span className="font-bold text-green-500">{executionGrade}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={executionGrade}
                        onChange={(e) => setExecutionGrade(parseInt(e.target.value))}
                        className="w-full accent-green-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>

                {/* Velocity Feel Slider */}
                <div className="mb-6">
                    <label className="flex justify-between mb-2 text-sm font-medium text-foreground">
                        <span>Velocity Feel</span>
                        <span className="font-bold text-orange-500">{velocityFeel}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={velocityFeel}
                        onChange={(e) => setVelocityFeel(parseInt(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>

                {/* Notes Textarea */}
                <div className="mb-6">
                    <label className="block mb-2 text-sm font-medium text-foreground">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="How did this session feel? Any observations?"
                        rows={4}
                        className="w-full p-3 border border-input rounded-lg text-sm resize-y font-sans bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-3 rounded-lg border border-input bg-background text-muted-foreground font-medium cursor-pointer hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 rounded-lg border-none bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90 hover-scale active-press shadow-md transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Evaluation'}
                    </button>
                </div>
            </div>
        </div>
    );
};
