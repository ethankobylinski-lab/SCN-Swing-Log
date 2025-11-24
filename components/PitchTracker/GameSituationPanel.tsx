import React, { useState } from 'react';

interface GameSituationPanelProps {
    runnersOn: { on1b: boolean; on2b: boolean; on3b: boolean };
    outs: 0 | 1 | 2;
    onRunnersChange: (runners: { on1b: boolean; on2b: boolean; on3b: boolean }) => void;
    onOutsChange: (outs: 0 | 1 | 2) => void;
    enabled: boolean; // Whether game situation is tracked for this session
}

/**
 * GameSituationPanel Component
 * 
 * Collapsible panel for setting runners on base and outs.
 * Only affects data if `enabled` is true.
 */
export const GameSituationPanel: React.FC<GameSituationPanelProps> = ({
    runnersOn,
    outs,
    onRunnersChange,
    onOutsChange,
    enabled
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleRunner = (base: '1b' | '2b' | '3b') => {
        const key = `on${base}` as keyof typeof runnersOn;
        onRunnersChange({ ...runnersOn, [key]: !runnersOn[key] });
    };

    return (
        <div style={{ marginTop: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Header */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                }}
            >
                <span style={{ fontWeight: '500' }}>
                    Game Situation {!enabled && <span style={{ fontSize: '0.85rem', color: '#999' }}>(Not tracked)</span>}
                </span>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </div>

            {/* Content */}
            {isOpen && (
                <div style={{ padding: '1rem', display: 'flex', gap: '2rem', backgroundColor: 'white' }}>
                    {/* Runners */}
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Runners</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['1b', '2b', '3b'] as const).map(base => {
                                const key = `on${base}` as keyof typeof runnersOn;
                                return (
                                    <button
                                        key={base}
                                        onClick={() => toggleRunner(base)}
                                        disabled={!enabled}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: runnersOn[key] ? '#2196F3' : '#e0e0e0',
                                            color: runnersOn[key] ? 'white' : '#666',
                                            fontWeight: 'bold',
                                            cursor: enabled ? 'pointer' : 'not-allowed',
                                            opacity: enabled ? 1 : 0.5,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {base.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outs */}
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Outs</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[0, 1, 2].map(out => (
                                <button
                                    key={out}
                                    onClick={() => onOutsChange(out as 0 | 1 | 2)}
                                    disabled={!enabled}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: outs === out ? '#FF9800' : '#e0e0e0',
                                        color: outs === out ? 'white' : '#666',
                                        fontWeight: 'bold',
                                        cursor: enabled ? 'pointer' : 'not-allowed',
                                        opacity: enabled ? 1 : 0.5,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {out}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
