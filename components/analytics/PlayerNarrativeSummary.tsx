import React, { useMemo } from 'react';
import { Session, PitchSession, TargetZone } from '../../types';

interface PlayerNarrativeSummaryProps {
    hittingSessions: Session[];
    pitchingSessions: PitchSession[];
}

export const PlayerNarrativeSummary: React.FC<PlayerNarrativeSummaryProps> = ({ hittingSessions, pitchingSessions }) => {

    const hittingInsights = useMemo(() => {
        const insights: string[] = [];
        const zoneStats: Record<string, { swings: number; hardHits: number }> = {};
        const pitchStats: Record<string, { swings: number; hardHits: number }> = {};

        hittingSessions.forEach(s => {
            s.sets.forEach(set => {
                // Zone Stats
                set.targetZones?.forEach(z => {
                    if (!zoneStats[z]) zoneStats[z] = { swings: 0, hardHits: 0 };
                    zoneStats[z].swings += set.repsAttempted;
                    zoneStats[z].hardHits += set.hardHits || 0;
                });
                // Pitch Stats
                set.pitchTypes?.forEach(pt => {
                    if (!pitchStats[pt]) pitchStats[pt] = { swings: 0, hardHits: 0 };
                    pitchStats[pt].swings += set.repsAttempted;
                    pitchStats[pt].hardHits += set.hardHits || 0;
                });
            });
        });

        // Analyze Zones
        const zones = Object.entries(zoneStats)
            .map(([zone, stat]) => ({
                zone,
                pct: stat.swings > 0 ? (stat.hardHits / stat.swings) : 0,
                swings: stat.swings
            }))
            .filter(z => z.swings >= 10); // Min sample size

        if (zones.length > 0) {
            const sorted = [...zones].sort((a, b) => b.pct - a.pct);
            const best = sorted.slice(0, 2).map(z => z.zone).join(' & ');
            const worst = sorted.slice(-2).reverse().map(z => z.zone).join(' & ');

            if (best) insights.push(`Strength: Strongest contact in ${best} zones.`);
            if (worst && worst !== best) insights.push(`Area to Improve: Lower hard-hit rate in ${worst} zones.`);
        }

        // Analyze Pitch Types
        const pitches = Object.entries(pitchStats)
            .map(([type, stat]) => ({
                type,
                pct: stat.swings > 0 ? (stat.hardHits / stat.swings) : 0,
                swings: stat.swings
            }))
            .filter(p => p.swings >= 10);

        if (pitches.length > 0) {
            const bestPitch = pitches.sort((a, b) => b.pct - a.pct)[0];
            if (bestPitch) {
                insights.push(`Best vs ${bestPitch.type}: ${Math.round(bestPitch.pct * 100)}% hard-hit rate.`);
            }
        }

        return insights;
    }, [hittingSessions]);

    const pitchingInsights = useMemo(() => {
        const insights: string[] = [];
        const zoneStats: Record<string, { attempts: number; hits: number }> = {};
        let missesHigh = 0, missesLow = 0, missesArm = 0, missesGlove = 0;
        let totalMisses = 0;

        pitchingSessions.forEach(s => {
            s.pitchRecords?.forEach(p => {
                if (p.targetZone) {
                    if (!zoneStats[p.targetZone]) zoneStats[p.targetZone] = { attempts: 0, hits: 0 };
                    zoneStats[p.targetZone].attempts++;
                    if (p.actualZone === p.targetZone) {
                        zoneStats[p.targetZone].hits++;
                    } else if (p.actualZone) {
                        // Analyze Misses (Simple Row/Col logic)
                        const targetRow = parseInt(p.targetZone[1]);
                        const targetCol = parseInt(p.targetZone[2]);
                        const actualRow = parseInt(p.actualZone[1]);
                        const actualCol = parseInt(p.actualZone[2]);

                        if (!isNaN(targetRow) && !isNaN(actualRow)) {
                            if (actualRow < targetRow) missesHigh++;
                            if (actualRow > targetRow) missesLow++;
                        }
                        if (!isNaN(targetCol) && !isNaN(actualCol)) {
                            if (actualCol < targetCol) missesGlove++; // Assuming RHP/Catcher view: Col 1 is Left/Glove?
                            if (actualCol > targetCol) missesArm++;
                        }
                        totalMisses++;
                    }
                }
            });
        });

        // Analyze Command
        const zones = Object.entries(zoneStats)
            .map(([zone, stat]) => ({
                zone,
                pct: stat.attempts > 0 ? (stat.hits / stat.attempts) : 0,
                attempts: stat.attempts
            }))
            .filter(z => z.attempts >= 5);

        if (zones.length > 0) {
            const sorted = [...zones].sort((a, b) => b.pct - a.pct);
            const best = sorted[0];
            if (best) insights.push(`Strength: Excellent command of ${best.zone} (${Math.round(best.pct * 100)}% hit rate).`);
        }

        // Analyze Miss Patterns
        if (totalMisses > 5) {
            const patterns = [
                { name: 'High', count: missesHigh },
                { name: 'Low', count: missesLow },
                { name: 'Glove-side', count: missesGlove },
                { name: 'Arm-side', count: missesArm }
            ].sort((a, b) => b.count - a.count);

            const topMiss = patterns[0];
            if (topMiss.count > totalMisses * 0.3) { // If > 30% of misses are in one direction
                insights.push(`Tendency: Misses often tend to be ${topMiss.name}.`);
            }
        }

        return insights;
    }, [pitchingSessions]);

    if (hittingInsights.length === 0 && pitchingInsights.length === 0) return null;

    return (
        <div className="bg-card border border-border rounded-xl p-7 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-foreground mb-5">Coach's Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {hittingInsights.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">Hitting</h3>
                        <ul className="space-y-3">
                            {hittingInsights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-3 text-base text-foreground">
                                    <span className="text-primary mt-0.5 text-lg">•</span>
                                    <span className="leading-relaxed">{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {pitchingInsights.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">Pitching</h3>
                        <ul className="space-y-3">
                            {pitchingInsights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-3 text-base text-foreground">
                                    <span className="text-secondary mt-0.5 text-lg">•</span>
                                    <span className="leading-relaxed">{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
