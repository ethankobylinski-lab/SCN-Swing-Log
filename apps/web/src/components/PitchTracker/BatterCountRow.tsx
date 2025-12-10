import React from 'react';

interface BatterCountRowProps {
    batterSide: 'L' | 'R';
    balls: number;
    strikes: number;
    onBatterSideChange: (side: 'L' | 'R') => void;
    onBallsChange: (balls: number) => void;
    onStrikesChange: (strikes: number) => void;
}

/**
 * BatterCountRow Component
 * 
 * Displays and controls:
 * - Batter side (L/R toggle)
 * - Ball count (0-3)
 * - Strike count (0-2)
 */
export const BatterCountRow: React.FC<BatterCountRowProps> = ({
    batterSide,
    balls,
    strikes,
    onBatterSideChange,
    onBallsChange,
    onStrikesChange
}) => {
    return (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            {/* Batter Side */}
            <div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Batter</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => onBatterSideChange('L')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: 'none',
                            backgroundColor: batterSide === 'L' ? '#2196F3' : '#e0e0e0',
                            color: batterSide === 'L' ? 'white' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        L
                    </button>
                    <button
                        onClick={() => onBatterSideChange('R')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: 'none',
                            backgroundColor: batterSide === 'R' ? '#2196F3' : '#e0e0e0',
                            color: batterSide === 'R' ? 'white' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        R
                    </button>
                </div>
            </div>

            {/* Balls */}
            <div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Balls</div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            onClick={() => onBallsChange(i + 1 === balls ? 0 : i + 1)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: '2px solid #4CAF50',
                                backgroundColor: i < balls ? '#4CAF50' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Strikes */}
            <div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Strikes</div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            onClick={() => onStrikesChange(i + 1 === strikes ? 0 : i + 1)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: '2px solid #f44336',
                                backgroundColor: i < strikes ? '#f44336' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Count Display */}
            <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Count</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {balls}–{strikes}
                </div>
            </div>
        </div>
    );
};
