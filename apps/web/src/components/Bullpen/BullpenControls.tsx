import React from 'react';
import { BatterHand, PitchType } from './types';

interface BullpenControlsProps {
    totalPitches: number;
    strikePct: number;
    accuratePct: number;
    targetLabel: string;
    pitchTypes: PitchType[];
    currentPitchType: PitchType;
    onPitchTypeChange: (type: PitchType) => void;
    onAddPitchType: () => void;
    batterHand: BatterHand;
    onToggleHand: () => void;
    isSettingTarget: boolean;
    onToggleTargetMode: () => void;
    showScenario: boolean;
    onToggleScenario: () => void;
}

export const BullpenControls: React.FC<BullpenControlsProps> = ({
    totalPitches,
    strikePct,
    accuratePct,
    targetLabel,
    pitchTypes,
    currentPitchType,
    onPitchTypeChange,
    onAddPitchType,
    batterHand,
    onToggleHand,
    isSettingTarget,
    onToggleTargetMode,
    showScenario,
    onToggleScenario,
}) => {
    return (
        <div className="flex flex-col w-full bg-slate-900 text-white border-b border-slate-700">
            {/* Header Stats */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 shadow-md z-10">
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">Pitch Session</h1>
                    <div className="text-xs text-yellow-400 font-medium mt-0.5">
                        Target: {targetLabel}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold leading-none">{totalPitches}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total</div>
                    </div>
                    <div className="w-px h-8 bg-slate-600" />
                    <div>
                        <div className="text-xl font-bold leading-none text-blue-400">{strikePct.toFixed(0)}%</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Strike</div>
                    </div>
                    <div className="w-px h-8 bg-slate-600" />
                    <div>
                        <div className="text-xl font-bold leading-none text-green-400">{accuratePct.toFixed(0)}%</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Acc</div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar bg-slate-900 border-t border-slate-700">

                {/* Pitch Types Scroll */}
                <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar pr-2">
                    {pitchTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => onPitchTypeChange(type)}
                            className={`
                px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors
                ${currentPitchType === type
                                    ? 'bg-white text-slate-900'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
              `}
                        >
                            {type}
                        </button>
                    ))}
                    <button
                        onClick={onAddPitchType}
                        className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                    >
                        +
                    </button>
                </div>

                <div className="w-px h-6 bg-slate-700 flex-shrink-0" />

                {/* Toggles */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={onToggleHand}
                        className="px-2 py-1.5 bg-slate-800 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 w-10 text-center"
                    >
                        {batterHand}
                    </button>

                    <button
                        onClick={onToggleTargetMode}
                        className={`
              p-1.5 rounded transition-colors
              ${isSettingTarget ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
            `}
                        title="Target Mode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>

                    <button
                        onClick={onToggleScenario}
                        className={`
              px-2 py-1.5 rounded text-xs font-bold transition-colors
              ${showScenario ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
            `}
                    >
                        Scenario
                    </button>
                </div>

            </div>
        </div>
    );
};
