import React, { useMemo } from 'react';
import { PitchSession, PitchRecord, PitchTypeModel, Player } from '../types';
import {
    calculateStrikePercentage,
    calculateCompetitiveStrikePercentage,
    calculateTargetHitPercentage,
    calculateFirstPitchStrikePercentage,
    groupPitchesByType,
    groupPitchesByTarget,
    groupPitchesByCount,
} from '../utils/pitchingHelpers';
import { PitchCommandRadar } from './PitchCommandRadar';
import { PitchingPerformanceChart } from './PitchingPerformanceChart';
import { PitchingRecommendation } from './PitchingRecommendation';
import { PitchingZoneHeatmap } from './PitchingZoneHeatmap';
import { PitchRestCard } from './PitchRestCard';
import { getZoneDescription } from '../utils/zoneDescriptions';

interface PitchingAnalyticsProps {
    pitchSessions: PitchSession[];
    pitchRecords: PitchRecord[];
    pitchTypes: PitchTypeModel[];
    player: Player;
}

const KPICard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
);

export const PitchingAnalytics: React.FC<PitchingAnalyticsProps> = ({
    pitchSessions,
    pitchRecords,
    pitchTypes,
    player
}) => {
    const analytics = useMemo(() => {
        // Summary KPIs
        const strikePct = calculateStrikePercentage(pitchRecords);
        const competitiveStrikePct = calculateCompetitiveStrikePercentage(pitchRecords);
        const targetHitPct = calculateTargetHitPercentage(pitchRecords);
        const firstPitchStrikePct = calculateFirstPitchStrikePercentage(pitchRecords);

        // Performance breakdowns
        const byPitchType = groupPitchesByType(pitchRecords, pitchTypes);
        const byTarget = groupPitchesByTarget(pitchRecords);
        const byCount = groupPitchesByCount(pitchRecords);

        return {
            kpi: { strikePct, competitiveStrikePct, targetHitPct, firstPitchStrikePct },
            byPitchType,
            byTarget,
            byCount,
        };
    }, [pitchRecords, pitchTypes]);

    return (
        <div className="space-y-8">
            {/* Pitching Rest Status Card */}
            <PitchRestCard playerId={player.id} />

            {/* Summary Cards Row */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Pitching Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Strike Percentage"
                        value={`${analytics.kpi.strikePct}%`}
                        description="How often you throw strikes (Good pitchers: 60%+)"
                    />
                    <KPICard
                        title="Quality Pitch %"
                        value={`${analytics.kpi.competitiveStrikePct}%`}
                        description="Strikes + pitches close enough to make batters swing"
                    />
                    <KPICard
                        title="Command Score"
                        value={`${analytics.kpi.targetHitPct}%`}
                        description="How often you hit where you're aiming (Higher = Better control)"
                    />
                    <KPICard
                        title="First Pitch Strike %"
                        value={`${analytics.kpi.firstPitchStrikePct}%`}
                        description="Throwing strike on first pitch (Goal: 60%+)"
                    />
                </div>
            </div>

            {/* Skill Snapshot Row */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Pitch Command</h2>
                <div className="max-w-2xl mx-auto">
                    <PitchCommandRadar pitchRecords={pitchRecords} pitchTypes={pitchTypes} playerName={player.name} />
                </div>
            </div>

            {/* Performance Over Time */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Performance Trends</h2>
                <PitchingPerformanceChart pitchSessions={pitchSessions} />
            </div>

            {/* Performance Breakdowns Row */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Your Pitching Stats</h2>

                {/* Zone Heat Map */}
                <div className="mb-6">
                    <PitchingZoneHeatmap pitchRecords={pitchRecords} pitchTypes={pitchTypes} />
                </div>

                {/* By Pitch Type */}
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-bold text-primary mb-4">How Each Pitch is Working</h3>
                    {analytics.byPitchType.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Pitch</th>
                                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Thrown</th>
                                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Strike %</th>
                                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Quality %</th>
                                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">On Target %</th>
                                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Control Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.byPitchType.map(pitch => (
                                        <tr key={pitch.pitchTypeId} className="border-b border-border/50">
                                            <td className="py-2 px-3 font-semibold text-foreground">{pitch.pitchTypeName}</td>
                                            <td className="text-center py-2 px-3 text-muted-foreground">{pitch.count}</td>
                                            <td className="text-center py-2 px-3">{pitch.strikePct}%</td>
                                            <td className="text-center py-2 px-3">{pitch.competitiveStrikePct}%</td>
                                            <td className="text-center py-2 px-3">{pitch.targetHitPct}%</td>
                                            <td className="text-center py-2 px-3">
                                                <span className={`font-bold ${pitch.commandRating >= 70 ? 'text-secondary' : pitch.commandRating >= 50 ? 'text-primary' : 'text-destructive'}`}>
                                                    {pitch.commandRating}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No pitch data available.</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* By Target */}
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-4">Where You're Throwing</h3>
                        {analytics.byTarget.length > 0 ? (
                            <div className="space-y-3">
                                {analytics.byTarget.map(target => (
                                    <div key={target.targetZone} className="flex items-center justify-between p-2 rounded border border-border/50">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">{target.targetZone}</span>
                                                {target.isBest && <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded">Best</span>}
                                                {target.isWorst && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">Work On This</span>}
                                            </div>
                                            <span className="text-xs text-muted-foreground italic">{getZoneDescription(target.targetZone)}</span>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="text-muted-foreground">{target.attempts} pitches</div>
                                            <div className="font-semibold">{target.targetHitPct}% hit rate</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No target data available.</p>
                        )}
                    </div>

                    {/* By Count */}
                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-4">Different Count Situations</h3>
                        {analytics.byCount.length > 0 ? (
                            <div className="space-y-3">
                                {analytics.byCount.map(count => (
                                    <div key={count.countLabel} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground">{count.countLabel}</span>
                                            <span className="text-sm text-muted-foreground">{count.attempts} pitches</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-background rounded-full h-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full"
                                                    style={{ width: `${count.strikePct}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold text-primary w-12 text-right">{count.strikePct}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No count data available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendation Card */}
            <PitchingRecommendation
                pitchSessions={pitchSessions}
                pitchRecords={pitchRecords}
                pitchTypes={pitchTypes}
            />
        </div>
    );
};
