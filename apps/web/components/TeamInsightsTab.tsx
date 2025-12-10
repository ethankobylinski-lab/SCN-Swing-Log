import React, { useMemo } from 'react';
import { Player, Session, PitchSession, TeamGoal, Drill } from '../types';
import { TeamGoalProgressCard } from './TeamGoalProgressCard';
import { TeamConsistencyTracker } from './TeamConsistencyTracker';
import { QualityQuantityMatrix } from './QualityQuantityMatrix';
import { DrillBreakdownChart } from './DrillBreakdownChart';
import { IntegrityAlerts } from './IntegrityAlerts';
import { TeamTrendChart } from './TeamTrendChart';
import { EngagementHeatmap } from './EngagementHeatmap';
import {
    calculateTeamGoalProgress,
    getConsistencyData,
    categorizePlayersByQuadrant,
    analyzeDrillBreakdown,
    detectIntegrityIssues,
    calculateWeeklyTrends
} from '../utils/teamInsights';

interface TeamInsightsTabProps {
    players: Player[];
    sessions: Session[];
    pitchSessions: PitchSession[];
    drills: Drill[];
    teamGoals: TeamGoal[];
}

export const TeamInsightsTab: React.FC<TeamInsightsTabProps> = ({
    players,
    sessions,
    pitchSessions,
    drills,
    teamGoals
}) => {
    // Memoized calculations for performance
    const goalProgress = useMemo(() =>
        teamGoals.map(goal => calculateTeamGoalProgress(goal, sessions, players)),
        [teamGoals, sessions, players]
    );

    const consistencyData = useMemo(() =>
        getConsistencyData(sessions, players),
        [sessions, players]
    );

    const matrixData = useMemo(() =>
        categorizePlayersByQuadrant(sessions, players),
        [sessions, players]
    );

    const drillBreakdown = useMemo(() =>
        analyzeDrillBreakdown(sessions, drills),
        [sessions, drills]
    );

    const integrityAlerts = useMemo(() =>
        detectIntegrityIssues(sessions, players),
        [sessions, players]
    );

    const weeklyTrends = useMemo(() =>
        calculateWeeklyTrends(sessions),
        [sessions]
    );

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Team Insights</h2>
                    <p className="text-muted-foreground">Deep dive into team performance and trends</p>
                </div>
            </div>

            {/* NEW: Engagement Heatmap - High level visual overview */}
            <EngagementHeatmap
                sessions={sessions}
                pitchSessions={pitchSessions}
            />

            {/* Top Row: Goal Progress & Consistency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Goals Progress */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Goal Progress</h3>
                    {goalProgress.length > 0 ? (
                        goalProgress.map((progress, idx) => (
                            <TeamGoalProgressCard key={idx} data={progress} />
                        ))
                    ) : (
                        <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
                            No active team goals
                        </div>
                    )}
                </div>

                {/* Consistency Tracker */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Consistency</h3>
                    <TeamConsistencyTracker data={consistencyData} />
                </div>
            </div>

            {/* Middle Row: Quality/Quantity Matrix */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Performance Matrix</h3>
                <QualityQuantityMatrix data={matrixData} />
            </div>

            {/* Bottom Row: Drill Breakdown & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Activity Breakdown</h3>
                    <DrillBreakdownChart data={drillBreakdown} />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Weekly Trends</h3>
                    <TeamTrendChart data={weeklyTrends} />
                </div>
            </div>

            {/* Integrity Alerts */}
            {integrityAlerts.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Data Integrity</h3>
                    <IntegrityAlerts alerts={integrityAlerts} />
                </div>
            )}
        </div>
    );
};
