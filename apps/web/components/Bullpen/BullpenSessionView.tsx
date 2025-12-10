import React, { useState, useEffect } from 'react';
import { BullpenStage } from './BullpenStage';
import { BullpenControls } from './BullpenControls';
import { BullpenLog } from './BullpenLog';
import { Pitch, BatterHand, PitchType, GameContext, PitchResult } from './types';
import { BullpenEditDialog } from './BullpenEditDialog';

interface BullpenSessionViewProps {
    initialPitches?: Pitch[];
    onPitchesChange?: (pitches: Pitch[]) => void;
}

const TARGET_LABELS = [
    'High In', 'High Middle', 'High Away',
    'Middle In', 'Middle Middle', 'Middle Away',
    'Low In', 'Low Middle', 'Low Away',
];

export const BullpenSessionView: React.FC<BullpenSessionViewProps> = ({
    initialPitches = [],
    onPitchesChange,
}) => {
    // State
    const [pitches, setPitches] = useState<Pitch[]>(initialPitches);
    const [batterHand, setBatterHand] = useState<BatterHand>('RH');
    const [pitchTypes, setPitchTypes] = useState<PitchType[]>(['FASTBALL', 'CHANGEUP', 'CURVE', 'SLIDER']);
    const [currentPitchType, setCurrentPitchType] = useState<PitchType>('FASTBALL');
    const [targetIndex, setTargetIndex] = useState<number | null>(null);
    const [isSettingTarget, setIsSettingTarget] = useState<boolean>(false);
    const [showScenario, setShowScenario] = useState<boolean>(false);
    const [gameContext, setGameContext] = useState<GameContext>({
        balls: 0,
        strikes: 0,
        outs: 0,
        runners: [false, false, false],
    });
    const [focusedPitchId, setFocusedPitchId] = useState<number | null>(null);
    const [syncCount, setSyncCount] = useState<boolean>(true);

    // Notify parent of changes
    useEffect(() => {
        onPitchesChange?.(pitches);
    }, [pitches, onPitchesChange]);

    // Stats
    const totalPitches = pitches.length;
    const strikePitches = pitches.filter(p => ['ACCURATE', 'NEAR_TARGET', 'STRIKE'].includes(p.result)).length;
    const accuratePitches = pitches.filter(p => p.result === 'ACCURATE').length;
    const strikePct = totalPitches > 0 ? (strikePitches / totalPitches) * 100 : 0;
    const accuratePct = totalPitches > 0 ? (accuratePitches / totalPitches) * 100 : 0;

    // Target Label Logic
    const getTargetLabel = () => {
        if (targetIndex === null) return 'None';

        // Adjust "In" vs "Away" based on batter hand
        // Standard labels are for RH batter (In is Left side of zone, Away is Right side)
        // Wait, standard zone indices:
        // 0 1 2
        // 3 4 5
        // 6 7 8
        // For RH batter (standing on Left):
        // Col 0 is Inside? No, standard view is from pitcher.
        // RH Batter is on the LEFT of the screen (Pitcher's Left).
        // So Inside for RH is Left side (Col 0). Outside is Right side (Col 2).
        // TARGET_LABELS defined as: 'High In', 'High Middle', 'High Away' -> Implies Col 0 is In, Col 2 is Away.

        // If Batter is LH (standing on Right):
        // Inside is Right side (Col 2). Outside is Left side (Col 0).
        // So we need to flip the label if LH.

        const label = TARGET_LABELS[targetIndex];
        if (batterHand === 'LH') {
            if (label.includes('In')) return label.replace('In', 'Away');
            if (label.includes('Away')) return label.replace('Away', 'In');
        }
        return label;
    };

    // Hand Toggle Logic
    const handleToggleHand = () => {
        const newHand = batterHand === 'RH' ? 'LH' : 'RH';
        setBatterHand(newHand);

        // Flip target if necessary (e.g. Low Away -> Low Away for new batter)
        // Current logic: 
        // RH: Col 0 = In, Col 2 = Away
        // LH: Col 0 = Away, Col 2 = In
        // If I am aiming "Low Away" for RH (Index 8, Col 2), and I switch to LH:
        // I still want to aim "Low Away" for LH? Or do I want to keep the physical spot?
        // User request: "If targetIndex === 8 and new hand is LH, set it to 6."
        // 8 is Bottom Right. For RH, that is Low Away.
        // 6 is Bottom Left. For LH, that is Low Away.
        // So yes, we want to preserve the "Intent" (Away/In), not the physical cell.

        if (targetIndex !== null) {
            const row = Math.floor(targetIndex / 3);
            const col = targetIndex % 3;

            // Flip column: 0->2, 2->0, 1->1
            const newCol = 2 - col;
            const newIndex = row * 3 + newCol;
            setTargetIndex(newIndex);
        }
    };

    // Core Pitch Logic - EXACT implementation per user specification
    const handleStageClick = (xPct: number, yPct: number, stageRect: DOMRect, zoneRect: DOMRect) => {
        // 1. Convert click to pixel coordinates
        const pitchX_px = stageRect.left + (xPct / 100) * stageRect.width;
        const pitchY_px = stageRect.top + (yPct / 100) * stageRect.height;

        // 2. Get the REAL strike-zone DOMRect
        const zoneElement = document.getElementById('strike-zone-grid');
        const realZoneRect = zoneElement ? zoneElement.getBoundingClientRect() : zoneRect;

        // 3. Check Strike vs Ball
        const isStrike = (
            pitchX_px >= realZoneRect.left &&
            pitchX_px <= realZoneRect.right &&
            pitchY_px >= realZoneRect.top &&
            pitchY_px <= realZoneRect.bottom
        );

        console.log('🎯 Strike Zone Detection (Pixel-Perfect):', {
            pitchPx: { x: pitchX_px.toFixed(1), y: pitchY_px.toFixed(1) },
            zone: {
                left: realZoneRect.left.toFixed(1),
                right: realZoneRect.right.toFixed(1),
                top: realZoneRect.top.toFixed(1),
                bottom: realZoneRect.bottom.toFixed(1)
            },
            isStrike
        });

        let result: PitchResult = 'BALL';

        // 4. If we have a target, check ACCURATE and NEAR_TARGET before defaulting to STRIKE
        if (targetIndex !== null) {
            const col = targetIndex % 3;
            const row = Math.floor(targetIndex / 3);

            const cellWidth = realZoneRect.width / 3;
            const cellHeight = realZoneRect.height / 3;

            // Calculate target cell boundaries
            const targetLeft = realZoneRect.left + col * cellWidth;
            const targetTop = realZoneRect.top + row * cellHeight;
            const targetRight = targetLeft + cellWidth;
            const targetBottom = targetTop + cellHeight;

            // Check ACCURATE - inside exact target cell
            const isAccurate = (
                pitchX_px >= targetLeft &&
                pitchX_px <= targetRight &&
                pitchY_px >= targetTop &&
                pitchY_px <= targetBottom
            );

            // Check NEAR_TARGET - expanded box around target cell
            const NEAR_THRESHOLD = 0.35;
            const thresholdPx = cellWidth * NEAR_THRESHOLD; // Using cellWidth as per spec

            const nearLeft = targetLeft - thresholdPx;
            const nearRight = targetRight + thresholdPx;
            const nearTop = targetTop - thresholdPx;
            const nearBottom = targetBottom + thresholdPx;

            const isNear = (
                pitchX_px >= nearLeft &&
                pitchX_px <= nearRight &&
                pitchY_px >= nearTop &&
                pitchY_px <= nearBottom
            );

            // Priority order: ACCURATE → NEAR_TARGET → STRIKE → BALL
            if (isAccurate) {
                result = 'ACCURATE';
            } else if (isNear) {
                result = 'NEAR_TARGET';
            } else if (isStrike) {
                result = 'STRIKE';
            } else {
                result = 'BALL';
            }

            console.log('  → Target Check:', {
                targetCell: targetIndex,
                targetPos: `Row ${row}, Col ${col}`,
                isAccurate,
                isNear,
                result
            });
        } else {
            // No target set - just STRIKE or BALL
            result = isStrike ? 'STRIKE' : 'BALL';
        }

        console.log('  → FINAL RESULT:', result);

        // 5. Create pitch with normalized coordinates (xPct, yPct)
        const newPitch: Pitch = {
            id: Date.now(),
            x: xPct,
            y: yPct,
            result,
            pitchType: currentPitchType,
            context: showScenario ? { ...gameContext } : undefined,
        };

        setPitches(prev => [...prev, newPitch]);

        // 6. Update count if sync is enabled
        if (syncCount && showScenario) {
            const newCtx = { ...gameContext };
            if (result === 'BALL') {
                newCtx.balls = Math.min(4, newCtx.balls + 1);
            } else {
                // ACCURATE, NEAR_TARGET, and STRIKE all count as strikes
                newCtx.strikes = Math.min(3, newCtx.strikes + 1);
            }
            setGameContext(newCtx);
        }
    };

    const handleUndo = () => {
        if (pitches.length === 0) return;

        const lastPitch = pitches[pitches.length - 1];
        setPitches(prev => prev.slice(0, -1));

        // Rollback count
        if (syncCount && showScenario) {
            const newCtx = { ...gameContext };
            if (lastPitch.result === 'BALL') {
                newCtx.balls = Math.max(0, newCtx.balls - 1);
            } else {
                newCtx.strikes = Math.max(0, newCtx.strikes - 1);
            }
            setGameContext(newCtx);
        }
    };

    const handleSaveEdit = (updatedPitch: Pitch) => {
        setPitches(prev => prev.map(p => p.id === updatedPitch.id ? updatedPitch : p));
        setFocusedPitchId(null);
    };

    const handleDeleteEdit = (pitchId: number) => {
        setPitches(prev => prev.filter(p => p.id !== pitchId));
        setFocusedPitchId(null);
    };

    const focusedPitch = pitches.find(p => p.id === focusedPitchId) || null;

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
            <BullpenControls
                totalPitches={totalPitches}
                strikePct={strikePct}
                accuratePct={accuratePct}
                targetLabel={getTargetLabel()}
                pitchTypes={pitchTypes}
                currentPitchType={currentPitchType}
                onPitchTypeChange={setCurrentPitchType}
                onAddPitchType={() => {
                    const newType = prompt("Enter new pitch type:");
                    if (newType) setPitchTypes(prev => [...prev, newType.toUpperCase()]);
                }}
                batterHand={batterHand}
                onToggleHand={handleToggleHand}
                isSettingTarget={isSettingTarget}
                onToggleTargetMode={() => setIsSettingTarget(!isSettingTarget)}
                showScenario={showScenario}
                onToggleScenario={() => setShowScenario(!showScenario)}
            />

            <BullpenStage
                pitches={pitches}
                batterHand={batterHand}
                targetIndex={targetIndex}
                isSettingTarget={isSettingTarget}
                onStageClick={handleStageClick}
                onSetTarget={(idx) => {
                    setTargetIndex(idx);
                    setIsSettingTarget(false); // Auto-exit target mode after setting? User didn't specify, but it's good UX.
                }}
                focusedPitchId={focusedPitchId}
                onPitchClick={setFocusedPitchId}
            />

            <BullpenLog
                recentPitches={pitches}
                onPitchClick={setFocusedPitchId}
                onUndo={handleUndo}
                showScenario={showScenario}
                gameContext={gameContext}
                onUpdateContext={setGameContext}
                syncCount={syncCount}
                onToggleSyncCount={() => setSyncCount(!syncCount)}
            />

            <BullpenEditDialog
                pitch={focusedPitch}
                isOpen={focusedPitchId !== null}
                onClose={() => setFocusedPitchId(null)}
                onSave={handleSaveEdit}
                onDelete={handleDeleteEdit}
                pitchTypes={pitchTypes}
            />
        </div>
    );
};
