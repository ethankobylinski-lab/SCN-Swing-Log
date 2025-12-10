import React, { useMemo } from 'react';
import { Player, Session, PitchSession, PersonalGoal, Drill, PitchSimulationTemplate } from '../types';
import { formatDate, describeRelativeDay, formatGoalName } from '../utils/helpers';
import { generatePitchSessionTitle } from '../utils/sessionTitleGenerator';
import { analyzePlayerStrengths, calculateRecentTrends } from '../utils/playerAnalytics';
import { Button } from './Button';
import { ProfileIcon } from './icons/ProfileIcon';
import { useTeamColor } from '../hooks/useTeamColor';

interface PlayerDashboardTabProps {
    player: Player;
    sessions: Session[];
    pitchSessions: PitchSession[];
    goals: PersonalGoal[];
    assignedDrills: Drill[];
    assignedSimulations: PitchSimulationTemplate[];
    onStartHitting: () => void;
    onStartPitching: () => void;
    onViewProfile: () => void;
    onStartProgram: (program: PitchSimulationTemplate) => void;
    onStartDrill: (drill: Drill) => void;
    onNavigateToHitting?: () => void;
    onNavigateToPitching?: () => void;
}

export const PlayerDashboardTab: React.FC<PlayerDashboardTabProps> = ({
    player,
    sessions,
    pitchSessions,
    goals,
    assignedDrills,
    assignedSimulations,
    onStartHitting,
    onStartPitching,
    onViewProfile,
    onStartProgram,
    onStartDrill,
    onNavigateToHitting,
    onNavigateToPitching
}) => {
    const { primaryColor, lightAccent } = useTeamColor();

    // Calculate statistics
    const stats = useMemo(() => {
        const lastHittingSession = sessions.length > 0 ? sessions[0] : null;
        const lastPitchingSession = pitchSessions.length > 0 ? pitchSessions[0] : null;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const hittingSessionsThisWeek = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= oneWeekAgo;
        }).length;

        const pitchingSessionsThisWeek = pitchSessions.filter(ps => {
            const sessionDate = new Date(ps.date);
            return sessionDate >= oneWeekAgo;
        }).length;

        return {
            lastHittingSession,
            lastPitchingSession,
            hittingSessionsThisWeek,
            pitchingSessionsThisWeek,
        };
    }, [sessions, pitchSessions]);

    // Analytics
    const strengths = useMemo(() => analyzePlayerStrengths(sessions, pitchSessions), [sessions, pitchSessions]);
    const trends = useMemo(() => calculateRecentTrends(sessions, pitchSessions), [sessions, pitchSessions]);

    // Active goals with progress
    const activeGoals = useMemo(() => {
        return goals
            .filter(g => g.status === 'Active')
            .map(goal => {
                const currentValue = 0; // Simplified for now
                const progress = goal.targetValue > 0 ? Math.min((currentValue / goal.targetValue) * 100, 100) : 0;
                return { ...goal, currentValue, progress };
            })
            .slice(0, 3);
    }, [goals, sessions]);

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Profile */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Welcome back, {player.name.split(' ')[0]}</p>
                </div>
                <button
                    onClick={onViewProfile}
                    className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    aria-label="Profile"
                >
                    <ProfileIcon className="w-6 h-6 text-foreground" />
                </button>
            </div>

            {/* This Week Summary */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Week</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onNavigateToHitting}
                        className={`bg-gradient-to-br border rounded-2xl p-5 text-center transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[88px] ${
                            stats.hittingSessionsThisWeek > 0
                                ? 'from-primary/15 to-primary/8 border-primary/30'
                                : 'from-primary/10 to-primary/5 border-primary/20'
                        }`}
                    >
                        <p className="text-3xl font-bold text-primary">{stats.hittingSessionsThisWeek}</p>
                        <p className="text-xs text-muted-foreground mt-1">Hitting Sessions</p>
                    </button>
                    <button
                        onClick={onNavigateToPitching}
                        className={`bg-gradient-to-br border rounded-2xl p-5 text-center transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[88px] ${
                            stats.pitchingSessionsThisWeek > 0
                                ? 'from-secondary/15 to-secondary/8 border-secondary/30'
                                : 'from-secondary/10 to-secondary/5 border-secondary/20'
                        }`}
                    >
                        <p className="text-3xl font-bold text-secondary">{stats.pitchingSessionsThisWeek}</p>
                        <p className="text-xs text-muted-foreground mt-1">Pitching Sessions</p>
                    </button>
                </div>
            </section>

            {/* Assigned Work - Interactive Cards */}
            {(assignedDrills.length > 0 || assignedSimulations.length > 0) && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assigned Work</h2>
                    <div className="space-y-3">
                        {assignedDrills.slice(0, 3).map(drill => (
                            <div key={drill.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">⚾</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{drill.name}</p>
                                            <p className="text-xs text-muted-foreground">{drill.drillType}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-full uppercase">
                                        Drill
                                    </span>
                                </div>
                                <Button
                                    onClick={() => onStartDrill(drill)}
                                    variant="secondary"
                                    size="sm"
                                    className="w-full"
                                >
                                    Start Drill
                                </Button>
                            </div>
                        ))}
                        {assignedSimulations.slice(0, 3).map(program => (
                            <div key={program.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">🎯</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{program.name}</p>
                                            <p className="text-xs text-muted-foreground">Pitching Program</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-1 bg-secondary/10 text-secondary rounded-full uppercase">
                                        Program
                                    </span>
                                </div>
                                <Button
                                    onClick={() => onStartProgram(program)}
                                    variant={program.status === 'active' ? 'secondary' : 'primary'}
                                    size="sm"
                                    className="w-full"
                                >
                                    {program.status === 'active' ? 'Continue Program' : 'Start Program'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Strengths & Focus Areas */}
            {strengths.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Analysis</h2>
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        {strengths.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'strength' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                        }`}>
                                        {item.type === 'strength' ? '⚡' : '🔧'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-foreground">{item.metric}</p>
                                        <p className="text-xs text-muted-foreground">{item.insight}</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${item.type === 'strength' ? 'text-success' : 'text-warning'
                                    }`}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Activity Trends */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">14-Day Activity</h2>
                <div className="bg-card border border-border rounded-2xl p-5 h-32 flex items-end justify-between gap-1">
                    {trends.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                                className={`w-full rounded-t-sm transition-all ${day.volume === 0 ? 'bg-muted/20 h-1' :
                                    day.type === 'hitting' ? 'bg-primary' : 'bg-secondary'
                                    }`}
                                style={{
                                    height: day.volume === 0 ? '4px' : `${Math.min(day.volume * 20, 100)}%`,
                                    opacity: day.volume === 0 ? 1 : 0.8
                                }}
                            />
                            {/* Tooltip */}
                            {day.volume > 0 && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap">
                                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {day.volume} sessions
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Start Training Section */}
            <section className="space-y-3 mt-8">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Start Training</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                        onClick={onStartHitting}
                        variant="primary"
                        className="w-full justify-start h-auto py-5 px-6"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">⚾️</span>
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-bold text-lg">Start Hitting Session</p>
                                <p className="text-sm opacity-90 font-normal">Log swings, tee work, and drills</p>
                            </div>
                        </div>
                    </Button>

                    <Button
                        onClick={onStartPitching}
                        variant="secondary"
                        className="w-full justify-start h-auto py-5 px-6"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-bold text-lg">Start Pitching Session</p>
                                <p className="text-sm opacity-90 font-normal">Track bullpens and flat grounds</p>
                            </div>
                        </div>
                    </Button>
                </div>
            </section>
        </div>
    );
};
