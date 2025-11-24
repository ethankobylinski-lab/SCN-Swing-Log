import React, { useRef, useEffect, useState } from 'react';
import { Pitch, BatterHand, PitchResult } from './types';

interface BullpenStageProps {
    pitches: Pitch[];
    batterHand: BatterHand;
    targetIndex: number | null;
    isSettingTarget: boolean;
    onStageClick: (xPct: number, yPct: number, rect: DOMRect, zoneRect: DOMRect) => void;
    onSetTarget: (index: number) => void;
    focusedPitchId: number | null;
    onPitchClick: (id: number) => void;
}

export const BullpenStage: React.FC<BullpenStageProps> = ({
    pitches,
    batterHand,
    targetIndex,
    isSettingTarget,
    onStageClick,
    onSetTarget,
    focusedPitchId,
    onPitchClick,
}) => {
    const stageRef = useRef<HTMLDivElement>(null);
    const zoneRef = useRef<HTMLDivElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (!stageRef.current || !zoneRef.current) return;

        const stageRect = stageRef.current.getBoundingClientRect();
        const zoneRect = zoneRef.current.getBoundingClientRect();

        const x = e.clientX - stageRect.left;
        const y = e.clientY - stageRect.top;

        const xPct = (x / stageRect.width) * 100;
        const yPct = (y / stageRect.height) * 100;

        // If setting target, we need to find which cell was clicked
        if (isSettingTarget) {
            // Check if click is inside zone
            if (
                e.clientX >= zoneRect.left &&
                e.clientX <= zoneRect.right &&
                e.clientY >= zoneRect.top &&
                e.clientY <= zoneRect.bottom
            ) {
                const relativeX = e.clientX - zoneRect.left;
                const relativeY = e.clientY - zoneRect.top;

                // Calculate col and row, ensuring they're clamped to valid range
                let col = Math.floor((relativeX / zoneRect.width) * 3);
                let row = Math.floor((relativeY / zoneRect.height) * 3);

                // Clamp to ensure we stay within bounds
                col = Math.max(0, Math.min(2, col));
                row = Math.max(0, Math.min(2, row));

                const index = row * 3 + col;

                console.log('🎯 Target Selection:', {
                    click: { x: e.clientX.toFixed(1), y: e.clientY.toFixed(1) },
                    zone: {
                        left: zoneRect.left.toFixed(1),
                        top: zoneRect.top.toFixed(1),
                        width: zoneRect.width.toFixed(1),
                        height: zoneRect.height.toFixed(1)
                    },
                    relative: { x: relativeX.toFixed(1), y: relativeY.toFixed(1) },
                    calculated: { row, col, index }
                });

                if (index >= 0 && index <= 8) {
                    onSetTarget(index);
                }
            }
            return;
        }

        onStageClick(xPct, yPct, stageRect, zoneRect);
    };

    const getResultColor = (result: PitchResult) => {
        switch (result) {
            case 'ACCURATE': return 'bg-green-500 border-green-600';
            case 'NEAR_TARGET': return 'bg-yellow-400 border-yellow-500';
            case 'STRIKE': return 'bg-blue-500 border-blue-600';
            case 'BALL': return 'bg-red-500 border-red-600';
            default: return 'bg-gray-400';
        }
    };

    const getPitchLabel = (pitch: Pitch) => {
        // Show backwards K for strikes (called strikes), nothing for balls
        if (pitch.result === 'STRIKE' || pitch.result === 'ACCURATE' || pitch.result === 'NEAR_TARGET') {
            return 'Ʞ'; // Backwards K for called strike
        }
        return ''; // Empty for balls
    };

    return (
        <div className="relative flex-1 w-full bg-slate-800 overflow-hidden flex flex-col items-center justify-center select-none" ref={stageRef} onClick={handleClick}>
            {/* Background / Mound Context */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                {/* Subtle dirt texture or gradient could go here */}
                <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800" />
            </div>

            {/* Helper Text */}
            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-0">
                <p className="text-slate-400 text-sm font-medium opacity-60">
                    {isSettingTarget
                        ? "Tap a box to set target"
                        : "Tap anywhere to log pitch"}
                </p>
            </div>

            {/* Batter Boxes & Plate Container */}
            <div className="relative w-[80%] max-w-[600px] aspect-square flex items-center justify-center">

                {/* Home Plate */}
                <div className="absolute bottom-[15%] w-[17%] h-[17%] pointer-events-none opacity-90">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-white stroke-slate-300 stroke-2">
                        <path d="M50 0 L100 50 L100 100 L0 100 L0 50 Z" />
                    </svg>
                </div>

                {/* Batter Boxes */}
                {/* RH Box (Left side from pitcher view) */}
                <div className={`absolute left-[10%] bottom-[15%] w-[25%] h-[50%] border-2 border-white/30 flex items-center justify-center transition-opacity duration-300 ${batterHand === 'RH' ? 'opacity-100' : 'opacity-30'}`}>
                    {batterHand === 'RH' && (
                        <div className="w-[80%] h-[90%] bg-slate-400/20 rounded-full animate-pulse" />
                        /* Placeholder for silhouette */
                    )}
                </div>

                {/* LH Box (Right side from pitcher view) */}
                <div className={`absolute right-[10%] bottom-[15%] w-[25%] h-[50%] border-2 border-white/30 flex items-center justify-center transition-opacity duration-300 ${batterHand === 'LH' ? 'opacity-100' : 'opacity-30'}`}>
                    {batterHand === 'LH' && (
                        <div className="w-[80%] h-[90%] bg-slate-400/20 rounded-full animate-pulse" />
                        /* Placeholder for silhouette */
                    )}
                </div>

                {/* Strike Zone Grid */}
                <div
                    id="strike-zone-grid"
                    ref={zoneRef}
                    className={`relative w-[35%] aspect-[0.8] border-2 border-white/80 bg-white/5 grid grid-cols-3 grid-rows-3 z-10 ${isSettingTarget ? 'cursor-crosshair ring-2 ring-yellow-400/50' : ''}`}
                >
                    {[...Array(9)].map((_, i) => (
                        <div
                            key={i}
                            className={`
                border border-white/20 relative
                ${targetIndex === i ? 'bg-yellow-400/20 shadow-[inset_0_0_15px_rgba(250,204,21,0.4)]' : ''}
                ${isSettingTarget ? 'hover:bg-white/10' : ''}
              `}
                        >
                            {targetIndex === i && (
                                <div className="absolute inset-0 border-2 border-yellow-400 animate-pulse" />
                            )}
                        </div>
                    ))}
                </div>

            </div>

            {/* Rendered Pitches */}
            {pitches.map((pitch) => (
                <div
                    key={pitch.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPitchClick(pitch.id);
                    }}
                    className={`
            absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 shadow-md cursor-pointer transform transition-transform hover:scale-125 z-20 flex items-center justify-center
            ${getResultColor(pitch.result)}
            ${focusedPitchId === pitch.id ? 'ring-2 ring-white scale-125' : ''}
          `}
                    style={{ left: `${pitch.x}%`, top: `${pitch.y}%` }}
                >
                    {/* Pitch label - backwards K for strikes, empty for balls */}
                    <span className="text-white text-xs font-bold select-none">
                        {getPitchLabel(pitch)}
                    </span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/50 px-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        #{pitch.id} {pitch.pitchType}
                    </span>
                </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-black/40 p-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" />
                    <span className="text-xs text-white/80">Accurate</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
                    <span className="text-xs text-white/80">Near</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600" />
                    <span className="text-xs text-white/80">Strike</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600" />
                    <span className="text-xs text-white/80">Ball</span>
                </div>
            </div>

        </div>
    );
};
