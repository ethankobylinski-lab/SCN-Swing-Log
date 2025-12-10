import React from 'react';
import { Pitch, GameContext, PitchResult } from './types';

interface BullpenLogProps {
    recentPitches: Pitch[];
    onPitchClick: (id: number) => void;
    onUndo: () => void;
    showScenario: boolean;
    gameContext: GameContext;
    onUpdateContext: (ctx: GameContext) => void;
    syncCount: boolean;
    onToggleSyncCount: () => void;
}

export const BullpenLog: React.FC<BullpenLogProps> = ({
    recentPitches,
    onPitchClick,
    onUndo,
    showScenario,
    gameContext,
    onUpdateContext,
    syncCount,
    onToggleSyncCount,
}) => {

    const getResultColor = (result: PitchResult) => {
        switch (result) {
            case 'ACCURATE': return 'bg-green-500 border-green-600';
            case 'NEAR_TARGET': return 'bg-yellow-400 border-yellow-500';
            case 'STRIKE': return 'bg-blue-500 border-blue-600';
            case 'BALL': return 'bg-red-500 border-red-600';
            default: return 'bg-gray-400';
        }
    };

    const updateCount = (type: 'balls' | 'strikes' | 'outs', delta: number) => {
        const newCtx = { ...gameContext };
        if (type === 'balls') newCtx.balls = Math.max(0, Math.min(4, newCtx.balls + delta));
        if (type === 'strikes') newCtx.strikes = Math.max(0, Math.min(3, newCtx.strikes + delta));
        if (type === 'outs') newCtx.outs = Math.max(0, Math.min(3, newCtx.outs + delta));
        onUpdateContext(newCtx);
    };

    const toggleRunner = (baseIdx: 0 | 1 | 2) => {
        const newRunners = [...gameContext.runners] as [boolean, boolean, boolean];
        newRunners[baseIdx] = !newRunners[baseIdx];
        onUpdateContext({ ...gameContext, runners: newRunners });
    };

    return (
        <div className="w-full bg-slate-900 border-t border-slate-700 flex flex-col">

            {/* Scenario Controls */}
            {showScenario && (
                <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">

                    {/* Count Controls */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 uppercase">Balls</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => updateCount('balls', -1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">-</button>
                                <span className="w-4 text-center font-bold text-white">{gameContext.balls}</span>
                                <button onClick={() => updateCount('balls', 1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">+</button>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 uppercase">Strikes</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => updateCount('strikes', -1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">-</button>
                                <span className="w-4 text-center font-bold text-white">{gameContext.strikes}</span>
                                <button onClick={() => updateCount('strikes', 1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">+</button>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 uppercase">Outs</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => updateCount('outs', -1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">-</button>
                                <span className="w-4 text-center font-bold text-white">{gameContext.outs}</span>
                                <button onClick={() => updateCount('outs', 1)} className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Runners Diamond */}
                    <div className="relative w-12 h-12 rotate-45 border-2 border-slate-600 mx-2">
                        <button
                            onClick={() => toggleRunner(0)} // 1B (Right corner in diamond)
                            className={`absolute top-0 right-0 w-4 h-4 -mr-2 -mt-2 border border-slate-900 rounded-sm ${gameContext.runners[0] ? 'bg-yellow-400' : 'bg-slate-700'}`}
                        />
                        <button
                            onClick={() => toggleRunner(1)} // 2B (Top corner)
                            className={`absolute top-0 left-0 w-4 h-4 -ml-2 -mt-2 border border-slate-900 rounded-sm ${gameContext.runners[1] ? 'bg-yellow-400' : 'bg-slate-700'}`}
                        />
                        <button
                            onClick={() => toggleRunner(2)} // 3B (Left corner)
                            className={`absolute bottom-0 left-0 w-4 h-4 -ml-2 -mb-2 border border-slate-900 rounded-sm ${gameContext.runners[2] ? 'bg-yellow-400' : 'bg-slate-700'}`}
                        />
                    </div>

                    {/* Sync Toggle */}
                    <div className="flex flex-col items-end">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <span>Sync Count</span>
                            <input type="checkbox" checked={syncCount} onChange={onToggleSyncCount} className="accent-blue-500" />
                        </label>
                    </div>

                </div>
            )}

            {/* Recent Log & Undo */}
            <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Pitch History (Last 6)</span>
                    <button
                        onClick={onUndo}
                        disabled={recentPitches.length === 0}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Undo Last
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {recentPitches.slice(-6).reverse().map((pitch, idx) => (
                        <button
                            key={pitch.id}
                            onClick={() => onPitchClick(pitch.id)}
                            className={`
                relative w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 transition-all hover:scale-110
                ${getResultColor(pitch.result)}
              `}
                        >
                            {/* Result indicator - backwards K for strikes */}
                            <span className="text-xs">
                                {pitch.result === 'STRIKE' || pitch.result === 'ACCURATE' || pitch.result === 'NEAR_TARGET' ? 'Ʞ' : ''}
                            </span>

                            {/* Pitch type abbreviation */}
                            <span className="text-[8px] leading-none">
                                {pitch.pitchType.substring(0, 2).toUpperCase()}
                            </span>

                            {/* Swing indicator */}
                            {pitch.swung === true && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border border-white flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">S</span>
                                </div>
                            )}

                            {/* Pitch number indicator */}
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-black/70 px-1 rounded">
                                {recentPitches.length - idx}
                            </span>
                        </button>
                    ))}
                    {recentPitches.length === 0 && (
                        <span className="text-xs text-slate-500 italic">No pitches logged</span>
                    )}
                </div>
            </div>

        </div>
    );
};
