import React, { useMemo } from 'react';
import { Session, PitchType, DrillType } from '../../types';

interface PlayerHittingPitchDrillSummaryProps {
    sessions: Session[];
}

type StatRow = {
    name: string;
    count: number; // Swings or Sessions
    hardHitPct: number;
    executionPct: number;
};

export const PlayerHittingPitchDrillSummary: React.FC<PlayerHittingPitchDrillSummaryProps> = ({ sessions }) => {

    const { pitchTypeStats, drillTypeStats } = useMemo(() => {
        const pStats: Record<string, { swings: number; hardHits: number; executed: number }> = {};
        const dStats: Record<string, { sessions: number; swings: number; hardHits: number; executed: number }> = {};

        sessions.forEach(session => {
            // Track drill types per session to count sessions correctly
            const sessionDrills = new Set<string>();

            session.sets.forEach(set => {
                // Pitch Types
                if (set.pitchTypes && set.pitchTypes.length > 0) {
                    set.pitchTypes.forEach(pt => {
                        if (!pStats[pt]) pStats[pt] = { swings: 0, hardHits: 0, executed: 0 };
                        // We attribute the full set stats to this pitch type context
                        // This is an approximation for mixed sets
                        pStats[pt].swings += set.repsAttempted;
                        pStats[pt].hardHits += set.hardHits || 0;
                        pStats[pt].executed += set.repsExecuted || 0;
                    });
                } else {
                    // Unspecified pitch type
                    const key = 'Unspecified';
                    if (!pStats[key]) pStats[key] = { swings: 0, hardHits: 0, executed: 0 };
                    pStats[key].swings += set.repsAttempted;
                    pStats[key].hardHits += set.hardHits || 0;
                    pStats[key].executed += set.repsExecuted || 0;
                }

                // Drill Types
                // Use set.drillType, or fallback to session name if it looks like a drill
                const drillName = set.drillType || (session.drillId ? session.name : 'Other');

                if (!dStats[drillName]) dStats[drillName] = { sessions: 0, swings: 0, hardHits: 0, executed: 0 };
                dStats[drillName].swings += set.repsAttempted;
                dStats[drillName].hardHits += set.hardHits || 0;
                dStats[drillName].executed += set.repsExecuted || 0;

                sessionDrills.add(drillName);
            });

            // Increment session count for drills used in this session
            sessionDrills.forEach(drill => {
                if (dStats[drill]) dStats[drill].sessions += 1;
            });
        });

        // Convert to arrays and sort
        const pArray = Object.entries(pStats)
            .map(([name, stat]) => ({
                name,
                count: stat.swings,
                hardHitPct: stat.swings > 0 ? Math.round((stat.hardHits / stat.swings) * 100) : 0,
                executionPct: stat.swings > 0 ? Math.round((stat.executed / stat.swings) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count); // Sort by volume

        const dArray = Object.entries(dStats)
            .map(([name, stat]) => ({
                name,
                count: stat.swings, // Display swings as primary volume metric, but maybe show sessions too
                sessions: stat.sessions,
                hardHitPct: stat.swings > 0 ? Math.round((stat.hardHits / stat.swings) * 100) : 0,
                executionPct: stat.swings > 0 ? Math.round((stat.executed / stat.swings) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        return { pitchTypeStats: pArray, drillTypeStats: dArray };
    }, [sessions]);

    const renderTable = (title: string, data: any[], type: 'pitch' | 'drill') => (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
            <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/10">
                        <tr>
                            <th className="px-4 py-3 font-medium">{type === 'pitch' ? 'Pitch Type' : 'Drill'}</th>
                            <th className="px-4 py-3 font-medium text-right">Swings</th>
                            <th className="px-4 py-3 font-medium text-right">Hard Hit %</th>
                            <th className="px-4 py-3 font-medium text-right">Exec %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.length > 0 ? (
                            data.map((row) => (
                                <tr key={row.name} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{row.count}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${row.hardHitPct >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                row.hardHitPct >= 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'text-muted-foreground'
                                            }`}>
                                            {row.hardHitPct}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{row.executionPct}%</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {renderTable('Performance by Pitch Type', pitchTypeStats, 'pitch')}
            {renderTable('Performance by Drill', drillTypeStats, 'drill')}
        </div>
    );
};
