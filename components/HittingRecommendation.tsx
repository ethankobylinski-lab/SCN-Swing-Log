import React, { useMemo } from 'react';
import { Session, Drill } from '../types';
import { BreakdownData, groupSetsByDrill, groupSetsByPitch, groupSetsByZone } from '../utils/helpers';

interface HittingRecommendationProps {
    sessions: Session[];
    drills: Drill[];
}

interface FocusArea {
    type: 'drill' | 'zone' | 'pitch';
    name: string;
    execution: number;
    overallExecution: number;
    gap: number;
    reps: number;
}

const MIN_REPS_THRESHOLD = 20;
const GAP_THRESHOLD = 10;

export const HittingRecommendation: React.FC<HittingRecommendationProps> = ({ sessions, drills }) => {
    const recommendation = useMemo(() => {
        if (sessions.length === 0) {
            return {
                focusAreas: [],
                strengths: [],
                drillSuggestion: 'Log some sessions to get personalized recommendations!',
            };
        }

        // Calculate overall execution
        const allSets = sessions.flatMap(s => s.sets);
        const totalExecuted = allSets.reduce((sum, set) => sum + set.repsExecuted, 0);
        const totalAttempted = allSets.reduce((sum, set) => sum + set.repsAttempted, 0);
        const overallExecution = totalAttempted > 0 ? (totalExecuted / totalAttempted) * 100 : 0;

        const focusAreas: FocusArea[] = [];

        // Check drill types
        const byDrill = groupSetsByDrill(sessions, drills);
        byDrill.forEach(d => {
            if (d.reps >= MIN_REPS_THRESHOLD) {
                const gap = overallExecution - d.execution;
                if (gap >= GAP_THRESHOLD) {
                    focusAreas.push({
                        type: 'drill',
                        name: d.name,
                        execution: d.execution,
                        overallExecution,
                        gap,
                        reps: d.reps,
                    });
                }
            }
        });

        // Check zones
        const byZone = groupSetsByZone(sessions);
        byZone.forEach(z => {
            if (z.reps >= MIN_REPS_THRESHOLD) {
                const gap = overallExecution - z.execution;
                if (gap >= GAP_THRESHOLD) {
                    focusAreas.push({
                        type: 'zone',
                        name: z.zone,
                        execution: z.execution,
                        overallExecution,
                        gap,
                        reps: z.reps,
                    });
                }
            }
        });

        // Check pitch types
        const byPitch = groupSetsByPitch(sessions);
        byPitch.forEach(p => {
            if (p.reps >= MIN_REPS_THRESHOLD) {
                const gap = overallExecution - p.execution;
                if (gap >= GAP_THRESHOLD) {
                    focusAreas.push({
                        type: 'pitch',
                        name: p.name,
                        execution: p.execution,
                        overallExecution,
                        gap,
                        reps: p.reps,
                    });
                }
            }
        });

        // Sort by largest gap
        focusAreas.sort((a, b) => b.gap - a.gap);

        // Generate recommendation text
        let drillSuggestion = '';
        if (focusAreas.length === 0) {
            drillSuggestion = 'Your execution is balanced across all areas. Keep up the consistent work!';
        } else {
            const topFocus = focusAreas[0];
            if (topFocus.type === 'pitch') {
                drillSuggestion = `Focus on ${topFocus.name} execution (${Math.round(topFocus.execution)}% vs ${Math.round(overallExecution)}% overall). Add a 15-rep ${topFocus.name.toLowerCase()} block off the machine to the zone you struggle with most.`;
            } else if (topFocus.type === 'zone') {
                drillSuggestion = `Work on the ${topFocus.name} zone (${Math.round(topFocus.execution)}% vs ${Math.round(overallExecution)}% overall). Do a 20-rep tee block focusing exclusively on driving the ball to that location.`;
            } else {
                drillSuggestion = `${topFocus.name} needs attention (${Math.round(topFocus.execution)}% vs ${Math.round(overallExecution)}% overall). Dedicate 2 extra sets to ${topFocus.name.toLowerCase()} this week.`;
            }
        }

        return { focusAreas: focusAreas.slice(0, 2), strengths: [], drillSuggestion };
    }, [sessions, drills]);

    if (sessions.length === 0) {
        return (
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-3">Today's Hitting Focus</h3>
                <p className="text-sm text-muted-foreground">{recommendation.drillSuggestion}</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/30 p-6 rounded-lg shadow-md">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-secondary text-secondary-foreground rounded-full p-2 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">Today's Hitting Focus</h3>
                    {recommendation.focusAreas.length > 0 && (
                        <div className="space-y-2 mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Areas to improve:</p>
                            {recommendation.focusAreas.map((area, idx) => (
                                <div key={idx} className="text-sm">
                                    <span className="font-semibold text-primary">{area.name}</span>
                                    <span className="text-muted-foreground"> — {Math.round(area.execution)}% execution ({Math.round(area.gap)} pts below overall)</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="bg-card/50 border border-border/50 rounded-md p-3 mt-3">
                        <p className="text-sm font-medium text-foreground leading-relaxed">{recommendation.drillSuggestion}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
