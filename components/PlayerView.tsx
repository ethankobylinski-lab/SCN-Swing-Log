import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { ProfileTab } from './ProfileTab';
import { HomeIcon } from './icons/HomeIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { PencilIcon } from './icons/PencilIcon';
import { NoteIcon } from './icons/NoteIcon';
import { ProfileIcon } from './icons/ProfileIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Drill, Session, SetResult, Player, DrillType, TargetZone, PitchType, CountSituation, BaseRunner, PersonalGoal, GoalType, TeamGoal } from '../types';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName, describeRelativeDay, resolveDrillTypeForSet } from '../utils/helpers';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, DRILL_TYPES, GOAL_TYPES } from '../constants';
import { PlayerRadarChart } from './PlayerRadarChart';
import { Modal } from './Modal';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { SessionSaveAnimation } from './SessionSaveAnimation';
import { Tooltip } from './Tooltip';

const doesSetMatchGoal = (goal: PersonalGoal, session: Session, set: SetResult, drills: Drill[]) => {
    if (goal.drillType) {
        const setDrillType = resolveDrillTypeForSet(session, set, drills);
        if (setDrillType !== goal.drillType) {
            return false;
        }
    }
    if (goal.targetZones && goal.targetZones.length > 0) {
        if (!set.targetZones?.some((zone) => goal.targetZones!.includes(zone))) {
            return false;
        }
    }
    if (goal.pitchTypes && goal.pitchTypes.length > 0) {
        if (!set.pitchTypes?.some((pitch) => goal.pitchTypes!.includes(pitch))) {
            return false;
        }
    }
    return true;
};

const collectGoalSets = (goal: PersonalGoal, sessions: Session[], drills: Drill[]) => {
    return sessions.flatMap((session) =>
        session.sets
            .filter((set) => doesSetMatchGoal(goal, session, set, drills))
            .map((set) => ({ session, set })),
    );
};

const summarizeSets = (sets: SetResult[]) =>
    sets.reduce(
        (acc, set) => ({
            attempted: acc.attempted + set.repsAttempted,
            executed: acc.executed + set.repsExecuted,
            hardHits: acc.hardHits + set.hardHits,
            strikeouts: acc.strikeouts + set.strikeouts,
        }),
        { attempted: 0, executed: 0, hardHits: 0, strikeouts: 0 },
    );

const getGoalValueForSets = (goal: PersonalGoal, sets: SetResult[]) => {
    switch (goal.metric) {
        case 'Execution %':
            return calculateExecutionPercentage(sets);
        case 'Hard Hit %':
            return calculateHardHitPercentage(sets);
        case 'No Strikeouts':
            return sets.reduce((sum, set) => sum + set.strikeouts, 0);
        case 'Total Reps':
            return sets.reduce((sum, set) => sum + set.repsAttempted, 0);
        default:
            return 0;
    }
};

const resolveMinRepsRequirement = (goal: PersonalGoal): number | undefined => {
    if (goal.metric !== 'Execution %') {
        return undefined;
    }
    return goal.minReps ?? 50;
};

const GoalProgress: React.FC<{
    goal: PersonalGoal;
    sessions: Session[];
    drills: Drill[];
    onDelete: (goalId: string) => Promise<void>;
    onSelect?: (goal: PersonalGoal) => void;
}> = ({ goal, sessions, drills, onDelete, onSelect }) => {
    const goalSets = useMemo(() => collectGoalSets(goal, sessions, drills), [goal, sessions, drills]);
    const filteredSets = goalSets.map(({ set }) => set);
    const currentValue = filteredSets.length > 0 ? getGoalValueForSets(goal, filteredSets) : 0;
    const totalRepsLogged = filteredSets.reduce((sum, set) => sum + set.repsAttempted, 0);
    const minRepsRequired = resolveMinRepsRequirement(goal);
    const volumeRatio =
        minRepsRequired && minRepsRequired > 0 ? Math.min(totalRepsLogged / minRepsRequired, 1) : 1;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete(goal.id);
        } finally {
            setIsDeleting(false);
        }
    };
    
    let progress = 0;
    if (goal.targetValue > 0) {
        if (goal.metric === 'No Strikeouts') {
            progress = Math.max(0, 100 - (currentValue / goal.targetValue * 100));
        } else {
            progress = (currentValue / goal.targetValue) * 100;
        }
    } else if (goal.metric === 'No Strikeouts' && goal.targetValue === 0) {
        progress = currentValue === 0 ? 100 : 0;
    }

    const isPercentage = goal.metric.includes('%');
    const displayValue = isPercentage ? `${currentValue}%` : currentValue;
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;
    if (goal.metric === 'Execution %' && minRepsRequired) {
        progress *= volumeRatio;
    }
    const handleSelect = () => {
        if (onSelect) {
            onSelect(goal);
        }
    };
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onSelect) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(goal);
        }
    };

    return (
        <div
            className={`bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-sm ${onSelect ? 'cursor-pointer hover:border-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60' : ''
                }`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-semibold text-card-foreground">{formatGoalName(goal)}</h4>
                    <p className="text-xs text-muted-foreground">Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
                </div>
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        handleDelete();
                    }}
                    disabled={isDeleting}
                    aria-label="Delete goal"
                    className="text-muted-foreground hover:text-destructive text-lg font-bold disabled:opacity-50"
                >
                    {isDeleting ? '...' : '\u00d7'}
                </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
                <div className="w-full bg-background rounded-full h-2.5">
                    <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <span className="text-sm font-bold text-primary">{displayValue}</span>
            </div>
            {goal.metric === 'Execution %' && minRepsRequired && (
                <p className="text-[11px] text-muted-foreground">
                    Volume: {totalRepsLogged}/{minRepsRequired} reps logged
                </p>
            )}
        </div>
    );
};

interface GoalDetailProps {
    goal: PersonalGoal;
    sessions: Session[];
    drills: Drill[];
    reflection: string;
    onReflectionChange: (value: string) => void;
    onSaveReflection: () => Promise<void> | void;
    isSavingReflection: boolean;
    errorMessage?: string | null;
}

const GoalDetail: React.FC<GoalDetailProps> = ({
    goal,
    sessions,
    drills,
    reflection,
    onReflectionChange,
    onSaveReflection,
    isSavingReflection,
    errorMessage,
}) => {
    const goalSets = useMemo(() => collectGoalSets(goal, sessions, drills), [goal, sessions, drills]);
    const filteredSets = useMemo(() => goalSets.map(({ set }) => set), [goalSets]);
    const currentValue = filteredSets.length > 0 ? getGoalValueForSets(goal, filteredSets) : 0;
    const totalRepsLogged = filteredSets.reduce((sum, set) => sum + set.repsAttempted, 0);
    const minRepsRequired = resolveMinRepsRequirement(goal);
    const volumeRatio =
        minRepsRequired && minRepsRequired > 0 ? Math.min(totalRepsLogged / minRepsRequired, 1) : 1;
    const isPercentageMetric = goal.metric.includes('%');
    const displayValue = isPercentageMetric ? `${currentValue}%` : currentValue;
    const displayTarget = isPercentageMetric ? `${goal.targetValue}%` : goal.targetValue;
    const progressPercent = useMemo(() => {
        let base = 0;
        if (goal.metric === 'No Strikeouts') {
            if (goal.targetValue === 0) {
                base = currentValue === 0 ? 100 : 0;
            } else if (goal.targetValue > 0) {
                base = Math.max(0, 100 - (currentValue / goal.targetValue) * 100);
            }
        } else if (goal.targetValue > 0) {
            base = (currentValue / goal.targetValue) * 100;
        }
        if (goal.metric === 'Execution %' && minRepsRequired) {
            return base * volumeRatio;
        }
        return base;
    }, [goal.metric, goal.targetValue, currentValue, minRepsRequired, volumeRatio]);

    type GoalSessionContribution = {
        session: Session;
        value: number;
        matchingSets: SetResult[];
        aggregates: ReturnType<typeof summarizeSets>;
    };

    const sessionContributions = useMemo<GoalSessionContribution[]>(() => {
        const grouped = new Map<string, { session: Session; matchingSets: SetResult[] }>();
        goalSets.forEach(({ session, set }) => {
            if (!grouped.has(session.id)) {
                grouped.set(session.id, { session, matchingSets: [] });
            }
            grouped.get(session.id)!.matchingSets.push(set);
        });

        return Array.from(grouped.values())
            .map(({ session, matchingSets }) => ({
                session,
                matchingSets,
                value: getGoalValueForSets(goal, matchingSets),
                aggregates: summarizeSets(matchingSets),
            }))
            .sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());
    }, [goal, goalSets]);

    const filterChips = [
        goal.drillType ? `Drill: ${goal.drillType}` : null,
        goal.targetZones?.length ? `Zones: ${goal.targetZones.join(', ')}` : null,
        goal.pitchTypes?.length ? `Pitch Types: ${goal.pitchTypes.join(', ')}` : null,
        minRepsRequired ? `Min Reps: ${minRepsRequired}` : null,
    ].filter(Boolean);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-muted/10 p-4 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground uppercase tracking-wide">{goal.metric}</p>
                        <h3 className="text-2xl font-semibold text-foreground">{formatGoalName(goal)}</h3>
                        <p className="text-xs text-muted-foreground">Due by {formatDate(goal.targetDate)} · Started {formatDate(goal.startDate)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Current</p>
                        <p className="text-3xl font-bold text-primary">{displayValue}</p>
                        <p className="text-xs text-muted-foreground">Target {displayTarget}</p>
                    </div>
                </div>
                <div className="bg-background rounded-full h-3">
                    <div className="h-3 rounded-full bg-secondary" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                </div>
                {goal.metric === 'Execution %' && minRepsRequired && (
                    <p className="text-xs text-muted-foreground">
                        Volume: {totalRepsLogged}/{minRepsRequired} reps logged
                        {totalRepsLogged < minRepsRequired ? ` (${minRepsRequired - totalRepsLogged} more to unlock full credit)` : ''}
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Goal Filters</p>
                {filterChips.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {filterChips.map((chip, index) => (
                            <span key={`${chip}-${index}`} className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-semibold">
                                {chip}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">This goal applies to every drill, zone, and pitch type.</p>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">Reflection</p>
                    <button
                        type="button"
                        onClick={() => onSaveReflection()}
                        disabled={isSavingReflection}
                        className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-md disabled:opacity-50"
                    >
                        {isSavingReflection ? 'Saving...' : 'Save Reflection'}
                    </button>
                </div>
                {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
                <textarea
                    value={reflection}
                    onChange={(event) => onReflectionChange(event.target.value)}
                    placeholder="What are you learning as you chase this goal?"
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
            </section>

            <section className="space-y-3">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Sessions Moving the Needle</p>
                    <p className="text-xs text-muted-foreground">Only the sets that match this goal show up here.</p>
                </div>
                {sessionContributions.length > 0 ? (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                        {sessionContributions.map(({ session, value, aggregates, matchingSets }) => {
                            const valueLabel = goal.metric.includes('%') ? `${value}%` : value;
                            return (
                                <div key={session.id} className="rounded-xl border border-border/60 p-3 bg-card space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground">{session.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(session.date)} · {describeRelativeDay(session.date) ?? 'logged'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{goal.metric}</p>
                                            <p className="text-lg font-bold text-primary">{valueLabel}</p>
                                            <p className="text-[11px] text-muted-foreground">vs {displayTarget}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                        <div className="rounded-lg bg-muted/40 px-2 py-1">
                                            <p className="font-semibold text-foreground">{matchingSets.length}</p>
                                            <p className="uppercase tracking-wide">Sets logged</p>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 px-2 py-1">
                                            <p className="font-semibold text-foreground">{aggregates.attempted}</p>
                                            <p className="uppercase tracking-wide">Reps</p>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 px-2 py-1">
                                            <p className="font-semibold text-foreground">{aggregates.executed}</p>
                                            <p className="uppercase tracking-wide">Executed</p>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 px-2 py-1">
                                            <p className="font-semibold text-foreground">{aggregates.hardHits}</p>
                                            <p className="uppercase tracking-wide">Hard Hits</p>
                                        </div>
                                    </div>
                                    {session.reflection && (
                                        <p className="text-xs text-muted-foreground italic">"{session.reflection}"</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                        Log a session that matches this goal’s filters, and it will show up here automatically.
                    </div>
                )}
            </section>
        </div>
    );
};

const TeamGoalProgress: React.FC<{ goal: TeamGoal; sessions: Session[]; drills: Drill[]; }> = ({ goal, sessions, drills }) => {
    const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);
    
    let progress = 0;
    if (goal.targetValue > 0) {
        if (goal.metric === 'No Strikeouts') {
            progress = Math.max(0, 100 - (currentValue / goal.targetValue * 100));
        } else {
            progress = (currentValue / goal.targetValue) * 100;
        }
    } else if (goal.metric === 'No Strikeouts' && goal.targetValue === 0) {
        progress = currentValue === 0 ? 100 : 0;
    }

    const isPercentage = goal.metric.includes('%');
    const displayValue = isPercentage ? `${Math.round(currentValue)}%` : Math.round(currentValue);
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;

    return (
        <div className="bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-sm">
            <div>
                <h4 className="font-semibold text-card-foreground">{goal.description}</h4>
                <p className="text-xs text-muted-foreground">{formatTeamGoalName(goal)} | Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
                <div className="w-full bg-background rounded-full h-2.5">
                    <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <span className="text-sm font-bold text-primary">{displayValue}</span>
            </div>
        </div>
    );
};

const PlayerDashboard: React.FC<{
    player: Player;
    assignedDrills: Drill[];
    recentSessions: Session[];
    drills: Drill[];
    goals: PersonalGoal[];
    teamGoals: TeamGoal[];
    teamSessions: Session[];
    onStartAssignedSession: (drill: Drill) => void;
    activeTeamId?: string;
}> = ({ player, assignedDrills, recentSessions, drills, goals, teamGoals, teamSessions, onStartAssignedSession, activeTeamId }) => {
    
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const { createGoal, deleteGoal, updateGoal } = useContext(DataContext)!;
    const teamId = activeTeamId;
    const [goalFormError, setGoalFormError] = useState<string | null>(null);
    const [goalListError, setGoalListError] = useState<string | null>(null);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [goalReflection, setGoalReflection] = useState('');
    const [isSavingReflection, setIsSavingReflection] = useState(false);
    const [goalDetailError, setGoalDetailError] = useState<string | null>(null);
    const selectedGoal = useMemo(() => goals.find(g => g.id === selectedGoalId) ?? null, [goals, selectedGoalId]);

    useEffect(() => {
        if (selectedGoal) {
            setGoalReflection(selectedGoal.reflection ?? '');
        } else {
            setGoalReflection('');
        }
    }, [selectedGoal]);
    
    const overallExecutionPct = useMemo(() => {
        const allSets = recentSessions.flatMap(s => s.sets);
        if (allSets.length === 0) return 0;
        return calculateExecutionPercentage(allSets);
    }, [recentSessions]);

    const handleOpenGoalDetail = (goal: PersonalGoal) => {
        setSelectedGoalId(goal.id);
        setGoalDetailError(null);
    };

    const handleCloseGoalDetail = () => {
        if (isSavingReflection) return;
        setSelectedGoalId(null);
        setGoalDetailError(null);
    };

    const handleSaveGoalReflection = async () => {
        if (!selectedGoal) return;
        setGoalDetailError(null);
        setIsSavingReflection(true);
        try {
            const trimmedReflection = goalReflection.trim();
            await updateGoal(selectedGoal.id, { reflection: trimmedReflection });
            setGoalReflection(trimmedReflection);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save reflection. Please try again.';
            setGoalDetailError(message);
        } finally {
            setIsSavingReflection(false);
        }
    };

    const handleCreateGoal = async (goalData: Omit<PersonalGoal, 'id' | 'playerId' | 'status' | 'startDate' | 'teamId'>) => {
        if (!teamId) {
            setGoalFormError('Join a team before setting goals.');
            return;
        }

        setGoalFormError(null);
        setIsSavingGoal(true);
        try {
            await createGoal({
                ...goalData,
                playerId: player.id,
                teamId,
                status: 'Active',
                startDate: new Date().toISOString()
            });
            setIsGoalModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this goal. Please try again.';
            setGoalFormError(message);
        } finally {
            setIsSavingGoal(false);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        setGoalListError(null);
        try {
            await deleteGoal(goalId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to delete this goal. Please try again.';
            setGoalListError(message);
        }
    };
    
    const StatCard: React.FC<{title: string; value: string;}> = ({title, value}) => (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm text-center">
            <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Drills for Today" value={assignedDrills.length.toString()} />
                <StatCard title="Overall Execution" value={`${overallExecutionPct}%`} />
                <StatCard title="Active Goals" value={goals.length.toString()} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-foreground mb-4">Today's Drills</h2>
                        {assignedDrills.length > 0 ? (
                            <div className="space-y-4">
                                {assignedDrills.map(drill => (
                                    <div key={drill.id} className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-primary">{drill.name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1 mb-3">{drill.description}</p>
                                            <p className="text-xs text-card-foreground"><strong>Goal:</strong> {drill.goalType} &gt;= {drill.goalTargetValue}{drill.goalType.includes('%') ? '%' : ''}</p>
                                        </div>
                                        <button onClick={() => onStartAssignedSession(drill)} className="w-full mt-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm">
                                            Start Session
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground space-y-1">
                                <p className="font-medium">No drills assigned for today.</p>
                                <p className="text-sm">Enjoy the breather or log an ad-hoc session to stay sharp.</p>
                            </div>
                        )}
                    </div>
                     <div>
                        <h2 className="text-xl font-bold text-foreground mb-4">Active Team Goals</h2>
                        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                            {teamGoals.length > 0 ? (
                                <div className="space-y-4">
                                    {teamGoals.map(g => <TeamGoalProgress key={g.id} goal={g} sessions={teamSessions} drills={drills} />)}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground space-y-1">
                                    <p className="font-medium">No team goals just yet.</p>
                                    <p className="text-sm">Once your coach sets one, it will show up here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <div>
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold text-foreground">My Goals</h2>
                         <button
                            onClick={() => {
                                setGoalFormError(null);
                                setIsGoalModalOpen(true);
                            }}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-1 px-3 text-sm rounded-lg"
                        >
                            + Set Goal
                        </button>
                    </div>
                     <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                        {goalListError && <p className="text-sm text-destructive mb-3">{goalListError}</p>}
                        {goals.length > 0 ? (
                             <div className="space-y-4">
                                {goals.map(g => (
                                    <GoalProgress
                                        key={g.id}
                                        goal={g}
                                        sessions={recentSessions}
                                        drills={drills}
                                        onDelete={handleDeleteGoal}
                                        onSelect={handleOpenGoalDetail}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground space-y-1">
                                <p className="font-medium">You haven’t set any personal goals yet.</p>
                                <p className="text-sm">Tap “+ Set Goal” to lock in a target for this week.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={Boolean(selectedGoal)}
                onClose={handleCloseGoalDetail}
                title={selectedGoal ? formatGoalName(selectedGoal) : 'Goal Details'}
            >
                {selectedGoal && (
                    <GoalDetail
                        goal={selectedGoal}
                        sessions={recentSessions}
                        drills={drills}
                        reflection={goalReflection}
                        onReflectionChange={setGoalReflection}
                        onSaveReflection={handleSaveGoalReflection}
                        isSavingReflection={isSavingReflection}
                        errorMessage={goalDetailError}
                    />
                )}
            </Modal>

            <Modal
                isOpen={isGoalModalOpen}
                onClose={() => {
                    if (isSavingGoal) return;
                    setGoalFormError(null);
                    setIsGoalModalOpen(false);
                }}
                title="Set a New Goal"
            >
                <GoalForm onSave={handleCreateGoal} isSaving={isSavingGoal} errorMessage={goalFormError} />
            </Modal>
        </div>
    );
};

type GoalFormValues = Omit<PersonalGoal, 'id' | 'playerId' | 'status' | 'startDate' | 'teamId'>;

const GoalForm: React.FC<{ onSave: (data: GoalFormValues) => Promise<void> | void; isSaving?: boolean; errorMessage?: string | null; }> = ({ onSave, isSaving = false, errorMessage }) => {
    const [metric, setMetric] = useState<GoalType>('Execution %');
    const [targetValue, setTargetValue] = useState(85);
    const [targetDate, setTargetDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]); // 30 days from now
    const [drillType, setDrillType] = useState<DrillType | undefined>(undefined);
    const [targetZones, setTargetZones] = useState<TargetZone[]>([]);
    const [pitchTypes, setPitchTypes] = useState<PitchType[]>([]);
    const [minReps, setMinReps] = useState(50);

    const handleTargetZoneSelect = (zone: TargetZone) => {
        setTargetZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
    };
    const handlePitchTypeSelect = (pitch: PitchType) => {
        setPitchTypes(prev => prev.includes(pitch) ? prev.filter(p => p !== pitch) : [...prev, pitch]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const goalData: GoalFormValues = {
            metric,
            targetValue,
            targetDate,
        };
        if(drillType) goalData.drillType = drillType;
        if(targetZones.length > 0) goalData.targetZones = targetZones;
        if(pitchTypes.length > 0) goalData.pitchTypes = pitchTypes;
        if(metric === 'Execution %') {
            goalData.minReps = Math.max(1, minReps);
        }
        await onSave(goalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Metric</label>
                    <select value={metric} onChange={e => setMetric(e.target.value as GoalType)} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        {GOAL_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Target Value</label>
                    <input type="number" value={targetValue} onChange={e => setTargetValue(parseInt(e.target.value))} required className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>
            {metric === 'Execution %' && (
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Minimum Reps</label>
                    <input
                        type="number"
                        min={1}
                        value={minReps}
                        onChange={(e) => setMinReps(parseInt(e.target.value) || 0)}
                        className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Need at least this many reps before execution % can hit the goal. Default is 50.</p>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Target Date</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            
            <div>
                <h4 className="text-md font-semibold text-muted-foreground border-b border-border pb-2 mb-3">Goal Specificity (Optional)</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Drill Type</label>
                        <select value={drillType || ''} onChange={e => setDrillType(e.target.value as DrillType || undefined)} className="mt-1 block w-full bg-background border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                            <option value="">Any Drill Type</option>
                            {DRILL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Target Zones</label>
                        <div className="grid grid-cols-3 gap-2">
                            {TARGET_ZONES.map(zone => (
                                <button type="button" key={zone} onClick={() => handleTargetZoneSelect(zone)} className={`p-2 text-xs rounded-md ${targetZones.includes(zone) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{zone}</button>
                            ))}
                        </div>
                        {targetZones.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Selected: <span className="font-semibold text-foreground">{targetZones.join(', ')}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Pitch Types</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PITCH_TYPES.map(pitch => (
                                <button
                                    type="button"
                                    key={pitch}
                                    onClick={() => handlePitchTypeSelect(pitch)}
                                    className={`p-2 text-xs rounded-md ${pitchTypes.includes(pitch) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    {pitch}
                                </button>
                            ))}
                        </div>
                        {pitchTypes.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Selected: <span className="font-semibold text-foreground">{pitchTypes.join(', ')}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                 <button
                    type="submit"
                    disabled={isSaving}
                    className="py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
            </div>
        </form>
    );
};

const LogSession: React.FC<{
    assignedDrill: Drill | null;
    onSave: (sessionData: { name: string; drillId?: string; sets: SetResult[]; reflection?: string }) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    errorMessage?: string | null;
}> = ({ assignedDrill, onSave, onCancel, isSaving, errorMessage }) => {
    
    const isAssigned = !!assignedDrill;
    const initialSet: SetResult = { setNumber: 1, repsAttempted: assignedDrill?.repsPerSet || 10, repsExecuted: 0, hardHits: 0, strikeouts: 0, grade: 5 };

    const [drillType, setDrillType] = useState<DrillType>(assignedDrill?.drillType || 'Tee Work');
    const [targetZones, setTargetZones] = useState<TargetZone[]>(assignedDrill?.targetZones || []);
    const [pitchTypes, setPitchTypes] = useState<PitchType[]>(assignedDrill?.pitchTypes || []);
    const [outs, setOuts] = useState<0|1|2>(assignedDrill?.outs || 0);
    const [count, setCount] = useState<CountSituation>(assignedDrill?.countSituation || 'Even');
    const [runners, setRunners] = useState<BaseRunner[]>(assignedDrill?.baseRunners || []);
    
    const [currentSet, setCurrentSet] = useState<SetResult>(initialSet);
    const [loggedSets, setLoggedSets] = useState<SetResult[]>([]);
    const [reflection, setReflection] = useState('');
    
    const createContextualSet = (set: SetResult): SetResult => ({
        ...set,
        targetZones: targetZones.length ? [...targetZones] : [],
        pitchTypes: pitchTypes.length ? [...pitchTypes] : [],
        outs,
        countSituation: count,
        baseRunners: runners.length ? [...runners] : [],
        drillLabel: assignedDrill?.name || drillType,
        drillType: assignedDrill?.drillType || drillType,
    });

    const handleMultiSelect = <T extends string>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) => {
        if (isAssigned) return;
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };
    
    const handleAddSet = () => {
        const setWithContext = createContextualSet(currentSet);
        const newLoggedSets = [...loggedSets, setWithContext];
        setLoggedSets(newLoggedSets);
        setCurrentSet({ ...initialSet, setNumber: newLoggedSets.length + 1 });
    };

    const handleSaveSession = async () => {
        if (isSaving) return;
        const finalSets = loggedSets.length > 0 ? loggedSets : [createContextualSet(currentSet)];
        await onSave({
            drillId: assignedDrill?.id,
            name: assignedDrill?.name || drillType,
            sets: finalSets,
            reflection: reflection.trim() ? reflection.trim() : undefined,
        });
    };

    const Stepper: React.FC<{label: string, value: number, onChange: (val: number) => void, max?: number, readOnly?: boolean}> = ({label, value, onChange, max, readOnly}) => (
        <div className="text-center">
            <label className="text-sm font-semibold text-muted-foreground">{label}</label>
            <div className="flex items-center justify-center gap-3 mt-2">
                <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="w-10 h-10 rounded-full bg-muted text-lg font-bold disabled:opacity-50"
                    aria-label={`Decrease ${label}`}
                >
                    -
                </button>
                <span className="text-2xl font-bold text-foreground w-12 text-center" aria-live="polite">
                    {value}
                </span>
                <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
                    className="w-10 h-10 rounded-full bg-muted text-lg font-bold disabled:opacity-50"
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
    
    const totalReps = loggedSets.reduce((sum, s) => sum + s.repsAttempted, 0);
    const totalExec = loggedSets.reduce((sum, s) => sum + s.repsExecuted, 0);

    return (
        <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/30 text-sm rounded-lg p-4 space-y-2 text-primary">
                <p className="font-semibold flex items-center gap-2">
                    <NoteIcon className="w-4 h-4" aria-hidden="true" />
                    Quick directions
                </p>
                <ul className="list-disc list-inside text-primary/90 space-y-1">
                    <li>Dial in the drill context before logging each set so coaches know what you worked on.</li>
                    <li>Track every set. Aim for honest execution numbers so the analytics stay accurate.</li>
                    <li>Drop a short reflection so future you remembers what clicked (or what didn’t).</li>
                    <li>Switching drills? Update the drill details above, then tap "Log Set & Start Next" so that set keeps the new focus.</li>
                </ul>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <h3 className="font-semibold text-muted-foreground mb-2">Drill Type</h3>
                    <div className="flex flex-wrap gap-2">
                        {DRILL_TYPES.map(d => <button type="button" key={d} disabled={isAssigned} onClick={() => setDrillType(d)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${drillType === d ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 disabled:opacity-70'}`}>{d}</button>)}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">Target Zone (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {TARGET_ZONES.map(z => <button type="button" key={z} disabled={isAssigned} onClick={() => handleMultiSelect(setTargetZones, z)} className={`p-2 text-xs rounded-md ${targetZones.includes(z) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 disabled:opacity-70'}`}>{z}</button>)}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">Pitch Type (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                           {PITCH_TYPES.map(p => <button type="button" key={p} disabled={isAssigned} onClick={() => handleMultiSelect(setPitchTypes, p)} className={`p-2 text-xs rounded-md ${pitchTypes.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 disabled:opacity-70'}`}>{p}</button>)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <h3 className="font-semibold text-muted-foreground mb-2">Game Situation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground">Outs</label>
                        <div className="flex gap-2 mt-2">
                            {OUTS_OPTIONS.map(o => <button type="button" key={o} disabled={isAssigned} onClick={() => setOuts(o)} className={`flex-1 p-2 text-sm rounded-md ${outs === o ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 disabled:opacity-70'}`}>{o}</button>)}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-muted-foreground">Count</label>
                        <select value={count} disabled={isAssigned} onChange={(e) => setCount(e.target.value as CountSituation)} className="mt-2 w-full bg-background border-input rounded-md py-2 px-3 text-sm disabled:opacity-70">
                            {COUNT_SITUATIONS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-semibold text-muted-foreground">Base Runners</label>
                        <div className="flex gap-2 mt-2">
                            {BASE_RUNNERS.map(r => <button type="button" key={r} disabled={isAssigned} onClick={() => handleMultiSelect(setRunners, r)} className={`flex-1 p-2 text-sm rounded-md ${runners.includes(r) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 disabled:opacity-70'}`}>{r}</button>)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                 <div>
                    <h3 className="font-semibold text-muted-foreground">Log Set #{currentSet.setNumber}</h3>
                    <p className="text-xs text-muted-foreground">Drill focus: {assignedDrill?.name || drillType}</p>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Stepper label="Reps" value={currentSet.repsAttempted} onChange={(v) => setCurrentSet(s=>({...s, repsAttempted: v}))} readOnly={isAssigned}/>
                     <Stepper label="Executions" value={currentSet.repsExecuted} onChange={(v) => setCurrentSet(s=>({...s, repsExecuted: v}))} max={currentSet.repsAttempted} />
                     <Stepper label="Hard Hits" value={currentSet.hardHits} onChange={(v) => setCurrentSet(s=>({...s, hardHits: v}))} max={currentSet.repsAttempted}/>
                     <Stepper label="Strikeouts" value={currentSet.strikeouts} onChange={(v) => setCurrentSet(s=>({...s, strikeouts: v}))} max={currentSet.repsAttempted}/>
                 </div>
                 <div className="pt-4">
                    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                    Set Reflection Grade
                                    <Tooltip content="Slide to rate the quality of the set. Keep it honest—coaches see trends, not individual scores.">
                                        <span
                                            tabIndex={0}
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                            aria-label="How to score a set"
                                        >
                                            <InfoIcon className="w-3 h-3" />
                                        </span>
                                    </Tooltip>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Reflect on how you did during this set—consider your mental thoughts, improvements, focus, and anything else that stood out.
                                </p>
                            </div>
                            <span className="text-3xl font-black text-primary tabular-nums">{currentSet.grade}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={currentSet.grade}
                            onChange={e => setCurrentSet((s) => ({ ...s, grade: parseInt(e.target.value) }))}
                            className="w-full h-3 bg-muted rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <button onClick={handleAddSet} className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-2 px-4 rounded-lg text-sm">Log Set & Start Next</button>
                    <p className="text-xs text-muted-foreground text-center">We’ll stamp each set with the drill info that’s selected when you press the button.</p>
                 </div>
            </div>
            
            {loggedSets.length > 0 && (
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-muted-foreground mb-2">Session Summary ({totalExec}/{totalReps})</h3>
                     <ul className="divide-y divide-border">
                        {loggedSets.map((s, i) => (
                           <li key={i} className="py-2 flex flex-wrap gap-3 justify-between items-center text-sm">
                               <div>
                                   <span className="font-bold">Set {s.setNumber}</span>
                                   { (s.drillLabel || s.drillType) && (
                                        <p className="text-xs text-muted-foreground">{s.drillLabel || s.drillType}</p>
                                   )}
                               </div>
                               <span>Reps: {s.repsAttempted}</span>
                               <span>Exec: {s.repsExecuted}</span>
                               <span>HH: {s.hardHits}</span>
                               <span>Grade: {s.grade}</span>
                           </li>
                        ))}
                    </ul>
                </div>
             )}

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">Reflection / Notes</label>
                <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="What adjustments did you make? What will you focus on next time?"
                    className="w-full min-h-[120px] border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
                <p className="text-xs text-muted-foreground">Reflections help you remember why a session worked. Keep it short and specific.</p>
            </div>

            {errorMessage && (
                <div className="text-center text-sm text-destructive" role="status" aria-live="assertive">
                    {errorMessage}
                </div>
            )}

            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2 px-6 rounded-lg">Cancel</button>
                <button onClick={handleSaveSession} disabled={isSaving} className="bg-secondary hover:bg-secondary/90 disabled:opacity-60 text-secondary-foreground font-bold py-2 px-6 rounded-lg">
                    {isSaving ? 'Saving…' : 'Save Session'}
                </button>
            </div>
        </div>
    );
};

const SessionHistory: React.FC<{ sessions: Session[]; drills: Drill[]; onSelectSession: (session: Session) => void; }> = ({ sessions, drills, onSelectSession }) => {
    return (
        <div>
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                <ul className="divide-y divide-border">
                    {sessions.length > 0 ? sessions.map(session => {
                        const drill = drills.find(d => d.id === session.drillId);
                        const progress = drill 
                            ? getSessionGoalProgress(session, drill) 
                            : { value: calculateExecutionPercentage(session.sets), isSuccess: calculateExecutionPercentage(session.sets) >= 70 };
                        
                        const goalType = drill ? drill.goalType : "Execution %";
                        const editDescriptor = describeRelativeDay(session.updatedAt);
                        const hasReflection = Boolean(session.reflection && session.reflection.trim().length > 0);

                        return (
                            <li key={session.id} className="hover:bg-muted/40 transition-colors">
                                <button
                                    type="button"
                                    onClick={() => onSelectSession(session)}
                                    className="w-full text-left grid gap-4 p-4 items-center md:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr]"
                                >
                                    <div>
                                        <p className="font-semibold text-primary">{session.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                                        {editDescriptor && (
                                            <p className="text-xs text-muted-foreground mt-1">Edited {editDescriptor}</p>
                                        )}
                                        {hasReflection && (
                                            <p className="text-xs text-muted-foreground mt-2 italic">"{session.reflection}"</p>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Exec %</p>
                                        <p className="font-bold text-lg text-foreground">{calculateExecutionPercentage(session.sets)}%</p>
                                    </div>
                                    <div className={`text-center px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                        {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-sm">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${hasReflection ? 'bg-secondary/15 text-secondary' : 'text-muted-foreground'}`}>
                                            <NoteIcon filled={hasReflection} className={hasReflection ? 'text-secondary' : 'text-muted-foreground'} />
                                            {hasReflection ? 'Reflection' : 'No notes'}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        );
                    }) : (
                        <p className="text-center text-muted-foreground p-6">You have not completed any sessions yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

const SessionEditForm: React.FC<{
    session: Session;
    onSubmit: (updates: { name: string; sets: SetResult[]; reflection?: string }) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    errorMessage?: string | null;
}> = ({ session, onSubmit, onCancel, isSaving, errorMessage }) => {
    const [sessionName, setSessionName] = useState(session.name);
    const [reflection, setReflection] = useState(session.reflection ?? '');
    const [editableSets, setEditableSets] = useState<SetResult[]>(() => session.sets.map(set => ({ ...set })));

    useEffect(() => {
        setSessionName(session.name);
        setReflection(session.reflection ?? '');
        setEditableSets(session.sets.map(set => ({ ...set })));
    }, [session]);

    const updateSet = <K extends keyof SetResult>(index: number, field: K, value: SetResult[K]) => {
        setEditableSets(prev => prev.map((set, idx) => idx === index ? { ...set, [field]: value } : set));
    };

    const removeSet = (index: number) => {
        if (editableSets.length === 1) return;
        setEditableSets(prev => prev.filter((_, idx) => idx !== index).map((set, idx) => ({ ...set, setNumber: idx + 1 })));
    };

    const addSet = () => {
        const last = editableSets[editableSets.length - 1];
        const fallbackDrillType = last?.drillType ?? (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);
        const newSet: SetResult = {
            setNumber: editableSets.length + 1,
            repsAttempted: last?.repsAttempted ?? 10,
            repsExecuted: last?.repsExecuted ?? 0,
            hardHits: last?.hardHits ?? 0,
            strikeouts: last?.strikeouts ?? 0,
            grade: last?.grade ?? 5,
            notes: '',
            drillLabel: last?.drillLabel ?? session.name,
            drillType: fallbackDrillType,
        };
        setEditableSets(prev => [...prev, newSet]);
    };

    const clampNumber = (value: number) => (Number.isNaN(value) ? 0 : value);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedSets = editableSets.map((set, idx) => {
            const repsAttempted = Math.max(0, clampNumber(Number(set.repsAttempted)));
            const repsExecuted = Math.min(repsAttempted, Math.max(0, clampNumber(Number(set.repsExecuted))));
            const hardHits = Math.min(repsExecuted, Math.max(0, clampNumber(Number(set.hardHits))));
            const strikeouts = Math.min(repsAttempted, Math.max(0, clampNumber(Number(set.strikeouts))));
            const grade = Math.min(10, Math.max(1, clampNumber(Number(set.grade ?? 5))));
            const drillLabel = set.drillLabel?.trim();
            return {
                ...set,
                setNumber: idx + 1,
                repsAttempted,
                repsExecuted,
                hardHits,
                strikeouts,
                grade,
                notes: set.notes?.trim(),
                drillLabel: drillLabel ? drillLabel : undefined,
            };
        });

        await onSubmit({
            name: sessionName.trim() || session.name,
            sets: normalizedSets,
            reflection: reflection.trim(),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Session Title</label>
                <input
                    type="text"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full border border-border rounded-lg bg-background p-3 focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
            </div>

            <div className="space-y-4">
                {editableSets.map((set, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-muted-foreground">Set {index + 1}</h4>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => removeSet(index)}
                                    disabled={editableSets.length === 1}
                                    className="text-xs font-semibold px-3 py-1 rounded-full border border-border text-muted-foreground disabled:opacity-40"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Reps Attempted</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.repsAttempted}
                                    onChange={e => updateSet(index, 'repsAttempted', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Reps Executed</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.repsExecuted}
                                    onChange={e => updateSet(index, 'repsExecuted', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Hard Hits</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.hardHits}
                                    onChange={e => updateSet(index, 'hardHits', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Strikeouts</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.strikeouts}
                                    onChange={e => updateSet(index, 'strikeouts', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Grade (1-10)</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={set.grade ?? 5}
                                    onChange={e => updateSet(index, 'grade', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Drill / Focus</span>
                                <input
                                    type="text"
                                    value={set.drillLabel || ''}
                                    onChange={e => updateSet(index, 'drillLabel', e.target.value)}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Drill Type</span>
                                <select
                                    value={set.drillType || ''}
                                    onChange={e => updateSet(index, 'drillType', (e.target.value || undefined) as DrillType | undefined)}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                >
                                    <option value="">Not set</option>
                                    {DRILL_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Notes (optional)</label>
                            <textarea
                                value={set.notes ?? ''}
                                onChange={e => updateSet(index, 'notes', e.target.value)}
                                className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm"
                                placeholder="Remind yourself what happened in this set."
                            />
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addSet}
                    className="text-sm font-semibold text-secondary underline"
                >
                    + Add another set
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Reflection</label>
                <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    className="w-full min-h-[120px] border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    placeholder="Capture any cues, adjustments, or next steps."
                />
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-border text-muted-foreground disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-sm font-bold rounded-lg bg-secondary text-secondary-foreground disabled:opacity-60"
                >
                    {isSaving ? 'Saving…' : 'Save changes'}
                </button>
            </div>
        </form>
    );
};

const KPICard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
);

const JoinTeam: React.FC = () => {
    const { currentUser, joinTeamAsPlayer } = useContext(DataContext)!;
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!code) {
            setError('Please enter a team code.');
            setLoading(false);
            return;
        }
        try {
            await joinTeamAsPlayer(code.toUpperCase());
        } catch (err) {
            setError((err as Error).message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-foreground">Join a Team</h1>
                <p className="text-muted-foreground">You're not on a team yet. Enter a code from your coach to join.</p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    <input
                        type="text"
                        placeholder="Enter Team Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm uppercase tracking-widest text-center font-mono"
                    />
                    <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-semibold disabled:opacity-50">
                        {loading ? 'Joining...' : 'Join Team'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export const PlayerView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const { 
        currentUser, 
        getAssignedDrillsForPlayerToday, 
        getSessionsForPlayer,
        getSessionsForTeam,
        getDrillsForTeam,
        getGoalsForPlayer,
        getTeamGoals,
        logSession,
        updateSession,
        getTeamsForPlayer,
        joinTeamAsPlayer,
    } = useContext(DataContext)!;

    const [drillToLog, setDrillToLog] = useState<Drill | null>(null);
    const [lastSavedSession, setLastSavedSession] = useState<Session | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [logSessionError, setLogSessionError] = useState<string | null>(null);
    const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
    const [isUpdatingSession, setIsUpdatingSession] = useState(false);
    const [sessionUpdateError, setSessionUpdateError] = useState<string | null>(null);

    const player = currentUser as Player;
    const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(player.teamIds[0]);
    const playerTeams = useMemo(() => getTeamsForPlayer(player.id), [player.id, getTeamsForPlayer]);
    const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
    const [teamCodeInput, setTeamCodeInput] = useState('');
    const [teamJoinStatus, setTeamJoinStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isJoiningTeam, setIsJoiningTeam] = useState(false);

    useEffect(() => {
        if (player.teamIds.length === 0) {
            setSelectedTeamId(undefined);
            return;
        }
        if (!selectedTeamId || !player.teamIds.includes(selectedTeamId)) {
            setSelectedTeamId(player.teamIds[0]);
        }
    }, [player.teamIds, selectedTeamId]);

    const handleJoinTeam = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedCode = teamCodeInput.trim();
        if (!trimmedCode) {
            setTeamJoinStatus({ type: 'error', message: 'Enter the team code to join.' });
            return;
        }
        setIsJoiningTeam(true);
        setTeamJoinStatus(null);
        try {
            await joinTeamAsPlayer(trimmedCode.toUpperCase());
            setTeamCodeInput('');
            setTeamJoinStatus({ type: 'success', message: 'Team added! Switch to it via Manage Teams.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to join team. Please try again.';
            setTeamJoinStatus({ type: 'error', message });
        } finally {
            setIsJoiningTeam(false);
        }
    };

    const handleSelectTeam = (teamId: string) => {
        setSelectedTeamId(teamId);
        setIsManageTeamsOpen(false);
    };

    const assignedDrills = useMemo(() => (selectedTeamId ? getAssignedDrillsForPlayerToday(player.id, selectedTeamId) : []), [player.id, selectedTeamId, getAssignedDrillsForPlayerToday]);
    const sessions = useMemo(() => getSessionsForPlayer(player.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [player.id, getSessionsForPlayer]);
    const teamSessions = useMemo(() => (selectedTeamId ? getSessionsForTeam(selectedTeamId) : []), [selectedTeamId, getSessionsForTeam]);
    const allTeamDrills = useMemo(() => (selectedTeamId ? getDrillsForTeam(selectedTeamId) : []), [selectedTeamId, getDrillsForTeam]);
    const goals = useMemo(() => getGoalsForPlayer(player.id), [player.id, getGoalsForPlayer]);
    const teamGoals = useMemo(() => (selectedTeamId ? getTeamGoals(selectedTeamId) : []), [selectedTeamId, getTeamGoals]);


    const handleStartAssignedSession = (drill: Drill) => {
        setLogSessionError(null);
        setDrillToLog(drill);
        setCurrentView('log_session');
    };
    
    const handleStartAdHocSession = () => {
        setLogSessionError(null);
        setDrillToLog(null);
        setCurrentView('log_session');
    };

    const handleCancelLogSession = () => {
        setLogSessionError(null);
        setIsSavingSession(false);
        setCurrentView('dashboard');
    }

    const handleLogSession = async (sessionData: { name: string; drillId?: string; sets: SetResult[]; reflection?: string }) => {
        if (!selectedTeamId) {
            setLogSessionError('Join a team before logging sessions.');
            return;
        }

        setIsSavingSession(true);
        setLogSessionError(null);

        try {
            const newSession = await logSession({
                ...sessionData,
                playerId: player.id,
            teamId: selectedTeamId,
                date: new Date().toISOString(),
            });

            if (newSession) {
                setLastSavedSession(newSession);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this session. Please try again.';
            setLogSessionError(message);
        } finally {
            setIsSavingSession(false);
        }
    };
    
    const handleCloseAnimation = () => {
        setLastSavedSession(null);
        setLogSessionError(null);
        setCurrentView('dashboard');
    };

    const handleOpenSessionEditor = (session: Session) => {
        setSessionUpdateError(null);
        setSessionToEdit(session);
    };

    const handleCloseSessionEditor = () => {
        if (isUpdatingSession) return;
        setSessionToEdit(null);
        setSessionUpdateError(null);
    };

    const handleSaveSessionEdits = async (updates: { name: string; sets: SetResult[]; reflection?: string }) => {
        if (!sessionToEdit) return;
        setIsUpdatingSession(true);
        setSessionUpdateError(null);
        try {
            await updateSession(sessionToEdit.id, updates);
            setSessionToEdit(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to update this session. Please try again.';
            setSessionUpdateError(message);
        } finally {
            setIsUpdatingSession(false);
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Log Session', icon: <PencilIcon />, view: 'log_session' },
        { name: 'History', icon: <ClipboardListIcon />, view: 'history' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
        { name: 'Profile', icon: <ProfileIcon />, view: 'profile' },
    ];
    
     const pageTitles: { [key: string]: string } = {
        dashboard: `Welcome, ${player.name.split(' ')[0]}!`,
        log_session: drillToLog ? `Log: ${drillToLog.name}` : 'Log Ad-Hoc Session',
        history: 'My Session History',
        analytics: 'My Analytics',
        profile: 'Profile'
    };
    
    const analyticsData = useMemo(() => {
        const chronoSessions = [...sessions].reverse();
        const allSets = sessions.flatMap(s => s.sets);

        const kpi = {
            execPct: calculateExecutionPercentage(allSets),
            hardHitPct: calculateHardHitPercentage(allSets),
            contactPct: 100 - calculateStrikeoutPercentage(allSets),
        };

        const performanceOverTimeData = chronoSessions.map(s => ({
            name: formatDate(s.date, { month: 'short', day: 'numeric' }),
            'Execution %': calculateExecutionPercentage(s.sets),
            'Hard Hit %': calculateHardHitPercentage(s.sets),
        }));
        
        const drillSuccessMap = new Map<string, { success: number, total: number }>();
        sessions.forEach(session => {
            const drill = allTeamDrills.find(d => d.id === session.drillId);
            if (drill) {
                const { isSuccess } = getSessionGoalProgress(session, drill);
                const entry = drillSuccessMap.get(drill.name) || { success: 0, total: 0 };
                entry.total++;
                if (isSuccess) entry.success++;
                drillSuccessMap.set(drill.name, entry);
            }
        });
        const drillSuccessData = Array.from(drillSuccessMap.entries()).map(([name, data]) => ({
            name,
            'Success Rate': data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
        }));
        
        const byDrillType: { [key in DrillType]?: { executed: number, attempted: number } } = {};
        const byPitchType: { [key in PitchType]?: { executed: number, attempted: number } } = {};
        const byCount: { [key in CountSituation]: { executed: number, attempted: number } } = { 'Ahead': { executed: 0, attempted: 0 }, 'Even': { executed: 0, attempted: 0 }, 'Behind': { executed: 0, attempted: 0 } };
        const byZone: { [key in TargetZone]?: { executed: number, attempted: number } } = {};

        sessions.forEach(session => {
            const drill = session.drillId ? allTeamDrills.find(d => d.id === session.drillId) : undefined;
            const sessionDrillType = drill?.drillType || (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);

            session.sets.forEach(set => {
                const focusType = set.drillType || sessionDrillType;
                if (focusType) {
                    if (!byDrillType[focusType]) byDrillType[focusType] = { executed: 0, attempted: 0 };
                    byDrillType[focusType]!.executed += set.repsExecuted;
                    byDrillType[focusType]!.attempted += set.repsAttempted;
                }

                const situation = set.countSituation || 'Even';
                byCount[situation].executed += set.repsExecuted;
                byCount[situation].attempted += set.repsAttempted;

                if (set.pitchTypes && set.pitchTypes.length > 0) {
                    const repsPerType = set.repsAttempted / set.pitchTypes.length;
                    const execPerType = set.repsExecuted / set.pitchTypes.length;
                    set.pitchTypes.forEach(pitch => {
                        if (!byPitchType[pitch]) byPitchType[pitch] = { executed: 0, attempted: 0 };
                        byPitchType[pitch]!.executed += execPerType;
                        byPitchType[pitch]!.attempted += repsPerType;
                    });
                }

                if (set.targetZones && set.targetZones.length > 0) {
                    const repsPerZone = set.repsAttempted / set.targetZones.length;
                    const execPerZone = set.repsExecuted / set.targetZones.length;
                    set.targetZones.forEach(zone => {
                        if (!byZone[zone]) byZone[zone] = { executed: 0, attempted: 0 };
                        byZone[zone]!.executed += execPerZone;
                        byZone[zone]!.attempted += repsPerZone;
                    });
                }
            });
        });

        const calculateBreakdownData = (data: { [key: string]: { executed: number, attempted: number } | undefined }) => {
            return Object.entries(data)
                .map(([name, values]) => ({
                    name,
                    reps: Math.round(values!.attempted),
                    execution: values!.attempted > 0 ? Math.round((values!.executed / values!.attempted) * 100) : 0,
                }))
                .filter(item => item.reps > 0)
                .sort((a, b) => b.execution - a.execution);
        };
        
        const byDrillTypeData = calculateBreakdownData(byDrillType);
        const byPitchTypeData = calculateBreakdownData(byPitchType);
        const byCountData = calculateBreakdownData(byCount);
        const byZoneData = calculateBreakdownData(byZone).map(d => ({...d, zone: d.name as TargetZone, topPlayers: []}));
        
        return { kpi, performanceOverTimeData, drillSuccessData, byDrillTypeData, byPitchTypeData, byCountData, byZoneData };
    }, [sessions, allTeamDrills]);

    if (!selectedTeamId) {
        return <JoinTeam />;
    }

    const headerContent = (
        <div className="flex flex-wrap gap-3">
            {currentView === 'dashboard' && (
                <button 
                    onClick={handleStartAdHocSession} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm shadow-sm transition-transform hover:scale-105"
                >
                    Start Ad-Hoc Session
                </button>
            )}
            <button
                onClick={() => setIsManageTeamsOpen(true)}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm"
            >
                Manage Teams
            </button>
        </div>
    );

    const renderContent = () => {
        switch(currentView) {
            case 'dashboard':
                return <PlayerDashboard 
                    player={player}
                    assignedDrills={assignedDrills}
                    recentSessions={sessions}
                    drills={allTeamDrills}
                    goals={goals}
                    teamGoals={teamGoals}
                    teamSessions={teamSessions}
                    onStartAssignedSession={handleStartAssignedSession}
                    activeTeamId={selectedTeamId}
                />;
            case 'log_session':
                return (
                    <LogSession
                        assignedDrill={drillToLog}
                        onSave={handleLogSession}
                        onCancel={handleCancelLogSession}
                        isSaving={isSavingSession}
                        errorMessage={logSessionError}
                    />
                );
            case 'history':
                return <SessionHistory sessions={sessions} drills={allTeamDrills} onSelectSession={handleOpenSessionEditor} />;
            case 'analytics':
                 return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 flex flex-col gap-4">
                                <KPICard title="Overall Execution %" value={`${analyticsData.kpi.execPct}%`} description="Successfully executed reps vs. total reps." />
                                <KPICard title="Overall Hard Hit %" value={`${analyticsData.kpi.hardHitPct}%`} description="Percentage of reps hit hard." />
                                <KPICard title="Overall Contact %" value={`${analyticsData.kpi.contactPct}%`} description="Percentage of reps without a strikeout." />
                            </div>
                            <div className="lg:col-span-2">
                                <PlayerRadarChart sessions={sessions} playerName={player.name} />
                            </div>
                        </div>

                        <AnalyticsCharts 
                            performanceOverTimeData={analyticsData.performanceOverTimeData}
                            drillSuccessData={analyticsData.drillSuccessData}
                        />

                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Performance Breakdowns</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                                <div className="lg:col-span-1">
                                    <StrikeZoneHeatmap data={analyticsData.byZoneData} battingSide={player.profile.bats} />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Drill Type</h3>
                                        <div className="space-y-4">
                                            {analyticsData.byDrillTypeData.length > 0 ? analyticsData.byDrillTypeData.map(d => <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} />) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Pitch Type</h3>
                                        <div className="space-y-4">
                                            {analyticsData.byPitchTypeData.length > 0 ? analyticsData.byPitchTypeData.map(d => <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-accent" />) : <p className="text-muted-foreground text-center py-4">Log pitch types to see this breakdown.</p>}
                                        </div>
                                    </div>
                                     <div className="bg-card border border-border p-4 rounded-lg shadow-sm md:col-span-2">
                                        <h3 className="text-lg font-bold text-primary mb-4">By Count</h3>
                                        <div className="space-y-4">
                                            {analyticsData.byCountData.length > 0 ? analyticsData.byCountData.map(d => <BreakdownBar key={d.name} label={d.name} reps={d.reps} percentage={d.execution} colorClass="bg-secondary" />) : <p className="text-muted-foreground text-center py-4">No data available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return <ProfileTab />;
            default:
                return null;
        }
    };

    return (
        <>
            <Dashboard 
                navItems={navItems} 
                currentView={currentView} 
                setCurrentView={setCurrentView}
                pageTitle={pageTitles[currentView]}
                headerContent={headerContent}
            >
                {renderContent()}
            </Dashboard>
            <Modal
                isOpen={!!sessionToEdit}
                onClose={handleCloseSessionEditor}
                title={sessionToEdit ? `Edit ${sessionToEdit.name}` : 'Edit Session'}
            >
                {sessionToEdit && (
                    <SessionEditForm
                        session={sessionToEdit}
                        onSubmit={handleSaveSessionEdits}
                        onCancel={handleCloseSessionEditor}
                        isSaving={isUpdatingSession}
                        errorMessage={sessionUpdateError}
                    />
                )}
            </Modal>
            <Modal
                isOpen={isManageTeamsOpen}
                onClose={() => {
                    setIsManageTeamsOpen(false);
                    setTeamJoinStatus(null);
                }}
                title="Manage Teams"
            >
                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Your Teams</p>
                        {playerTeams.length > 0 ? (
                            <div className="space-y-3">
                                {playerTeams.map((team) => (
                                    <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 bg-card">
                                        <div>
                                            <p className="font-semibold text-foreground">{team.name}</p>
                                            <p className="text-xs text-muted-foreground">Season {team.seasonYear}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSelectTeam(team.id)}
                                            className={`text-sm font-semibold px-3 py-1 rounded-md transition ${selectedTeamId === team.id ? 'bg-secondary/20 text-secondary' : 'bg-muted hover:bg-muted/70'}`}
                                            disabled={selectedTeamId === team.id}
                                        >
                                            {selectedTeamId === team.id ? 'Viewing' : 'View Team'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">You are not on any teams yet.</p>
                        )}
                    </div>

                    <form onSubmit={handleJoinTeam} className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Join another team</p>
                        <input
                            type="text"
                            value={teamCodeInput}
                            onChange={(e) => setTeamCodeInput(e.target.value)}
                            placeholder="Enter team code"
                            className="w-full bg-background border border-input rounded-md py-2 px-3 text-sm uppercase tracking-[0.25em]"
                        />
                        {teamJoinStatus && (
                            <p className={`text-sm ${teamJoinStatus.type === 'success' ? 'text-success' : 'text-destructive'}`}>{teamJoinStatus.message}</p>
                        )}
                        <button
                            type="submit"
                            disabled={isJoiningTeam}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm transition"
                        >
                            {isJoiningTeam ? 'Joining...' : 'Join Team'}
                        </button>
                    </form>
                </div>
            </Modal>
            <SessionSaveAnimation session={lastSavedSession} onClose={handleCloseAnimation} />
        </>
    );
};
