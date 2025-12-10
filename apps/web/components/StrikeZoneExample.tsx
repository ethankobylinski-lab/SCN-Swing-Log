import React, { useState } from 'react';
import { StrikeZoneClean, PitchLocation } from './StrikeZoneClean';
import { ZoneId, PitchType } from '../types';

/**
 * Example usage of StrikeZoneClean component
 * 
 * This demonstrates the two-step flow:
 * 1. Select intended target (mode='selectIntent')
 * 2. Log actual pitch (mode='selectActual')
 */
export const StrikeZoneExample: React.FC = () => {
    // UI State
    const [mode, setMode] = useState<'selectIntent' | 'selectActual'>('selectIntent');

    // Pitch data
    const [pitchType, setPitchType] = useState<PitchType>('Fastball');
    const [batterSide, setBatterSide] = useState<'R' | 'L'>('R');
    const [isCalledStrike, setIsCalledStrike] = useState(false);

    // Location tracking
    const [intendedZone, setIntendedZone] = useState<ZoneId | null>(null);
    const [intendedX, setIntendedX] = useState<number | null>(null);
    const [intendedY, setIntendedY] = useState<number | null>(null);

    const [actualLocation, setActualLocation] = useState<PitchLocation | null>(null);

    // Logged pitches
    const [pitchLog, setPitchLog] = useState<any[]>([]);

    // Handlers
    const handleSelectIntent = (zone: ZoneId, x: number, y: number) => {
        console.log('Intent selected:', { zone, x, y });
        setIntendedZone(zone);
        setIntendedX(x);
        setIntendedY(y);
        // Auto-switch to actual mode
        setMode('selectActual');
    };

    const handleSelectActual = (zone: ZoneId, x: number, y: number) => {
        console.log('Actual pitch logged:', { zone, x, y });

        // Create the actual location
        const location: PitchLocation = { zone, x, y };
        setActualLocation(location);

        // Log the pitch
        const pitch = {
            pitchId: Date.now().toString(),
            pitchType,
            batterSide,
            intendedZone,
            intendedX,
            intendedY,
            actualZone: zone,
            actualX: x,
            actualY: y,
            isStrike: determineStrike(zone),
            isCalledStrike
        };

        setPitchLog([...pitchLog, pitch]);
        console.log('Pitch logged:', pitch);

        // Reset for next pitch
        setTimeout(() => {
            setActualLocation(null);
            setMode('selectIntent');
        }, 1500);
    };

    const handleReset = () => {
        setMode('selectIntent');
        setIntendedZone(null);
        setIntendedX(null);
        setIntendedY(null);
        setActualLocation(null);
    };

    return (
        <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <h2 style={{ marginBottom: '1.5rem' }}>Pitch Logger</h2>

            {/* Controls */}
            <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: '#F9FAFB',
                borderRadius: 8,
                border: '1px solid #E5E7EB'
            }}>
                {/* Pitch Type */}
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Pitch Type:
                    </label>
                    <select
                        value={pitchType}
                        onChange={(e) => setPitchType(e.target.value as PitchType)}
                        style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    >
                        <option value="Fastball">Fastball (Blue)</option>
                        <option value="Changeup">Changeup (Green)</option>
                        <option value="Curveball">Curveball (Orange)</option>
                        <option value="Slider">Slider (Purple)</option>
                        <option value="Sinker">Sinker (Red)</option>
                    </select>
                </div>

                {/* Batter Side */}
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Batter Side:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setBatterSide('R')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 4,
                                border: batterSide === 'R' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                background: batterSide === 'R' ? '#DBEAFE' : 'white',
                                fontWeight: batterSide === 'R' ? 600 : 400,
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Right
                        </button>
                        <button
                            onClick={() => setBatterSide('L')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 4,
                                border: batterSide === 'L' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                background: batterSide === 'L' ? '#DBEAFE' : 'white',
                                fontWeight: batterSide === 'L' ? 600 : 400,
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Left
                        </button>
                    </div>
                </div>

                {/* Called Strike */}
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isCalledStrike}
                            onChange={(e) => setIsCalledStrike(e.target.checked)}
                            style={{ marginRight: '0.5rem' }}
                        />
                        <span>Called Strike (show backwards K)</span>
                    </label>
                </div>
            </div>

            {/* Mode Indicator */}
            <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: mode === 'selectIntent' ? '#FEF3C7' : '#D1FAE5',
                borderRadius: 8,
                border: `2px solid ${mode === 'selectIntent' ? '#FBBF24' : '#10B981'}`,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '0.875rem'
            }}>
                {mode === 'selectIntent'
                    ? '🎯 Step 1: Click to set INTENDED target'
                    : '✓ Step 2: Click to log ACTUAL pitch location'
                }
            </div>

            {/* Strike Zone */}
            <div style={{ marginBottom: '1rem' }}>
                <StrikeZoneClean
                    mode={mode}
                    pitchType={pitchType}
                    batterSide={batterSide}
                    intendedZone={intendedZone}
                    actualLocation={actualLocation}
                    isCalledStrike={isCalledStrike}
                    onSelectIntent={handleSelectIntent}
                    onSelectActual={handleSelectActual}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={handleReset}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: 6,
                        border: '1px solid #D1D5DB',
                        background: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Reset Current Pitch
                </button>
                <button
                    onClick={() => setPitchLog([])}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: 6,
                        border: '1px solid #DC2626',
                        background: '#FEE2E2',
                        color: '#DC2626',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Clear All Pitches
                </button>
            </div>

            {/* Pitch Log */}
            <div>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                    Pitch Log ({pitchLog.length} pitches)
                </h3>
                <div style={{
                    maxHeight: 300,
                    overflowY: 'auto',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    background: 'white'
                }}>
                    {pitchLog.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
                            No pitches logged yet
                        </div>
                    ) : (
                        pitchLog.map((pitch, idx) => (
                            <div
                                key={pitch.pitchId}
                                style={{
                                    padding: '0.75rem',
                                    borderBottom: idx < pitchLog.length - 1 ? '1px solid #E5E7EB' : 'none',
                                    fontSize: '0.75rem'
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    Pitch #{idx + 1} - {pitch.pitchType}
                                    {pitch.isCalledStrike && ' (Called Strike ꓘ)'}
                                </div>
                                <div style={{ color: '#6B7280' }}>
                                    Intended: {pitch.intendedZone} ({pitch.intendedX?.toFixed(3)}, {pitch.intendedY?.toFixed(3)})
                                </div>
                                <div style={{ color: '#6B7280' }}>
                                    Actual: {pitch.actualZone} ({pitch.actualX?.toFixed(3)}, {pitch.actualY?.toFixed(3)})
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Simple strike determination (all zones are strikes)
 * Customize this based on your strike zone definition
 */
function determineStrike(zone: ZoneId): boolean {
    const strikeZones: ZoneId[] = [
        'Z11', 'Z12', 'Z13',
        'Z21', 'Z22', 'Z23',
        'Z31', 'Z32', 'Z33'
    ];
    return strikeZones.includes(zone);
}
