import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { HomeIcon } from './icons/HomeIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { PencilIcon } from './icons/PencilIcon';
import { Drill, Session, SetResult, Player, DrillType, TargetZone, PitchType, CountSituation, BaseRunner, PersonalGoal, GoalType, TeamGoal } from '../types';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, getCurrentMetricValue, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName } from '../utils/helpers';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, DRILL_TYPES, GOAL_TYPES } from '../constants';
import { PlayerRadarChart } from './PlayerRadarChart';
import { Modal } from './Modal';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { SessionSaveAnimation } from './SessionSaveAnimation';

const GoalProgress: React.FC<{ goal: PersonalGoal; sessions: Session[], drills: Drill[], onDelete: (goalId: string) => Promise<void>; }> = ({ goal, sessions, drills, onDelete }) => {
    const currentValue = getCurrentMetricValue(goal, sessions, drills);
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

    return (
        <div className="bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-sm">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-semibold text-card-foreground">{formatGoalName(goal)}</h4>
                    <p className="text-xs text-muted-foreground">Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
                </div>
                <button
                    onClick={handleDelete}
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
}> = ({ player, assignedDrills, recentSessions, drills, goals, teamGoals, teamSessions, onStartAssignedSession }) => {
    
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const { createGoal, deleteGoal } = useContext(DataContext)!;
    const teamId = player.teamIds.length > 0 ? player.teamIds[0] : undefined;
    const [goalFormError, setGoalFormError] = useState<string | null>(null);
    const [goalListError, setGoalListError] = useState<string | null>(null);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    
    const overallExecutionPct = useMemo(() => {
        const allSets = recentSessions.flatMap(s => s.sets);
        if (allSets.length === 0) return 0;
        return calculateExecutionPercentage(allSets);
    }, [recentSessions]);

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

    const handleTargetZoneSelect = (zone: TargetZone) => {
        setTargetZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
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
    onSave: (sessionData: { name: string; drillId?: string; sets: SetResult[] }) => Promise<void>;
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

    const handleMultiSelect = <T extends string>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) => {
        if (isAssigned) return;
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };
    
    const handleAddSet = () => {
        const setWithContext: SetResult = {
            ...currentSet,
            targetZones, pitchTypes, outs, countSituation: count, baseRunners: runners,
        };
        const newLoggedSets = [...loggedSets, setWithContext];
        setLoggedSets(newLoggedSets);
        setCurrentSet({ ...initialSet, setNumber: newLoggedSets.length + 1 });
    };

    const handleSaveSession = async () => {
        if (isSaving) return;
        const finalSets = loggedSets.length > 0 ? loggedSets : [{...currentSet, targetZones, pitchTypes, outs, countSituation: count, baseRunners: runners}];
        await onSave({
            drillId: assignedDrill?.id,
            name: assignedDrill?.name || drillType,
            sets: finalSets,
        });
    };

    const Stepper: React.FC<{label: string, value: number, onChange: (val: number) => void, max?: number, readOnly?: boolean}> = ({label, value, onChange, max, readOnly}) => (
        <div className="text-center">
            <label className="text-sm font-semibold text-muted-foreground">{label}</label>
            <div className="flex items-center justify-center gap-3 mt-2">
                <button type="button" disabled={readOnly} onClick={() => onChange(Math.max(0, value - 1))} className="w-10 h-10 rounded-full bg-muted text-lg font-bold disabled:opacity-50">-</button>
                <span className="text-2xl font-bold text-foreground w-12 text-center">{value}</span>
                <button type="button" disabled={readOnly} onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))} className="w-10 h-10 rounded-full bg-muted text-lg font-bold disabled:opacity-50">+</button>
            </div>
        </div>
    );
    
    const totalReps = loggedSets.reduce((sum, s) => sum + s.repsAttempted, 0);
    const totalExec = loggedSets.reduce((sum, s) => sum + s.repsExecuted, 0);

    return (
        <div className="space-y-6">
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
                 <h3 className="font-semibold text-muted-foreground mb-2">Log Set #{currentSet.setNumber}</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Stepper label="Reps" value={currentSet.repsAttempted} onChange={(v) => setCurrentSet(s=>({...s, repsAttempted: v}))} readOnly={isAssigned}/>
                     <Stepper label="Executions" value={currentSet.repsExecuted} onChange={(v) => setCurrentSet(s=>({...s, repsExecuted: v}))} max={currentSet.repsAttempted} />
                     <Stepper label="Hard Hits" value={currentSet.hardHits} onChange={(v) => setCurrentSet(s=>({...s, hardHits: v}))} max={currentSet.repsAttempted}/>
                     <Stepper label="Strikeouts" value={currentSet.strikeouts} onChange={(v) => setCurrentSet(s=>({...s, strikeouts: v}))} max={currentSet.repsAttempted}/>
                 </div>
                 <div className="pt-4">
                    <label className="text-sm font-semibold text-muted-foreground">Grade Your Set ({currentSet.grade})</label>
                    <input type="range" min="1" max="10" value={currentSet.grade} onChange={e => setCurrentSet(s=>({...s, grade: parseInt(e.target.value)}))} className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer mt-2"/>
                 </div>
                 <button onClick={handleAddSet} className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-2 px-4 rounded-lg text-sm">+ Add Set</button>
            </div>
            
             {loggedSets.length > 0 && (
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-muted-foreground mb-2">Session Summary ({totalExec}/{totalReps})</h3>
                     <ul className="divide-y divide-border">
                        {loggedSets.map((s, i) => (
                           <li key={i} className="py-2 flex justify-between items-center text-sm">
                               <span className="font-bold">Set {s.setNumber}</span>
                               <span>Reps: {s.repsAttempted}</span>
                               <span>Exec: {s.repsExecuted}</span>
                               <span>HH: {s.hardHits}</span>
                               <span>Grade: {s.grade}</span>
                           </li>
                        ))}
                    </ul>
                </div>
             )}

            {errorMessage && (
                <div className="text-center text-sm text-destructive">
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

const SessionHistory: React.FC<{ sessions: Session[]; drills: Drill[]; }> = ({ sessions, drills }) => {
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

                        return (
                            <li key={session.id} className="p-4 grid grid-cols-3 items-center gap-4">
                                <div className="col-span-1">
                                    <p className="font-semibold text-primary">{session.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Exec %</p>
                                    <p className="font-bold text-lg text-foreground">{calculateExecutionPercentage(session.sets)}%</p>
                                </div>
                                <div className={`text-center px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                    {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                </div>
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

const KPICard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
);

const JoinTeam: React.FC = () => {
    const { currentUser, joinTeamWithCode } = useContext(DataContext)!;
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
            await joinTeamWithCode(code.toUpperCase(), currentUser!.id);
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
        logSession
    } = useContext(DataContext)!;

    const [drillToLog, setDrillToLog] = useState<Drill | null>(null);
    const [lastSavedSession, setLastSavedSession] = useState<Session | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [logSessionError, setLogSessionError] = useState<string | null>(null);

    const player = currentUser as Player;
    const teamId = player.teamIds.length > 0 ? player.teamIds[0] : undefined; 

    const assignedDrills = useMemo(() => teamId ? getAssignedDrillsForPlayerToday(player.id, teamId) : [], [player.id, teamId, getAssignedDrillsForPlayerToday]);
    const sessions = useMemo(() => getSessionsForPlayer(player.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [player.id, getSessionsForPlayer]);
    const teamSessions = useMemo(() => teamId ? getSessionsForTeam(teamId) : [], [teamId, getSessionsForTeam]);
    const allTeamDrills = useMemo(() => teamId ? getDrillsForTeam(teamId) : [], [teamId, getDrillsForTeam]);
    const goals = useMemo(() => getGoalsForPlayer(player.id), [player.id, getGoalsForPlayer]);
    const teamGoals = useMemo(() => teamId ? getTeamGoals(teamId) : [], [teamId, getTeamGoals]);


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

    const handleLogSession = async (sessionData: { name: string; drillId?: string; sets: SetResult[] }) => {
        if (!teamId) {
            setLogSessionError('Join a team before logging sessions.');
            return;
        }

        setIsSavingSession(true);
        setLogSessionError(null);

        try {
            const newSession = await logSession({
                ...sessionData,
                playerId: player.id,
                teamId: teamId,
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

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Log Session', icon: <PencilIcon />, view: 'log_session' },
        { name: 'History', icon: <ClipboardListIcon />, view: 'history' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
    ];
    
     const pageTitles: { [key: string]: string } = {
        dashboard: `Welcome, ${player.name.split(' ')[0]}!`,
        log_session: drillToLog ? `Log: ${drillToLog.name}` : 'Log Ad-Hoc Session',
        history: 'My Session History',
        analytics: 'My Analytics'
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
            let drillType: DrillType | undefined;
            if (session.drillId) {
                const drill = allTeamDrills.find(d => d.id === session.drillId);
                drillType = drill?.drillType;
            } else if (DRILL_TYPES.includes(session.name as DrillType)) {
                drillType = session.name as DrillType;
            }

            session.sets.forEach(set => {
                if (drillType) {
                    if (!byDrillType[drillType]) byDrillType[drillType] = { executed: 0, attempted: 0 };
                    byDrillType[drillType]!.executed += set.repsExecuted;
                    byDrillType[drillType]!.attempted += set.repsAttempted;
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

    if (!teamId) {
        return <JoinTeam />;
    }

    const headerContent = currentView === 'dashboard' ? (
        <button 
            onClick={handleStartAdHocSession} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm shadow-sm transition-transform hover:scale-105"
        >
            Start Ad-Hoc Session
        </button>
    ) : null;

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
                return <SessionHistory sessions={sessions} drills={allTeamDrills} />;
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
            <SessionSaveAnimation session={lastSavedSession} onClose={handleCloseAnimation} />
        </>
    );
};
