import React from 'react';
import { PlayerQuadrantData } from '../utils/teamInsights';

interface QualityQuantityMatrixProps {
    data: PlayerQuadrantData[];
}

export const QualityQuantityMatrix: React.FC<QualityQuantityMatrixProps> = ({ data }) => {
    const quadrants = {
        'high-high': data.filter(p => p.quadrant === 'high-high'),
        'high-low': data.filter(p => p.quadrant === 'high-low'),
        'low-high': data.filter(p => p.quadrant === 'low-high'),
        'low-low': data.filter(p => p.quadrant === 'low-low')
    };

    const QuadrantCard: React.FC<{
        title: string;
        emoji: string;
        players: PlayerQuadrantData[];
        colorClass: string;
        borderColorClass: string;
        description: string;
    }> = ({ title, emoji, players, colorClass, borderColorClass, description }) => (
        <div className={`${colorClass} border ${borderColorClass} rounded-xl p-5 space-y-4 transition-all duration-300 hover:shadow-md relative overflow-hidden group`}>
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 text-[100px] opacity-5 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                {emoji}
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl shadow-sm bg-white/50 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm">{emoji}</span>
                    <div>
                        <h4 className="font-bold text-lg text-foreground tracking-tight">{title}</h4>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{description}</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex items-end gap-2">
                <span className="text-4xl font-black text-foreground/80">
                    {players.length}
                </span>
                <span className="text-xs font-medium text-muted-foreground mb-1.5">players</span>
            </div>

            {players.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 relative z-10">
                    {players.map(player => (
                        <div
                            key={player.playerId}
                            className="bg-white/60 hover:bg-white/90 border border-black/5 hover:border-black/10 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between shadow-sm transition-all cursor-default backdrop-blur-sm"
                        >
                            <span className="font-semibold text-foreground truncate">{player.name}</span>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-medium text-muted-foreground bg-black/5 px-1.5 py-0.5 rounded">
                                    {player.reps} reps
                                </span>
                                <span className={`font-bold ${player.quality >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {player.quality}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="relative z-10 h-12 flex items-center justify-center border border-dashed border-black/10 rounded-lg bg-black/5">
                    <p className="text-xs text-muted-foreground italic">No players in this zone</p>
                </div>
            )}
        </div>
    );

    if (data.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl grayscale">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">No Data Available</h3>
                <p className="text-muted-foreground mt-1">Log some sessions to see the team matrix.</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground">Quality vs. Quantity Matrix</h3>
                <p className="text-sm text-muted-foreground">
                    Categorizing players by training volume and execution quality
                </p>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Left: High Reps, High Quality */}
                <QuadrantCard
                    title="Stars"
                    emoji="⭐"
                    players={quadrants['high-high']}
                    colorClass="bg-gradient-to-br from-green-50 to-emerald-100/50"
                    borderColorClass="border-green-200"
                    description="High Volume • High Quality"
                />

                {/* Top Right: Low Reps, High Quality */}
                <QuadrantCard
                    title="Efficient"
                    emoji="🎯"
                    players={quadrants['low-high']}
                    colorClass="bg-gradient-to-br from-blue-50 to-indigo-100/50"
                    borderColorClass="border-blue-200"
                    description="Low Volume • High Quality"
                />

                {/* Bottom Left: High Reps, Low Quality */}
                <QuadrantCard
                    title="Grinders"
                    emoji="💪"
                    players={quadrants['high-low']}
                    colorClass="bg-gradient-to-br from-amber-50 to-orange-100/50"
                    borderColorClass="border-amber-200"
                    description="High Volume • Needs Focus"
                />

                {/* Bottom Right: Low Reps, Low Quality */}
                <QuadrantCard
                    title="Needs Attention"
                    emoji="🚩"
                    players={quadrants['low-low']}
                    colorClass="bg-gradient-to-br from-red-50 to-rose-100/50"
                    borderColorClass="border-red-200"
                    description="Low Volume • Low Quality"
                />
            </div>

            {/* Legend */}
            <div className="border-t border-border pt-4 flex justify-center">
                <div className="inline-flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Volume based on team median
                    </span>
                    <span className="w-px h-3 bg-border"></span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Quality threshold: 75% execution
                    </span>
                </div>
            </div>
        </div>
    );
};
