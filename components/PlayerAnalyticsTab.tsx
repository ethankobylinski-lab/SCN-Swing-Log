import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Session, PitchSession, Player, Drill, PitchTypeModel, PitchRecord } from '../types';
import { HittingAnalytics } from './HittingAnalytics';
import { DataContext } from '../contexts/DataContext';
import { usePitchingAnalytics } from '../hooks/usePitchingAnalytics';
import { AnalyticsCharts } from './AnalyticsCharts';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';

interface PlayerAnalyticsTabProps {
    sessions: Session[];
    pitchSessions: PitchSession[];
    player: Player;
    drills: Drill[];
}

type AnalyticsMode = 'hitting' | 'pitching';

const ANALYTICS_MODE_KEY = 'player-analytics-mode';

export const PlayerAnalyticsTab: React.FC<PlayerAnalyticsTabProps> = ({
    sessions,
    pitchSessions,
    player,
    drills
}) => {
    // Load persisted mode from localStorage or default to hitting
    const [mode, setMode] = useState<AnalyticsMode>(() => {
        const saved = localStorage.getItem(ANALYTICS_MODE_KEY);
        return (saved === 'pitching' ? 'pitching' : 'hitting') as AnalyticsMode;
    });

    // Persist mode to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(ANALYTICS_MODE_KEY, mode);
    }, [mode]);

    const pitchingAnalyticsData = usePitchingAnalytics(pitchSessions, [player]);

    return (
        <div className="space-y-6">
            {/* Segmented Control */}
            <div className="flex justify-center">
                <div className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/30">
                    <button
                        type="button"
                        onClick={() => setMode('hitting')}
                        className={`px-6 py-3 text-sm font-semibold transition-all ${mode === 'hitting'
                            ? 'bg-secondary text-secondary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                    >
                        Hitting
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('pitching')}
                        className={`px-6 py-3 text-sm font-semibold transition-all ${mode === 'pitching'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                    >
                        Pitching
                    </button>
                </div>
            </div>

            {/* Content */}
            {mode === 'hitting' ? (
                <HittingAnalytics sessions={sessions} drills={drills} player={player} />
            ) : (
                pitchingAnalyticsData ? (
                    <div className="space-y-8">
                        <AnalyticsCharts
                            performanceOverTimeData={pitchingAnalyticsData.performanceOverTimeData}
                            drillSuccessData={[]} // Not applicable for pitching yet
                            performanceMetricKey="Strike %"
                            performanceMetricLabel="Strike %"
                            volumeMetricKey="Total Pitches"
                            volumeMetricLabel="Total Pitches"
                        />

                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Pitching Breakdowns</h2>
                            <p className="text-sm text-muted-foreground mb-4">Detailed breakdown of your pitching performance.</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                                <div className="lg:col-span-1">
                                    <StrikeZoneHeatmap data={pitchingAnalyticsData.pitchingBreakdowns.byZone.map(z => ({ ...z, execution: z.strikePct, reps: z.pitches }))} />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Pitch Type</h3>
                                        <div className="space-y-4">
                                            {pitchingAnalyticsData.pitchingBreakdowns.byPitchType.length > 0 ? pitchingAnalyticsData.pitchingBreakdowns.byPitchType.map(d => (
                                                <BreakdownBar key={d.name} label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-accent" />
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Count</h3>
                                        <div className="space-y-4">
                                            {pitchingAnalyticsData.pitchingBreakdowns.byCount.length > 0 ? pitchingAnalyticsData.pitchingBreakdowns.byCount.map(d => (
                                                <BreakdownBar key={d.name} label={d.name} reps={d.pitches} percentage={d.strikePct} colorClass="bg-secondary" />
                                            )) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-lg font-semibold mb-2">No Pitching Data Yet</p>
                        <p>Log pitching sessions to see your analytics and insights!</p>
                    </div>
                )
            )}
        </div>
    );
};
