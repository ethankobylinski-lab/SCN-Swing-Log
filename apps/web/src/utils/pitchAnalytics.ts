import {
    PitchRecord,
    PitchSessionAnalytics,
    PitchTypeMetrics,
    MissPattern,
    SituationalMetrics,
    TrendMetrics,
    ZoneId,
    PitchTypeModel,
    ZoneHeatmapData
} from '../types';

/**
 * Calculate euclidean distance between two normalized points (0-1)
 */
function calcDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Calculate proximity score (0-1) where 1 is perfect, 0 is max distance
 * maxDistance is approximately 1.414 (corner to corner of normalized canvas)
 */
function calcProximityScore(distance: number): number {
    const maxDistance = Math.sqrt(2); // diagonal of 1x1 square
    return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Determine if outcome is a strike
 */
function isStrike(outcome: string): boolean {
    return ['called_strike', 'swinging_strike', 'foul'].includes(outcome);
}

/**
 * Calculate miss direction based on target vs actual normalized coordinates
 */
function getMissDirection(
    targetX: number,
    targetY: number,
    actualX: number,
    actualY: number
): 'up' | 'down' | 'arm' | 'glove' | null {
    const dx = actualX - targetX;
    const dy = actualY - targetY;

    const threshold = 0.05; // minimum distance to count as a miss
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return null; // too close to call a miss
    }

    // Determine primary direction
    if (Math.abs(dy) > Math.abs(dx)) {
        return dy > 0 ? 'up' : 'down';
    } else {
        return dx > 0 ? 'arm' : 'glove'; // arm side = right, glove = left (catcher view)
    }
}

/**
 * Calculate comprehensive analytics for a pitch session
 */
export function calculatePitchSessionAnalytics(
    pitches: PitchRecord[],
    pitchTypes: PitchTypeModel[]
): PitchSessionAnalytics {
    if (pitches.length === 0) {
        return getEmptyAnalytics();
    }

    // Core metrics
    const strikes = pitches.filter(p => isStrike(p.outcome)).length;
    const strikePct = Math.round((strikes / pitches.length) * 100);

    // Accuracy metrics
    let perfectHits = 0;
    let totalProximity = 0;
    let totalDistance = 0;

    pitches.forEach(pitch => {
        // Check if hit intended zone exactly
        if (pitch.actualZone === pitch.targetZone) {
            perfectHits++;
        }

        // Calculate proximity
        if (
            pitch.targetXNorm !== undefined &&
            pitch.targetYNorm !== undefined &&
            pitch.actualXNorm !== undefined &&
            pitch.actualYNorm !== undefined
        ) {
            const distance = calcDistance(
                pitch.targetXNorm,
                pitch.targetYNorm,
                pitch.actualXNorm,
                pitch.actualYNorm
            );
            totalDistance += distance;
            totalProximity += calcProximityScore(distance);
        }
    });

    const accuracyHitRate = Math.round((perfectHits / pitches.length) * 100);
    const accuracyProximityAvg = parseFloat((totalProximity / pitches.length).toFixed(2));

    // Per pitch type metrics
    const pitchTypeMetrics = calculatePitchTypeMetrics(pitches, pitchTypes);

    // Miss patterns
    const missPattern = calculateMissPattern(pitches);

    // Situational metrics
    const situational = calculateSituationalMetrics(pitches);

    // Trend metrics
    const trend = calculateTrendMetrics(pitches);

    // Composite command score (0-100)
    const commandScore = calculateCommandScore({
        strikePct,
        accuracyProximityAvg,
        avgMissDistance: missPattern.avgMissDistance
    });

    // Generate insights
    const insights = generateInsights({
        pitches,
        pitchTypeMetrics,
        missPattern,
        situational,
        trend,
        strikePct,
        accuracyHitRate
    });

    return {
        strikePct,
        accuracyHitRate,
        accuracyProximityAvg,
        pitchTypeMetrics,
        missPattern,
        situational,
        trend,
        commandScore,
        insights
    };
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number | undefined {
    if (values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
    }
    return parseFloat(sorted[mid].toFixed(1));
}

/**
 * Calculate metrics per pitch type
 */
function calculatePitchTypeMetrics(
    pitches: PitchRecord[],
    pitchTypes: PitchTypeModel[]
): PitchTypeMetrics[] {
    const metricsMap = new Map<string, {
        count: number;
        strikes: number;
        perfectHits: number;
        totalProximity: number;
        totalMissInches: number;
        missInchesCount: number;
        missDistances: number[]; // store all individual distances for median/max
    }>();

    // Initialize for all pitch types used
    pitches.forEach(pitch => {
        if (!metricsMap.has(pitch.pitchTypeId)) {
            metricsMap.set(pitch.pitchTypeId, {
                count: 0,
                strikes: 0,
                perfectHits: 0,
                totalProximity: 0,
                totalMissInches: 0,
                missInchesCount: 0,
                missDistances: []
            });
        }

        const metrics = metricsMap.get(pitch.pitchTypeId)!;
        metrics.count++;

        if (isStrike(pitch.outcome)) {
            metrics.strikes++;
        }

        if (pitch.actualZone === pitch.targetZone) {
            metrics.perfectHits++;
        }

        if (
            pitch.targetXNorm !== undefined &&
            pitch.targetYNorm !== undefined &&
            pitch.actualXNorm !== undefined &&
            pitch.actualYNorm !== undefined
        ) {
            const distance = calcDistance(
                pitch.targetXNorm,
                pitch.targetYNorm,
                pitch.actualXNorm,
                pitch.actualYNorm
            );
            metrics.totalProximity += calcProximityScore(distance);
        }

        if (pitch.missDistanceInches !== undefined) {
            metrics.totalMissInches += pitch.missDistanceInches;
            metrics.missInchesCount++;
            metrics.missDistances.push(pitch.missDistanceInches);
        }
    });

    // Convert to array
    const result: PitchTypeMetrics[] = [];
    metricsMap.forEach((metrics, pitchTypeId) => {
        const pitchType = pitchTypes.find(pt => pt.id === pitchTypeId);
        result.push({
            pitchTypeId,
            pitchTypeName: pitchType?.name || 'Unknown',
            count: metrics.count,
            strikePct: Math.round((metrics.strikes / metrics.count) * 100),
            accuracyHitRate: Math.round((metrics.perfectHits / metrics.count) * 100),
            accuracyProximityAvg: parseFloat((metrics.totalProximity / metrics.count).toFixed(2)),
            accuracyInchesAvg: metrics.missInchesCount > 0
                ? parseFloat((metrics.totalMissInches / metrics.missInchesCount).toFixed(1))
                : undefined,
            accuracyInchesMedian: calculateMedian(metrics.missDistances),
            accuracyInchesMax: metrics.missDistances.length > 0
                ? parseFloat(Math.max(...metrics.missDistances).toFixed(1))
                : undefined
        });
    });

    return result.sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Calculate miss pattern metrics
 */
function calculateMissPattern(pitches: PitchRecord[]): MissPattern {
    let missUp = 0;
    let missDown = 0;
    let missArm = 0;
    let missGlove = 0;
    let totalMissDistance = 0;
    let missCount = 0;

    pitches.forEach(pitch => {
        if (
            pitch.targetXNorm !== undefined &&
            pitch.targetYNorm !== undefined &&
            pitch.actualXNorm !== undefined &&
            pitch.actualYNorm !== undefined
        ) {
            const direction = getMissDirection(
                pitch.targetXNorm,
                pitch.targetYNorm,
                pitch.actualXNorm,
                pitch.actualYNorm
            );

            if (direction) {
                missCount++;
                const distance = calcDistance(
                    pitch.targetXNorm,
                    pitch.targetYNorm,
                    pitch.actualXNorm,
                    pitch.actualYNorm
                );
                totalMissDistance += distance;

                switch (direction) {
                    case 'up': missUp++; break;
                    case 'down': missDown++; break;
                    case 'arm': missArm++; break;
                    case 'glove': missGlove++; break;
                }
            }
        }
    });

    const total = missCount || 1; // avoid division by zero
    return {
        missUpPct: Math.round((missUp / total) * 100),
        missDownPct: Math.round((missDown / total) * 100),
        missArmSidePct: Math.round((missArm / total) * 100),
        missGloveSidePct: Math.round((missGlove / total) * 100),
        avgMissDistance: parseFloat((totalMissDistance / total).toFixed(3))
    };
}

/**
 * Calculate situational metrics
 */
function calculateSituationalMetrics(pitches: PitchRecord[]): SituationalMetrics {
    // First pitch (0-0 count)
    const firstPitches = pitches.filter(p => p.ballsBefore === 0 && p.strikesBefore === 0);
    const firstPitchStrikes = firstPitches.filter(p => isStrike(p.outcome)).length;
    const firstPitchStrikePct = firstPitches.length > 0
        ? Math.round((firstPitchStrikes / firstPitches.length) * 100)
        : 0;

    // Behind in count (more balls than strikes)
    const behindPitches = pitches.filter(p => p.ballsBefore > p.strikesBefore);
    const behindStrikes = behindPitches.filter(p => isStrike(p.outcome)).length;
    const behindInCountStrikePct = behindPitches.length > 0
        ? Math.round((behindStrikes / behindPitches.length) * 100)
        : 0;

    // Behind count accuracy
    let behindPerfectHits = 0;
    behindPitches.forEach(p => {
        if (p.actualZone === p.targetZone) {
            behindPerfectHits++;
        }
    });
    const behindInCountAccuracy = behindPitches.length > 0
        ? Math.round((behindPerfectHits / behindPitches.length) * 100)
        : 0;

    return {
        firstPitchStrikePct,
        behindInCountStrikePct,
        behindInCountAccuracy
    };
}

/**
 * Calculate trend metrics (early vs late session)
 */
function calculateTrendMetrics(pitches: PitchRecord[]): TrendMetrics {
    const earlyPitches = pitches.slice(0, Math.min(10, pitches.length));
    const latePitches = pitches.slice(Math.max(0, pitches.length - 10));

    const calcAvgProximity = (subset: PitchRecord[]) => {
        let totalProximity = 0;
        let count = 0;

        subset.forEach(pitch => {
            if (
                pitch.targetXNorm !== undefined &&
                pitch.targetYNorm !== undefined &&
                pitch.actualXNorm !== undefined &&
                pitch.actualYNorm !== undefined
            ) {
                const distance = calcDistance(
                    pitch.targetXNorm,
                    pitch.targetYNorm,
                    pitch.actualXNorm,
                    pitch.actualYNorm
                );
                totalProximity += calcProximityScore(distance);
                count++;
            }
        });

        return count > 0 ? parseFloat((totalProximity / count).toFixed(2)) : 0;
    };

    return {
        earlyAccuracy: calcAvgProximity(earlyPitches),
        lateAccuracy: calcAvgProximity(latePitches)
    };
}

/**
 * Calculate composite command score (0-100)
 * Weighted formula: 40% strike rate, 40% proximity, 20% miss distance
 */
function calculateCommandScore(params: {
    strikePct: number;
    accuracyProximityAvg: number;
    avgMissDistance: number;
}): number {
    const strikeComponent = (params.strikePct / 100) * 40;
    const proximityComponent = params.accuracyProximityAvg * 40;

    // Miss distance penalty: normalize to 0-1 (lower is better)
    // Typical miss distance is 0-0.5 normalized units
    const missDistanceNormalized = Math.min(1, params.avgMissDistance / 0.5);
    const missComponent = (1 - missDistanceNormalized) * 20;

    const score = strikeComponent + proximityComponent + missComponent;
    return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate auto-coaching insights based on session data
 */
function generateInsights(params: {
    pitches: PitchRecord[];
    pitchTypeMetrics: PitchTypeMetrics[];
    missPattern: MissPattern;
    situational: SituationalMetrics;
    trend: TrendMetrics;
    strikePct: number;
    accuracyHitRate: number;
}): string[] {
    const insights: string[] = [];

    // Best pitch type insight
    if (params.pitchTypeMetrics.length > 1) {
        const bestPitch = [...params.pitchTypeMetrics].sort(
            (a, b) => b.strikePct - a.strikePct
        )[0];
        if (bestPitch.strikePct >= 60) {
            insights.push(`${bestPitch.pitchTypeName} is your most consistent command pitch (${bestPitch.strikePct}% strikes).`);
        }
    }

    // Miss pattern insight
    const maxMiss = Math.max(
        params.missPattern.missUpPct,
        params.missPattern.missDownPct,
        params.missPattern.missArmSidePct,
        params.missPattern.missGloveSidePct
    );

    if (maxMiss > 40) {
        let direction = '';
        if (params.missPattern.missUpPct === maxMiss) direction = 'up';
        else if (params.missPattern.missDownPct === maxMiss) direction = 'down';
        else if (params.missPattern.missArmSidePct === maxMiss) direction = 'arm-side';
        else direction = 'glove-side';

        let coaching = '';
        if (direction === 'arm-side') {
            coaching = 'Indicates early torso rotation or pulling off line.';
        } else if (direction === 'glove-side') {
            coaching = 'Focus on staying through the pitch and finishing toward target.';
        } else if (direction === 'up') {
            coaching = 'Check release point consistency.';
        } else {
            coaching = 'Focus on lower half engagement and finish.';
        }

        insights.push(`Most misses were ${direction} (${maxMiss}%). ${coaching}`);
    }

    // Trend insight
    if (params.pitches.length >= 20) {
        const improvement = params.trend.lateAccuracy - params.trend.earlyAccuracy;
        if (improvement > 0.1) {
            insights.push(`Command improved during the session. Last 10 pitches averaged ${params.trend.lateAccuracy.toFixed(2)} accuracy.`);
        } else if (improvement < -0.1) {
            insights.push(`Command declined in later pitches. Consider managing fatigue and maintaining mechanics.`);
        }
    }

    // Strike rate insight
    if (params.strikePct >= 70) {
        insights.push('Excellent strike rate! Consistent command foundation.');
    } else if (params.strikePct < 50) {
        insights.push('Focus on commanded strike-throwing in next session. Quality over quantity.');
    }

    // Accuracy insight
    if (params.accuracyHitRate >= 50) {
        insights.push('Great precision hitting intended zones!');
    } else if (params.accuracyHitRate < 30) {
        insights.push('Work on pinpoint accuracy by practicing specific zone targeting.');
    }

    return insights;
}

/**
 * Get empty analytics object
 */
function getEmptyAnalytics(): PitchSessionAnalytics {
    return {
        strikePct: 0,
        accuracyHitRate: 0,
        accuracyProximityAvg: 0,
        pitchTypeMetrics: [],
        missPattern: {
            missUpPct: 0,
            missDownPct: 0,
            missArmSidePct: 0,
            missGloveSidePct: 0,
            avgMissDistance: 0
        },
        situational: {
            firstPitchStrikePct: 0,
            behindInCountStrikePct: 0,
            behindInCountAccuracy: 0
        },
        trend: {
            earlyAccuracy: 0,
            lateAccuracy: 0
        },
        commandScore: 0,
        insights: []
    };
}

/**
 * Calculate zone heatmap data for visualization
 */
export function calculateZoneHeatmap(pitches: PitchRecord[]): ZoneHeatmapData[] {
    const zones: ZoneId[] = [
        'Z11', 'Z12', 'Z13',
        'Z21', 'Z22', 'Z23',
        'Z31', 'Z32', 'Z33',
        'EDGE_HIGH', 'EDGE_LOW', 'EDGE_GLOVE', 'EDGE_ARM'
    ];

    const heatmapData: ZoneHeatmapData[] = zones.map(zone => ({
        zone,
        intendedCount: 0,
        actualCount: 0,
        proximityAvg: 0
    }));

    // Count intended and actual
    pitches.forEach(pitch => {
        const intendedZone = heatmapData.find(z => z.zone === pitch.targetZone);
        const actualZone = heatmapData.find(z => z.zone === pitch.actualZone);

        if (intendedZone) intendedZone.intendedCount++;
        if (actualZone) actualZone.actualCount++;
    });

    // Calculate proximity avg per zone (based on actual zone)
    heatmapData.forEach(zoneData => {
        const pitchesInZone = pitches.filter(p => p.actualZone === zoneData.zone);
        if (pitchesInZone.length > 0) {
            let totalProximity = 0;
            pitchesInZone.forEach(pitch => {
                if (
                    pitch.targetXNorm !== undefined &&
                    pitch.targetYNorm !== undefined &&
                    pitch.actualXNorm !== undefined &&
                    pitch.actualYNorm !== undefined
                ) {
                    const distance = calcDistance(
                        pitch.targetXNorm,
                        pitch.targetYNorm,
                        pitch.actualXNorm,
                        pitch.actualYNorm
                    );
                    totalProximity += calcProximityScore(distance);
                }
            });
            zoneData.proximityAvg = parseFloat((totalProximity / pitchesInZone.length).toFixed(2));
        }
    });

    return heatmapData;
}
