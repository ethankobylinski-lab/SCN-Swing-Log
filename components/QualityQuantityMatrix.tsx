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
                    <span className="text-xl">{emoji}</span>
                    <h4 className="font-bold text-base text-gray-900">{title}</h4>
                </div>
                <p className="text-xs font-medium text-gray-700">{description}</p>
            </div>

            <div className="text-3xl font-bold text-gray-900">
                {players.length}
            </div>

            {players.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {players.map(player => (
                        <div
                            key={player.playerId}
                            className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm flex items-center justify-between shadow-sm"
                        >
                            <span className="font-semibold text-gray-900 truncate">{player.name}</span>
                            <span className="text-xs font-medium text-gray-600 ml-2 whitespace-nowrap">
                                {player.reps} reps • {player.quality}%
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-gray-600 italic">No players</p>
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
