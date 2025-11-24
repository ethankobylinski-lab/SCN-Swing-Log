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
        description: string;
    }> = ({ title, emoji, players, colorClass, description }) => (
        <div className={`${colorClass} rounded-lg p-4 space-y-3`}>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{emoji}</span>
                    <h4 className="font-semibold text-sm">{title}</h4>
                </div>
                <p className="text-[11px] opacity-80">{description}</p>
            </div>

            <div className="text-2xl font-bold">
                {players.length}
            </div>

            {players.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {players.map(player => (
                        <div
                            key={player.playerId}
                            className="bg-black/10 rounded px-2 py-1 text-xs flex items-center justify-between"
                        >
                            <span className="font-medium truncate">{player.name}</span>
                            <span className="text-[10px] opacity-75 ml-2">
                                {player.reps} reps • {player.quality}%
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs opacity-60 italic">No players</p>
            )}
        </div>
    );

    if (data.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center">
                <p className="text-muted-foreground">No player data available yet</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            {/* Explanation */}
            <div className="text-center pb-2">
                <p className="text-sm text-muted-foreground">
                    Players categorized by training volume and execution quality
                </p>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Top Left: High Reps, High Quality */}
                <QuadrantCard
                    title="Stars"
                    emoji="⭐"
                    players={quadrants['high-high']}
                    colorClass="bg-success/20 text-success-foreground"
                    description="High volume, high quality"
                />

                {/* Top Right: Low Reps, High Quality */}
                <QuadrantCard
                    title="Efficient"
                    emoji="🎯"
                    players={quadrants['low-high']}
                    colorClass="bg-info/20 text-info-foreground"
                    description="Low volume, high quality"
                />

                {/* Bottom Left: High Reps, Low Quality */}
                <QuadrantCard
                    title="Grinders"
                    emoji="⚠️"
                    players={quadrants['high-low']}
                    colorClass="bg-warning/20 text-warning-foreground"
                    description="High volume, needs focus"
                />

                {/* Bottom Right: Low Reps, Low Quality */}
                <QuadrantCard
                    title="Needs Attention"
                    emoji="🔴"
                    players={quadrants['low-low']}
                    colorClass="bg-destructive/20 text-destructive-foreground"
                    description="Low volume, low quality"
                />
            </div>

            {/* Legend */}
            <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-muted-foreground text-center">
                    Volume based on team median • Quality threshold: 75% execution
                </p>
            </div>
        </div>
    );
};
