import React, { useState, useEffect } from 'react';
import { Pitch, PitchType, PitchResult } from './types';

interface BullpenEditDialogProps {
    pitch: Pitch | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPitch: Pitch) => void;
    onDelete: (pitchId: number) => void;
    pitchTypes: PitchType[];
}

export const BullpenEditDialog: React.FC<BullpenEditDialogProps> = ({
    pitch,
    isOpen,
    onClose,
    onSave,
    onDelete,
    pitchTypes,
}) => {
    const [editedPitch, setEditedPitch] = useState<Pitch | null>(null);

    useEffect(() => {
        setEditedPitch(pitch);
    }, [pitch]);

    if (!isOpen || !editedPitch) return null;

    const handleSave = () => {
        if (editedPitch) {
            onSave(editedPitch);
            onClose();
        }
    };

    const handleDelete = () => {
        if (editedPitch) {
            onDelete(editedPitch.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">

                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Edit Pitch #{editedPitch.id}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-4">

                    {/* Pitch Type */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pitch Type</label>
                        <div className="flex flex-wrap gap-2">
                            {pitchTypes.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setEditedPitch({ ...editedPitch, pitchType: type })}
                                    className={`
                    px-3 py-1.5 rounded text-xs font-bold transition-colors
                    ${editedPitch.pitchType === type
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                  `}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Result */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Result</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['ACCURATE', 'NEAR_TARGET', 'STRIKE', 'BALL'] as PitchResult[]).map(result => (
                                <button
                                    key={result}
                                    onClick={() => setEditedPitch({ ...editedPitch, result })}
                                    className={`
                    px-3 py-2 rounded text-xs font-bold transition-colors border-2
                    ${editedPitch.result === result
                                            ? getResultActiveStyle(result)
                                            : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'}
                  `}
                                >
                                    {result.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Swing Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Batter Swung?</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditedPitch({ ...editedPitch, swung: true })}
                                className={`
                    flex-1 px-3 py-2 rounded text-xs font-bold transition-colors border-2
                    ${editedPitch.swung === true
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'}
                  `}
                            >
                                YES - SWUNG
                            </button>
                            <button
                                onClick={() => setEditedPitch({ ...editedPitch, swung: false })}
                                className={`
                    flex-1 px-3 py-2 rounded text-xs font-bold transition-colors border-2
                    ${editedPitch.swung === false
                                        ? 'bg-slate-500/20 border-slate-500 text-slate-400'
                                        : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'}
                  `}
                            >
                                NO - WATCHED
                            </button>
                            <button
                                onClick={() => setEditedPitch({ ...editedPitch, swung: undefined })}
                                className={`
                    flex-1 px-3 py-2 rounded text-xs font-bold transition-colors border-2
                    ${editedPitch.swung === undefined
                                        ? 'bg-slate-600/20 border-slate-600 text-slate-300'
                                        : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'}
                  `}
                            >
                                UNKNOWN
                            </button>
                        </div>
                    </div>

                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded font-bold text-sm transition-colors"
                    >
                        Delete Pitch
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded font-bold text-sm transition-colors shadow-lg shadow-blue-600/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

function getResultActiveStyle(result: PitchResult): string {
    switch (result) {
        case 'ACCURATE': return 'bg-green-500/20 border-green-500 text-green-400';
        case 'NEAR_TARGET': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
        case 'STRIKE': return 'bg-blue-500/20 border-blue-500 text-blue-400';
        case 'BALL': return 'bg-red-500/20 border-red-500 text-red-400';
        default: return '';
    }
}
