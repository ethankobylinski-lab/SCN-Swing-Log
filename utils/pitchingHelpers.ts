import { PitchRecord, PitchTypeModel, ZoneId, PitchSession } from '../types';

export interface PitchTypeBreakdown {
    pitchTypeId: string;
    pitchTypeName: string;
    count: number;
    strikePct: number;
    competitiveStrikePct: number;
    targetHitPct: number;
    avgMissDistance: number;
    commandRating: number;
}

export interface TargetBreakdown {
    targetZone: ZoneId;
    attempts: number;
    strikePct: number;
    targetHitPct: number;
    isBest?: boolean;
    isWorst?: boolean;
}

export interface CountBreakdown {
    countLabel: string;
    balls: number;
    strikes: number;
    attempts: number;
    strikePct: number;
    competitiveStrikePct: number;
}

// Helper to check if a zone is on the edge of the strike zone
const isEdgeZone = (zone: ZoneId): boolean => {
    return zone.startsWith('EDGE_') ||
        ['Z11', 'Z13', 'Z31', 'Z33'].includes(zone);
};

// Helper to check if a zone is in the strike zone
const isStrikeZone = (zone: ZoneId): boolean => {
    return zone.startsWith('Z');
};

// Calculate overall strike percentage
export const calculateStrikePercentage = (pitchRecords: PitchRecord[]): number => {
    if (pitchRecords.length === 0) return 0;
    const strikes = pitchRecords.filter(p =>
        p.outcome === 'called_strike' ||
        p.outcome === 'swinging_strike' ||
        p.outcome === 'foul' ||
        isStrikeZone(p.actualZone)
    ).length;
    return Math.round((strikes / pitchRecords.length) * 100);
};

// Calculate competitive strike percentage (strikes + edge-zone near-misses)
export const calculateCompetitiveStrikePercentage = (pitchRecords: PitchRecord[]): number => {
    if (pitchRecords.length === 0) return 0;
    const competitive = pitchRecords.filter(p => {
        const isStrike = p.outcome === 'called_strike' ||
            p.outcome === 'swinging_strike' ||
            p.outcome === 'foul' ||
            isStrikeZone(p.actualZone);
        const isCompetitive = isEdgeZone(p.actualZone);
        return isStrike || isCompetitive;
    }).length;
    return Math.round((competitive / pitchRecords.length) * 100);
};

// Calculate target hit percentage (pitches landing in intended zone)
export const calculateTargetHitPercentage = (pitchRecords: PitchRecord[]): number => {
    if (pitchRecords.length === 0) return 0;
    const hits = pitchRecords.filter(p => p.targetZone === p.actualZone).length;
    return Math.round((hits / pitchRecords.length) * 100);
};

// Calculate first pitch strike percentage (0-0 counts)
export const calculateFirstPitchStrikePercentage = (pitchRecords: PitchRecord[]): number => {
    const firstPitches = pitchRecords.filter(p => p.ballsBefore === 0 && p.strikesBefore === 0);
    if (firstPitches.length === 0) return 0;
    const strikes = firstPitches.filter(p =>
        p.outcome === 'called_strike' ||
        p.outcome === 'swinging_strike' ||
        p.outcome === 'foul' ||
        isStrikeZone(p.actualZone)
    ).length;
    return Math.round((strikes / firstPitches.length) * 100);
};

// Calculate average miss distance (simplified - using zone difference as proxy)
const calculateAvgMissDistance = (pitchRecords: PitchRecord[]): number => {
    if (pitchRecords.length === 0) return 0;
    // For now, return percentage of pitches that missed their target
    const misses = pitchRecords.filter(p => p.targetZone !== p.actualZone).length;
    return Math.round((misses / pitchRecords.length) * 100);
};

// Calculate command rating using specified formula
export const calculateCommandRating = (
    targetHitPct: number,
    competitiveStrikePct: number,
    strikePct: number,
    middleMiddlePct: number
): number => {
    // Formula: 0.4*TargetHit + 0.3*CompetitiveStrike + 0.2*Strike - penalty(middle-middle misses)
    const baseScore = (0.4 * targetHitPct) + (0.3 * competitiveStrikePct) + (0.2 * strikePct);
    const penalty = middleMiddlePct * 0.5; // Penalize middle-middle location
    return Math.max(0, Math.min(100, Math.round(baseScore - penalty)));
};

// Group pitches by type with full metrics
export const groupPitchesByType = (
    pitchRecords: PitchRecord[],
    pitchTypes: PitchTypeModel[]
): PitchTypeBreakdown[] => {
    const grouped = pitchRecords.reduce((acc, pitch) => {
        if (!acc[pitch.pitchTypeId]) {
            acc[pitch.pitchTypeId] = [];
        }
        acc[pitch.pitchTypeId].push(pitch);
        return acc;
    }, {} as Record<string, PitchRecord[]>);

    return Object.entries(grouped).map(([pitchTypeId, pitches]) => {
        const pitchType = pitchTypes.find(pt => pt.id === pitchTypeId);
        const strikePct = calculateStrikePercentage(pitches);
        const competitiveStrikePct = calculateCompetitiveStrikePercentage(pitches);
        const targetHitPct = calculateTargetHitPercentage(pitches);
        const avgMissDistance = calculateAvgMissDistance(pitches);

        // Calculate middle-middle percentage for penalty
        const middleMiddle = pitches.filter(p => p.actualZone === 'Z22').length;
        const middleMiddlePct = pitches.length > 0 ? (middleMiddle / pitches.length) * 100 : 0;

        const commandRating = calculateCommandRating(
            targetHitPct,
            competitiveStrikePct,
            strikePct,
            middleMiddlePct
        );

        return {
            pitchTypeId,
            pitchTypeName: pitchType?.name || 'Unknown',
            count: pitches.length,
            strikePct,
            competitiveStrikePct,
            targetHitPct,
            avgMissDistance,
            commandRating,
        };
    });
};

// Group pitches by target zone
export const groupPitchesByTarget = (pitchRecords: PitchRecord[]): TargetBreakdown[] => {
    const grouped = pitchRecords.reduce((acc, pitch) => {
        if (!acc[pitch.targetZone]) {
            acc[pitch.targetZone] = [];
        }
        acc[pitch.targetZone].push(pitch);
        return acc;
    }, {} as Record<ZoneId, PitchRecord[]>);

    const breakdowns: TargetBreakdown[] = Object.entries(grouped).map(([targetZone, pitches]) => ({
        targetZone: targetZone as ZoneId,
        attempts: pitches.length,
        strikePct: calculateStrikePercentage(pitches),
        targetHitPct: calculateTargetHitPercentage(pitches),
    }));

    // Find best and worst targets
    if (breakdowns.length > 1) {
        const sorted = [...breakdowns].sort((a, b) => b.targetHitPct - a.targetHitPct);
        const best = breakdowns.find(b => b.targetZone === sorted[0].targetZone);
        const worst = breakdowns.find(b => b.targetZone === sorted[sorted.length - 1].targetZone);
        if (best) best.isBest = true;
        if (worst) worst.isWorst = true;
    }

    return breakdowns;
};

// Group pitches by count
export const groupPitchesByCount = (pitchRecords: PitchRecord[]): CountBreakdown[] => {
    const grouped = pitchRecords.reduce((acc, pitch) => {
        const key = `${pitch.ballsBefore}-${pitch.strikesBefore}`;
        if (!acc[key]) {
            acc[key] = {
                balls: pitch.ballsBefore,
                strikes: pitch.strikesBefore,
                pitches: [],
            };
        }
        acc[key].pitches.push(pitch);
        return acc;
    }, {} as Record<string, { balls: number; strikes: number; pitches: PitchRecord[] }>);

    return Object.values(grouped)
        .map(({ balls, strikes, pitches }) => ({
            countLabel: `${balls}-${strikes}`,
            balls,
            strikes,
            attempts: pitches.length,
            strikePct: calculateStrikePercentage(pitches),
            competitiveStrikePct: calculateCompetitiveStrikePercentage(pitches),
        }))
        .sort((a, b) => {
            // Sort by balls then strikes
            if (a.balls !== b.balls) return a.balls - b.balls;
            return a.strikes - b.strikes;
        });
};

// Get pitching sessions performance over time
export const getPitchingPerformanceOverTime = (pitchSessions: PitchSession[]): {
    name: string;
    strikePct: number;
    competitiveStrikePct: number;
    targetHitPct: number;
    avgMissDistance: number;
}[] => {
    return pitchSessions
        .sort((a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime())
        .slice(-10) // Last 10 sessions
        .map(session => {
            const date = new Date(session.sessionStartTime);
            const name = `${date.getMonth() + 1}/${date.getDate()}`;
            const analytics = session.analytics;

            return {
                name,
                strikePct: analytics?.strikePct || 0,
                competitiveStrikePct: 0, // Will compute from pitch records if needed
                targetHitPct: analytics?.accuracyHitRate || 0,
                avgMissDistance: 100 - (analytics?.accuracyProximityAvg || 0) * 100,
            };
        });
};
