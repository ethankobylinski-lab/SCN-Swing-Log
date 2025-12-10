import React, { useMemo } from 'react';
import { PitchSession, PitchRecord, PitchTypeModel } from '../types';
import {
    groupPitchesByType,
    PitchTypeBreakdown
} from '../utils/pitchingHelpers';

interface PitchingRecommendationProps {
    pitchSessions: PitchSession[];
    pitchRecords: PitchRecord[];
    pitchTypes: PitchTypeModel[];
}

const MIN_PITCHES_THRESHOLD = 20;
const COMMAND_GAP_THRESHOLD = 15;

export const PitchingRecommendation: React.FC<PitchingRecommendationProps> = ({
    pitchSessions,
    pitchRecords,
    pitchTypes
}) => {
    const recommendation = useMemo(() => {
        if (pitchRecords.length === 0) {
            return {
                weakestPitch: null,
                strongestPitch: null,
                suggestion: 'Log some pitching sessions to get personalized coaching insights!',
            };
        }

        const byType = groupPitchesByType(pitchRecords, pitchTypes);

        // Filter to pitches with enough reps
        const qualifiedPitches = byType.filter(p => p.count >= MIN_PITCHES_THRESHOLD);

        if (qualifiedPitches.length === 0) {
            return {
                weakestPitch: null,
                strongestPitch: null,
                suggestion: 'Keep building reps. You need at least 20 pitches per type for meaningful insights.',
            };
        }

        // Find best and worst by command rating
        const sorted = [...qualifiedPitches].sort((a, b) => b.commandRating - a.commandRating);
        const strongest = sorted[0];
        const weakest = sorted[sorted.length - 1];

        const commandGap = strongest.commandRating - weakest.commandRating;

        let suggestion = '';
        if (commandGap >= COMMAND_GAP_THRESHOLD && weakest.count >= MIN_PITCHES_THRESHOLD) {
            suggestion = `Your ${weakest.pitchTypeName.toLowerCase()} needs work (Command ${weakest.commandRating} vs ${strongest.pitchTypeName} ${strongest.commandRating}). Do a 15-pitch ${weakest.pitchTypeName.toLowerCase()} block to your best target zone, focusing on finishing over your front leg.`;
        } else {
            suggestion = `Your command is balanced across all pitches. Trust your ${strongest.pitchTypeName.toLowerCase()} in tight counts (${strongest.targetHitPct}% hit rate). Keep all pitches sharp with mixed blocks.`;
        }

        return {
            weakestPitch: commandGap >= COMMAND_GAP_THRESHOLD ? weakest : null,
            strongestPitch: strongest,
            suggestion,
        };
    }, [pitchRecords, pitchTypes]);

    if (pitchRecords.length === 0) {
        return (
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-3">Today's Pitching Focus</h3>
                <p className="text-sm text-muted-foreground">{recommendation.suggestion}</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 p-6 rounded-lg shadow-md">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-primary text-primary-foreground rounded-full p-2 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">Today's Pitching Focus</h3>
                    <div className="space-y-2 mb-3">
                        {recommendation.weakestPitch && (
                            <div className="text-sm">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Work on:</span>
                                <span className="font-semibold text-destructive">{recommendation.weakestPitch.pitchTypeName}</span>
                                <span className="text-muted-foreground"> — Command {recommendation.weakestPitch.commandRating}/100</span>
                            </div>
                        )}
                        {recommendation.strongestPitch && (
                            <div className="text-sm">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Trust this:</span>
                                <span className="font-semibold text-secondary">{recommendation.strongestPitch.pitchTypeName}</span>
                                <span className="text-muted-foreground"> — Command {recommendation.strongestPitch.commandRating}/100, {recommendation.strongestPitch.targetHitPct}% hit rate</span>
                            </div>
                        )}
                    </div>
                    <div className="bg-card/50 border border-border/50 rounded-md p-3 mt-3">
                        <p className="text-sm font-medium text-foreground leading-relaxed">{recommendation.suggestion}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
