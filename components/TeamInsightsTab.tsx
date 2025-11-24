import React, { useMemo } from 'react';
import { Session, Player, Drill, TeamGoal } from '../types';
import {
    calculateTeamGoalProgress,
    getConsistencyData,
    categorizePlayersByQuadrant,
    analyzeDrillBreakdown,
    detectIntegrityIssues,
    calculateWeeklyTrends
} from '../utils/teamInsights';
import { TeamGoalProgressCard } from './TeamGoalProgressCard';
import { TeamConsistencyTracker } from './TeamConsistencyTracker';
import { QualityQuantityMatrix } from './QualityQuantityMatrix';
import { DrillBreakdownChart } from './DrillBreakdownChart';
import { IntegrityAlerts } from './IntegrityAlerts';
import { TeamTrendChart } from './TeamTrendChart';

interface TeamInsightsTabProps {
    players: Player[];
    sessions: Session[];
    drills: Drill[];
    teamGoals: TeamGoal[];
    teamId: string;
}

export const TeamInsightsTab: React.FC<TeamInsightsTabProps> = ({
    players,
    sessions,
    drills,
    teamGoals,
    teamId
}) => {
    // Calculate all insights data
    const teamGoalData = useMemo(() => {
        const activeGoal = teamGoals.find(g => g.status === 'Active');
        if (!activeGoal) return null;
        return calculateTeamGoalProgress(activeGoal, sessions, players);
    }, [teamGoals, sessions, players]);

    const consistencyData = useMemo(() =>
        getConsistencyData(sessions, players),
        [sessions, players]
    );

    const quadrantData = useMemo(() =>
        categorizePlayersByQuadrant(sessions, players),
        [sessions, players]
    );

    const drillData = useMemo(() =>
        analyzeDrillBreakdown(sessions, drills),
        [sessions, drills]
    );

    const integrityAlerts = useMemo(() =>
        detectIntegrityIssues(sessions, players),
        [sessions, players]
    );

    const trendData = useMemo(() =>
        calculateWeeklyTrends(sessions),
        [sessions]
    );

    // Show message if no data
    if (sessions.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-3">
                    <p className="text-xl font-semibold text-muted-foreground">No Team Data Yet</p>
                    <p className="text-sm text-muted-foreground">
                        Team insights will appear once players start logging sessions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Team Insights</h1>
                <p className="text-muted-foreground mt-1">
                    Quick, actionable insights to guide team conversations
                </p>
            </div>

            {/* Team Goal Progress */}
            {teamGoalData && (
                <section>
                    <h2 className="text-xl font-bold text-foreground mb-4">Team Goal Progress</h2>
                    <TeamGoalProgressCard data={teamGoalData} />
                </section>
            )}

            {/* Consistency Tracker */}
            <section>
                <h2 className="text-xl font-bold text-foreground mb-4">Team Consistency</h2>
                <TeamConsistencyTracker data={consistencyData} />
            </section>

            {/* Quality vs Quantity + Integrity Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quality vs Quantity Matrix */}
                <section>
                    <h2 className="text-xl font-bold text-foreground mb-4">Quality vs Quantity</h2>
                    <QualityQuantityMatrix data={quadrantData} />
                </section>

                {/* Integrity Alerts */}
                <section>
                    <h2 className="text-xl font-bold text-foreground mb-4">Integrity Alerts</h2>
                    <IntegrityAlerts alerts={integrityAlerts} />
                </section>
            </div>

            {/* Drill Breakdown */}
            <section>
                <h2 className="text-xl font-bold text-foreground mb-4">Drill Type Breakdown</h2>
                <DrillBreakdownChart data={drillData} />
            </section>

            {/* Team Trend */}
            <section>
                <h2 className="text-xl font-bold text-foreground mb-4">Team Trend (Last 4 Weeks)</h2>
                <TeamTrendChart data={trendData} />
            </section>
        </div>
    );
};
