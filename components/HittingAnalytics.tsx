import React, { useMemo } from 'react';
import { Session, Drill, Player } from '../types';
import {
    calculateExecutionPercentage,
    calculateHardHitPercentage,
    calculateContactPercentage,
    calculate2StrikeBattlePercentage,
    groupSetsByDrill,
    groupSetsByPitch,
    groupSetsByCount,
    groupSetsByZone,
} from '../utils/helpers';
import { AnalyticsCharts } from './AnalyticsCharts';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { HittingRecommendation } from './HittingRecommendation';

interface HittingAnalyticsProps {
    sessions: Session[];
    drills: Drill[];
    player: Player;
}

const KPICard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
);

export const HittingAnalytics: React.FC<HittingAnalyticsProps> = ({ sessions, drills, player }) => {
    const analytics = useMemo(() => {
        const allSets = sessions.flatMap(s => s.sets);

        // Summary KPIs
        const execPct = calculateExecutionPercentage(allSets);
        const hardHitPct = calculateHardHitPercentage(allSets);
        const contactPct = calculateContactPercentage(allSets);
        const twoStrikePct = calculate2StrikeBattlePercentage(allSets);

        // Performance over time
        const performanceOverTimeData = sessions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-10) // Last 10 sessions
            .map(session => {
                const date = new Date(session.date);
                return {
                    name: `${date.getMonth() + 1}/${date.getDate()}`,
                    'Execution %': calculateExecutionPercentage(session.sets),
                    'Hard Hit %': calculateHardHitPercentage(session.sets),
                    'Total Reps': session.sets.reduce((sum, set) => sum + set.repsAttempted, 0),
                };
            });

        // Drill success (for second chart)
        const byDrill = groupSetsByDrill(sessions, drills);
        const drillSuccessData = byDrill.map(d => ({
            name: d.name,
            'Success Rate': d.execution,
        }));

        // Performance breakdowns
        const byZoneData = groupSetsByZone(sessions);
        const byDrillTypeData = groupSetsByDrill(sessions, drills);
        const byPitchTypeData = groupSetsByPitch(sessions);
        const byCountData = groupSetsByCount(sessions);

        return {
            kpi: { execPct, hardHitPct, contactPct, twoStrikePct },
            performanceOverTimeData,
            drillSuccessData,
            byZoneData,
            byDrillTypeData,
            byPitchTypeData,
            byCountData,
        };
    }, [sessions, drills]);

    return (
        <div className="space-y-8">
            {/* Summary Cards Row */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Hitting Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Overall Execution %"
                        value={`${analytics.kpi.execPct}%`}
                        description="Successfully executed reps vs. total"
                    />
                    <KPICard
                        title="Hard-Hit %"
                        value={`${analytics.kpi.hardHitPct}%`}
                        description="Percentage of reps hit hard"
                    />
                    <KPICard
                        title="Contact %"
                        value={`${analytics.kpi.contactPct}%`}
                        description="Reps without a strikeout"
                    />
                    <KPICard
                        title="2-Strike Battle %"
                        value={`${analytics.kpi.twoStrikePct}%`}
                        description="Execution when behind in the count"
                    />
                </div>
            </div>



            {/* Performance Over Time - Full Width */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Performance Trends</h2>
                <AnalyticsCharts
                    performanceOverTimeData={analytics.performanceOverTimeData}
                    drillSuccessData={analytics.drillSuccessData}
                />
            </div>
            {/* Performance Breakdowns Row */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Performance Breakdowns</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Zone Heat Map */}
                    <div className="lg:col-span-1">
                        <StrikeZoneHeatmap data={analytics.byZoneData} battingSide={player.profile.bats} />
                    </div>

                    {/* Breakdowns */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-primary mb-4">By Drill Type</h3>
                            <div className="space-y-4">
                                {analytics.byDrillTypeData.length > 0 ? (
                                    analytics.byDrillTypeData.map(d => (
                                        <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} />
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">No data available.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-primary mb-4">By Pitch Type</h3>
                            <div className="space-y-4">
                                {analytics.byPitchTypeData.length > 0 ? (
                                    analytics.byPitchTypeData.map(d => (
                                        <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-accent" />
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">Log pitch types to see this breakdown.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm md:col-span-2">
                            <h3 className="text-lg font-bold text-primary mb-4">By Count</h3>
                            <div className="space-y-4">
                                {analytics.byCountData.length > 0 ? (
                                    analytics.byCountData.map(d => (
                                        <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-secondary" />
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">No data available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendation Card */}
            <HittingRecommendation sessions={sessions} drills={drills} />
        </div>
    );
};
