import React, { useState } from 'react';
import { PitchTypeModel } from '../../types';

interface PitchTypeSelectorProps {
    pitchTypes: PitchTypeModel[];
    selectedTypeId?: string;
    onSelect: (typeId: string) => void;
    onAddCustom: (name: string, code: string, colorHex: string) => void;
}

/**
 * PitchTypeSelector Component
 * 
 * Displays pitch type chips with colors.
 * Allows adding custom pitch types.
 */
export const PitchTypeSelector: React.FC<PitchTypeSelectorProps> = ({
    pitchTypes,
    selectedTypeId,
    onSelect,
    onAddCustom
}) => {
    const [showModal, setShowModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customCode, setCustomCode] = useState('');
    const [customColor, setCustomColor] = useState('#9C27B0');

    const handleAddCustom = () => {
        if (customName && customCode) {
            onAddCustom(customName, customCode, customColor);
            setShowModal(false);
            setCustomName('');
            setCustomCode('');
            setCustomColor('#9C27B0');
        }
    };

    return (
        <div>
            <div className="text-sm text-muted-foreground mb-2 font-medium">Pitch Type</div>
            <div className="flex gap-2 flex-wrap items-center">
                {pitchTypes.map(type => (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        className={`px-4 py-2 rounded-full font-bold text-white shadow-sm hover-scale active-press transition-smooth ${selectedTypeId === type.id ? 'ring-2 ring-offset-2 ring-offset-background scale-105 shadow-md' : ''
                            }`}
                        style={{
                            backgroundColor: type.colorHex,
                            borderColor: type.colorHex,
                            boxShadow: selectedTypeId === type.id ? `0 0 0 2px ${type.colorHex}` : undefined
                        }}
                    >
                        {type.code}
                    </button>
                ))}

                {/* Add button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-full border-2 border-dashed border-muted-foreground/50 text-muted-foreground font-bold hover:bg-muted hover:border-muted-foreground hover:text-foreground transition-colors hover-scale active-press"
                >
                    + Add
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background p-8 rounded-xl shadow-2xl max-w-md w-[90%] animate-scaleIn transition-all duration-300"
                    >
                        <h3 className="text-xl font-bold mb-6 text-foreground">Add Custom Pitch Type</h3>

                        <div className="mb-4">
                            <label className="block mb-2 font-medium text-foreground">
                                Pitch Name
                            </label>
                            <input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="e.g., Slider"
                                className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 font-medium text-foreground">
                                Short Code
                            </label>
                            <input
                                type="text"
                                value={customCode}
                                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                placeholder="e.g., SL"
                                maxLength={3}
                                className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block mb-2 font-medium text-foreground">
                                Color
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-16 h-10 border border-input rounded cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground">{customColor}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCustom}
                                disabled={!customName || !customCode}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-scale active-press shadow-sm"
                            >
                                Add Pitch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
