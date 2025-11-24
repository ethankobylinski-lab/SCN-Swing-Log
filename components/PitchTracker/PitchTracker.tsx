import React, { useState, useEffect, useContext } from 'react';
import { DataContext } from '../../contexts/DataContext';
import { PitchRecord, PitchTypeModel, ZoneId, PitchOutcome, PitchSessionAnalytics, PitchType } from '../../types';
import { StrikeZoneClean, PitchLocation } from '../StrikeZoneClean';
import { BatterCountRow } from './BatterCountRow';
import { GameSituationPanel } from './GameSituationPanel';
import { PitchTypeSelector } from './PitchTypeSelector';
import { AfterSessionReportModal } from './AfterSessionReportModal';
import { isInStrikeZone, zoneIdToRowCol, distanceFromTargetInches } from '../../utils/strikeZoneHelpers';

interface PitchTrackerProps {
    sessionId: string;
    onNavigateBack?: () => void;
}

/**
 * PitchTracker - Mobile-first single-column pitching session recorder
 * 
 * Layout (top to bottom):
 * 1. Situation Card (batter + count)
 * 2. Pitch Location (strike zone + target)
 * 3. Pitch Type Row
 * 4. Advanced Situation (collapsible)
 * 5. Notes
 * 6. End Session button
 */
export const PitchTracker: React.FC<PitchTrackerProps> = ({ sessionId, onNavigateBack }) => {
    const context = useContext(DataContext);

    if (!context) throw new Error('PitchTracker must be used within DataProvider');

    const {
        getPitchSession,
        getPitchHistory,
        recordPitch,
        finalizePitchSession,
        getPitchTypesForPitcher,
        addCustomPitchType
    } = context;

    // Session state
    const [session, setSession] = useState<any>(null);
    const [pitchHistory, setPitchHistory] = useState<PitchRecord[]>([]);
    const [pitchTypes, setPitchTypes] = useState<PitchTypeModel[]>([]);

    // Situation state
    const [batterSide, setBatterSide] = useState<'L' | 'R'>('R');
    const [balls, setBalls] = useState(0);
    const [strikeCount, setStrikeCount] = useState(0);

    // Pitch selection state (persists across pitches)
    const [selectedPitchTypeId, setSelectedPitchTypeId] = useState<string>('');
    const [targetZone, setTargetZone] = useState<ZoneId>('Z22'); // Default middle-middle
    const [targetX, setTargetX] = useState(0.5);
    const [targetY, setTargetY] = useState(0.5);

    // Pitcher handedness (for arm side/glove side analysis)
    const [pitcherHand, setPitcherHand] = useState<'R' | 'L'>('R');

    // Advanced situation (collapsible)
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [runnersOn, setRunnersOn] = useState({ on1b: false, on2b: false, on3b: false });
    const [outs, setOuts] = useState<0 | 1 | 2>(0);

    // Notes and modal
    const [sessionNotes, setSessionNotes] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [sessionAnalytics, setSessionAnalytics] = useState<PitchSessionAnalytics | null>(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'selectIntent' | 'selectActual'>('selectIntent');

    // Edit pitch modal
    const [editingPitch, setEditingPitch] = useState<PitchRecord | null>(null);
    const [editOutcome, setEditOutcome] = useState<PitchOutcome>('called_strike');

    // Load session data
    useEffect(() => {
        const loadData = async () => {
            try {
                const sessionData = await getPitchSession(sessionId);
                if (!sessionData) {
                    alert('Session not found');
                    if (onNavigateBack) onNavigateBack();
                    return;
                }

                setSession(sessionData);

                const history = await getPitchHistory(sessionId);
                setPitchHistory(history);

                const types = await getPitchTypesForPitcher(sessionData.pitcherId);
                setPitchTypes(types);

                if (types.length > 0) {
                    setSelectedPitchTypeId(types[0].id);
                }
            } catch (error) {
                console.error('Error loading session:', error);
                alert('Failed to load session');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sessionId]);

    const handleSelectIntent = (zone: ZoneId, x: number, y: number) => {
        // Set intended target
        if (saving) return;
        setTargetZone(zone);
        setTargetX(x);
        setTargetY(y);
        // Automatically switch to actual pitch mode after setting target
        setMode('selectActual');
    };

    const handleSelectActual = async (actualZone: ZoneId, actualX: number, actualY: number) => {
        if (mode !== 'selectActual') return; // Only allow when in selectActual mode
        if (!selectedPitchTypeId) {
            alert('Please select a pitch type first');
            return;
        }

        if (saving) return;

        try {
            setSaving(true);

            const outcome: PitchOutcome = determineOutcome(actualZone, actualX, actualY);

            // Calculate miss distance in inches
            let missDistanceInches: number | undefined;
            const intendedRowCol = zoneIdToRowCol(targetZone);
            const actualRowCol = zoneIdToRowCol(actualZone);

            if (intendedRowCol && actualRowCol) {
                const { distanceInches } = distanceFromTargetInches(intendedRowCol, actualRowCol);
                missDistanceInches = distanceInches;
            }

            const newPitch: Omit<PitchRecord, 'id' | 'sessionId' | 'createdAt'> = {
                index: pitchHistory.length + 1,
                batterSide,
                ballsBefore: balls,
                strikesBefore: strikeCount,
                runnersOn,
                outs,
                pitchTypeId: selectedPitchTypeId,
                targetZone,
                targetXNorm: targetX,
                targetYNorm: targetY,
                actualZone,
                actualXNorm: actualX,
                actualYNorm: actualY,
                outcome,
                missDistanceInches
            };

            await recordPitch(sessionId, newPitch);

            // Refresh history
            const updatedHistory = await getPitchHistory(sessionId);
            setPitchHistory(updatedHistory);

            // Reset count but keep mode as 'selectActual' for continuous logging
            setBalls(0);
            setStrikeCount(0);
            setRunnersOn({ on1b: false, on2b: false, on3b: false });
            setOuts(0);

            // CHANGED: Keep target where it is - user must manually change it
            // No auto-reset of target zone

        } catch (error) {
            console.error('Error recording pitch:', error);
            alert('Failed to save pitch. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddCustomPitchType = async (name: string, code: string, colorHex: string) => {
        if (!session) return;

        try {
            await addCustomPitchType(session.pitcherId, name, code, colorHex);
            const updatedTypes = await getPitchTypesForPitcher(session.pitcherId);
            setPitchTypes(updatedTypes);
        } catch (error) {
            console.error('Error adding pitch type:', error);
            alert('Failed to add pitch type');
        }
    };

    const handleEditPitch = async () => {
        if (!editingPitch) return;

        try {
            // Update pitch with new outcome
            const updated: Partial<PitchRecord> = {
                outcome: editOutcome
            };

            // Call update function (would need to add to DataContext)
            // For now, just refresh history to simulate
            const updatedHistory = await getPitchHistory(sessionId);
            setPitchHistory(updatedHistory);

            setEditingPitch(null);
        } catch (error) {
            console.error('Error updating pitch:', error);
            alert('Failed to update pitch');
        }
    };

    const handleEndSession = async () => {
        try {
            // Finalize the session to calculate analytics
            await finalizePitchSession(sessionId);

            // Fetch the updated session with analytics
            const updatedSession = await getPitchSession(sessionId);
            if (updatedSession?.analytics) {
                setSessionAnalytics(updatedSession.analytics);
            }

            // Show the report modal
            setShowReportModal(true);
        } catch (error) {
            console.error('Error finalizing session:', error);
            alert('Failed to finalize session. You can still view the report.');
            // Show modal anyway with what we have
            setShowReportModal(true);
        }
    };

    const handleCloseReport = () => {
        setShowReportModal(false);
        if (onNavigateBack) onNavigateBack();
    };

    // Calculate stats
    const totalStrikes = pitchHistory.filter(p =>
        p.outcome === 'called_strike' || p.outcome === 'swinging_strike' || p.outcome === 'foul'
    ).length;
    const strikePercentage = pitchHistory.length > 0
        ? Math.round((totalStrikes / pitchHistory.length) * 100)
        : 0;

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Loading session...
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Session not found
            </div>
        );
    }

    // Convert pitch history to dot format for StrikeZone
    const pitchDots = pitchHistory.map(p => ({
        id: p.id,
        xNorm: p.actualXNorm,
        yNorm: p.actualYNorm
    }));

    return (
        <div className="max-w-2xl mx-auto p-4 bg-background min-h-screen font-sans">
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-border animate-fadeIn">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="m-0 text-2xl font-bold text-foreground">{session.sessionName}</h1>
                        <p className="mt-1 text-muted-foreground text-sm">
                            Pitch #{pitchHistory.length + 1}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                            {strikePercentage}%
                        </div>
                        <div className="text-xs text-muted-foreground">Strike Rate</div>
                    </div>
                </div>
            </div>

            {/* 1. Situation Card - Batter & Count */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <h3 className="m-0 mb-4 text-sm font-semibold text-muted-foreground">Situation</h3>
                <BatterCountRow
                    batterSide={batterSide}
                    balls={balls}
                    strikes={strikeCount}
                    onBatterSideChange={setBatterSide}
                    onBallsChange={setBalls}
                    onStrikesChange={setStrikeCount}
                />

                {/* Pitcher Handedness Row */}
                <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">Pitcher:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPitcherHand('R')}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${pitcherHand === 'R'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            RHP
                        </button>
                        <button
                            onClick={() => setPitcherHand('L')}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${pitcherHand === 'L'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            LHP
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Game Scenario Card (Optional) */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="m-0 text-sm font-semibold text-muted-foreground">Game Scenario</h3>
                        <span className="text-xs text-muted-foreground/70 italic">(Optional)</span>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs font-semibold text-primary hover:underline"
                    >
                        {showAdvanced ? 'Hide' : 'Show'}
                    </button>
                </div>

                {showAdvanced && (
                    <GameSituationPanel
                        runnersOn={runnersOn}
                        outs={outs}
                        onRunnersChange={setRunnersOn}
                        onOutsChange={setOuts}
                    />
                )}
            </div>

            {/* 3. Pitch Type Selection */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <h3 className="m-0 mb-4 text-sm font-semibold text-muted-foreground">Pitch Type</h3>
                <PitchTypeSelector
                    pitchTypes={pitchTypes}
                    selectedTypeId={selectedPitchTypeId}
                    onSelect={setSelectedPitchTypeId}
                    onAddCustom={handleAddCustomPitchType}
                />
            </div>

            {/* 4. Pitch Location Card */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
                <div className="mb-3">
                    <h3 className="m-0 mb-1 text-sm font-semibold text-muted-foreground">Pitch Location</h3>
                    <p className="m-0 text-xs text-muted-foreground/70">View: Catcher</p>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setMode('selectIntent')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm border-2 transition-all ${mode === 'selectIntent'
                            ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-background text-foreground border-border hover:border-yellow-500'
                            }`}
                    >
                        🎯 Set Intended Target
                    </button>
                    <button
                        onClick={() => setMode('selectActual')}
                        disabled={mode === 'selectIntent'}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm border-2 transition-all ${mode === 'selectActual'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                            }`}
                    >
                        ✓ Log Pitch
                    </button>
                </div>

                <div className="text-center mb-2 text-sm text-muted-foreground">
                    {mode === 'selectIntent' ? (
                        <span>Tap strike zone to <strong className="text-yellow-500">set target</strong></span>
                    ) : (
                        <span>Tap strike zone to <strong className="text-green-600">record actual location</strong></span>
                    )}
                </div>
                <StrikeZoneClean
                    mode={mode}
                    pitchType={getPitchTypeName(selectedPitchTypeId, pitchTypes)}
                    pitchTypeColor={getPitchTypeColorHex(selectedPitchTypeId, pitchTypes)}
                    batterSide={batterSide}
                    pitcherHand={pitcherHand}
                    intendedZone={mode === 'selectIntent' ? null : targetZone}
                    isCalledStrike={false}
                    pitchHistory={pitchHistory.map(p => ({
                        id: p.id,
                        x: p.actualXNorm || 0.5,
                        y: p.actualYNorm || 0.5,
                        color: getPitchTypeColorHex(p.pitchTypeId, pitchTypes) || '#6B7280',
                        isCalledStrike: p.outcome === 'called_strike'
                    }))}
                    onSelectIntent={handleSelectIntent}
                    onSelectActual={handleSelectActual}
                />
                {saving && (
                    <div className="text-center mt-2 text-primary text-sm animate-pulse">
                        Saving pitch...
                    </div>
                )}

                {/* Recent Pitch History - Last 6 */}
                {pitchHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Recent Pitches (Double-tap to edit)</h4>
                        <div className="grid grid-cols-6 gap-2">
                            {pitchHistory.slice(-6).reverse().map((pitch, index) => {
                                const pitchType = pitchTypes.find(t => t.id === pitch.pitchTypeId);
                                const isStrike = pitch.outcome === 'called_strike' || pitch.outcome === 'swinging_strike';
                                return (
                                    <div
                                        key={pitch.id}
                                        onDoubleClick={() => {
                                            setEditingPitch(pitch);
                                            setEditOutcome(pitch.outcome);
                                        }}
                                        className="p-2 bg-muted/50 rounded text-center cursor-pointer hover:bg-muted transition-colors"
                                        title={`#${pitch.index}: ${pitchType?.code || '?'} - ${pitch.outcome}`}
                                    >
                                        <div className="text-xs font-bold" style={{ color: pitchType?.colorHex || '#6B7280' }}>
                                            {pitchType?.code || '?'}
                                        </div>
                                        <div className={`text-xs mt-1 ${isStrike ? 'text-green-600 font-semibold' : 'text-muted-foreground'
                                            }`}>
                                            {isStrike ? 'K' : 'B'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Notes */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                <h3 className="m-0 mb-3 text-sm font-semibold text-muted-foreground">Notes</h3>
                <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Any observations or notes about this session..."
                    rows={3}
                    className="w-full p-3 border border-input rounded-lg text-sm resize-y font-sans bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
            </div>

            {/* 6. Session Summary */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                <div className="flex justify-between mb-4 text-sm text-foreground">
                    <div>
                        <strong>Total Pitches:</strong> {pitchHistory.length}
                    </div>
                    <div>
                        <strong>Strikes:</strong> {totalStrikes} ({strikePercentage}%)
                    </div>
                </div>
                <button
                    onClick={handleEndSession}
                    className="w-full p-4 rounded-lg border-none bg-green-600 text-white font-bold text-base cursor-pointer hover:bg-green-700 hover-scale active-press transition-smooth shadow-md hover:shadow-lg"
                >
                    End Session & View Report
                </button>
            </div>

            {/* After Session Report Modal */}
            {showReportModal && sessionAnalytics && (
                <AfterSessionReportModal
                    isOpen={showReportModal}
                    analytics={sessionAnalytics}
                    pitches={pitchHistory}
                    totalPitches={pitchHistory.length}
                    sessionName={session.sessionName}
                    onClose={handleCloseReport}
                />
            )}

            {/* Edit Pitch Modal */}
            {editingPitch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setEditingPitch(null)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-background p-8 rounded-xl shadow-2xl max-w-lg w-[90%] animate-scaleIn border border-border">
                        <h3 className="text-xl font-bold mb-4 text-foreground">Edit Pitch #{editingPitch.index}</h3>

                        <div className="space-y-4">
                            {/* Pitch Info */}
                            <div className="text-sm text-muted-foreground">
                                <div className="mb-2">
                                    <strong>Pitch Type:</strong> {pitchTypes.find(t => t.id === editingPitch.pitchTypeId)?.code || '?'}
                                </div>
                                <div className="mb-2">
                                    <strong>Location:</strong> Target: {editingPitch.targetZone} → Actual: {editingPitch.actualZone}
                                </div>
                                <div className="mb-4">
                                    <strong>Count:</strong> {editingPitch.ballsBefore}-{editingPitch.strikesBefore}
                                </div>
                            </div>

                            {/* Outcome Override */}
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Outcome Override
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="outcome"
                                            checked={editOutcome === 'ball'}
                                            onChange={() => setEditOutcome('ball')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Ball</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="outcome"
                                            checked={editOutcome === 'called_strike'}
                                            onChange={() => setEditOutcome('called_strike')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Called Strike</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="outcome"
                                            checked={editOutcome === 'swinging_strike'}
                                            onChange={() => setEditOutcome('swinging_strike')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Swinging Strike</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingPitch(null)}
                                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditPitch}
                                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Simple outcome determination based on zone.
 */
/**
 * Determine pitch outcome based on location
 * Ball = outside 3x3 strike zone grid
 * Strike = inside or touching border of 3x3 grid
 */
function determineOutcome(zone: ZoneId, xNorm: number, yNorm: number): PitchOutcome {
    // The strike zone is the area where normalized coordinates are in range [0, 1]
    // But we need to check if the pitch is actually IN the strike zone grid area
    // Remember: Our clickable area is 90 units (5-95), and the grid is 60 units centered (would be at 15-75 in that space)
    // But our normalized coords map the 90-unit area to 0-1

    // In our current setup, the 3x3 grid represents the strike zone
    // The grid occupies a portion of the clickable area
    // We need to determine if the normalized coords fall within Grid boundaries

    // Since the clickable area (90 units) maps to 0-1 normalized:
    // - The 3x3 grid is centered and takes up specific portion
    // - Let's be more precise: if coords suggest it's OUTSIDE the grid bounds, it's a ball

    // Simple approach: Check if very close to zone boundaries
    // The 3x3 grid in our 0-1 normalized space should roughly be the middle portion
    // Let's use the actual grid fraction: 60/90 = 2/3 of the area
    // Centered means it starts at (90-60)/2 / 90 = 15/90 = 1/6 ≈ 0.167
    // And ends at (15+60)/90 = 75/90 ≈ 0.833

    const GRID_START = 15 / 90;  // 0.167
    const GRID_END = 75 / 90;     // 0.833

    const inXBounds = xNorm >= GRID_START && xNorm <= GRID_END;
    const inYBounds = yNorm >= GRID_START && yNorm <= GRID_END;

    if (inXBounds && inYBounds) {
        return 'called_strike';
    }

    return 'ball';
}

/**
 * Get pitch type name from ID
 */
function getPitchTypeName(pitchTypeId: string, pitchTypes: PitchTypeModel[]): PitchType | undefined {
    const pitchTypeModel = pitchTypes.find(pt => pt.id === pitchTypeId);
    if (!pitchTypeModel) return undefined;

    // Map standard codes to PitchType
    const codeMap: Record<string, PitchType> = {
        'FB': 'Fastball',
        'CH': 'Changeup',
        'CB': 'Curveball',
        'SL': 'Slider',
        'SI': 'Sinker'
    };

    return codeMap[pitchTypeModel.code] || 'Fastball';
}

/**
 * Get pitch type color hex from ID
 */
function getPitchTypeColorHex(pitchTypeId: string, pitchTypes: PitchTypeModel[]): string | undefined {
    const pitchTypeModel = pitchTypes.find(pt => pt.id === pitchTypeId);
    return pitchTypeModel?.colorHex;
}
