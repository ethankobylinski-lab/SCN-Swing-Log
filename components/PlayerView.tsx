import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { HomeIcon } from './icons/HomeIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { PencilIcon } from './icons/PencilIcon';
import { Drill, Session, SetResult, Player, DrillType, TargetZone, PitchType, CountSituation, BaseRunner } from '../types';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage } from '../utils/helpers';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, DRILL_TYPES } from '../constants';


const PlayerDashboard: React.FC<{
    player: Player;
    assignedDrills: Drill[];
    recentSessions: Session[];
    drills: Drill[];
    onStartAssignedSession: (drill: Drill) => void;
    onStartAdHocSession: () => void;
}> = ({ player, assignedDrills, recentSessions, drills, onStartAssignedSession, onStartAdHocSession }) => {
    
    const overallExecutionPct = useMemo(() => {
        const allSets = recentSessions.flatMap(s => s.sets);
        if (allSets.length === 0) return 0;
        return calculateExecutionPercentage(allSets);
    }, [recentSessions]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-neutral dark:text-white mb-2">Welcome back, {player.name.split(' ')[0]}!</h1>
                    <p className="text-gray-400">Here's what's on your plate for today.</p>
                </div>
                <button 
                    onClick={onStartAdHocSession} 
                    className="mt-4 sm:mt-0 w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-transform hover:scale-105"
                >
                    Start Ad-Hoc Session
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Drills for Today</h3>
                    <p className="text-4xl font-bold text-primary">{assignedDrills.length}</p>
                </div>
                <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Overall Execution %</h3>
                    <p className="text-4xl font-bold text-primary">{overallExecutionPct}%</p>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-bold text-neutral dark:text-white mb-4">Today's Drills</h2>
                {assignedDrills.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedDrills.map(drill => (
                            <div key={drill.id} className="bg-white dark:bg-dark-base-200 p-4 rounded-xl shadow-md flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-primary">{drill.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1 mb-3">{drill.description}</p>
                                    <p className="text-xs text-gray-300"><strong>Goal:</strong> {drill.goalType} &gt;= {drill.goalTargetValue}{drill.goalType.includes('%') ? '%' : ''}</p>
                                </div>
                                <button onClick={() => onStartAssignedSession(drill)} className="w-full mt-4 bg-secondary hover:bg-secondary/90 text-white font-bold py-2 px-4 rounded-lg text-sm">
                                    Start Session
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center text-gray-400">
                        <p>No drills assigned for today. Great job staying on top of your work!</p>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xl font-bold text-neutral dark:text-white mb-4">Recent Activity</h2>
                <div className="bg-white dark:bg-dark-base-200 p-4 rounded-xl shadow-md">
                     <ul className="divide-y divide-base-200 dark:divide-dark-base-300">
                        {recentSessions.slice(0, 5).map(session => {
                             const drill = drills.find(d => d.id === session.drillId);
                             const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: true };
                             const goalType = drill ? drill.goalType : "Exec %";

                            return (
                                <li key={session.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-neutral dark:text-gray-200">Completed <span className="text-primary font-bold">{session.name}</span></p>
                                        <p className="text-sm text-gray-400">{formatDate(session.date)}</p>
                                    </div>
                                    <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                    </div>
                                </li>
                            )
                        })}
                        {recentSessions.length === 0 && <p className="text-gray-400 text-center py-4">No sessions logged yet.</p>}
                    </ul>
                </div>
            </div>

        </div>
    );
};

const LogSession: React.FC<{
    assignedDrill: Drill | null;
    onSave: (sessionData: { name: string; drillId?: string; sets: SetResult[] }) => void;
    onCancel: () => void;
}> = ({ assignedDrill, onSave, onCancel }) => {
    
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

    const handleSaveSession = () => {
        const finalSets = loggedSets.length > 0 ? loggedSets : [{...currentSet, targetZones, pitchTypes, outs, countSituation: count, baseRunners: runners}];
        onSave({
            drillId: assignedDrill?.id,
            name: assignedDrill?.name || drillType,
            sets: finalSets,
        });
    };

    const Stepper: React.FC<{label: string, value: number, onChange: (val: number) => void, max?: number, readOnly?: boolean}> = ({label, value, onChange, max, readOnly}) => (
        <div className="text-center">
            <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</label>
            <div className="flex items-center justify-center gap-3 mt-2">
                <button type="button" disabled={readOnly} onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-full bg-base-200 dark:bg-dark-base-300 text-lg font-bold disabled:opacity-50">-</button>
                <span className="text-2xl font-bold text-neutral dark:text-white w-10">{value}</span>
                <button type="button" disabled={readOnly} onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))} className="w-8 h-8 rounded-full bg-base-200 dark:bg-dark-base-300 text-lg font-bold disabled:opacity-50">+</button>
            </div>
        </div>
    );
    
    const totalReps = loggedSets.reduce((sum, s) => sum + s.repsAttempted, 0);
    const totalExec = loggedSets.reduce((sum, s) => sum + s.repsExecuted, 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-neutral dark:text-white">{isAssigned ? `Assigned Drill: ${assignedDrill.name}` : 'Log New Session'}</h1>
            
            <div className="bg-white dark:bg-dark-base-200 p-4 rounded-lg shadow-md space-y-4">
                {/* Drill Type */}
                <div>
                    <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Drill Type</h3>
                    <div className="flex flex-wrap gap-2">
                        {DRILL_TYPES.map(d => <button type="button" key={d} disabled={isAssigned} onClick={() => setDrillType(d)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${drillType === d ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300 disabled:opacity-70'}`}>{d}</button>)}
                    </div>
                </div>
                 {/* Target Zone & Pitch Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Target Zone (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {TARGET_ZONES.map(z => <button type="button" key={z} disabled={isAssigned} onClick={() => handleMultiSelect(setTargetZones, z)} className={`p-2 text-xs rounded-md ${targetZones.includes(z) ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300 disabled:opacity-70'}`}>{z}</button>)}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Pitch Type (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                           {PITCH_TYPES.map(p => <button type="button" key={p} disabled={isAssigned} onClick={() => handleMultiSelect(setPitchTypes, p)} className={`p-2 text-xs rounded-md ${pitchTypes.includes(p) ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300 disabled:opacity-70'}`}>{p}</button>)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-base-200 p-4 rounded-lg shadow-md space-y-4">
                <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Game Situation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Outs</label>
                        <div className="flex gap-2 mt-2">
                            {OUTS_OPTIONS.map(o => <button type="button" key={o} disabled={isAssigned} onClick={() => setOuts(o)} className={`flex-1 p-2 text-sm rounded-md ${outs === o ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300 disabled:opacity-70'}`}>{o}</button>)}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Count</label>
                        <select value={count} disabled={isAssigned} onChange={(e) => setCount(e.target.value as CountSituation)} className="mt-2 w-full bg-base-200 dark:bg-dark-base-300 border-none rounded-md py-2 px-3 text-sm disabled:opacity-70">
                            {COUNT_SITUATIONS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Base Runners</label>
                        <div className="flex gap-2 mt-2">
                            {BASE_RUNNERS.map(r => <button type="button" key={r} disabled={isAssigned} onClick={() => handleMultiSelect(setRunners, r)} className={`flex-1 p-2 text-sm rounded-md ${runners.includes(r) ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300 disabled:opacity-70'}`}>{r}</button>)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-dark-base-200 p-4 rounded-lg shadow-md space-y-4">
                 <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Log Set #{currentSet.setNumber}</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Stepper label="Reps" value={currentSet.repsAttempted} onChange={(v) => setCurrentSet(s=>({...s, repsAttempted: v}))} readOnly={isAssigned}/>
                     <Stepper label="Executions" value={currentSet.repsExecuted} onChange={(v) => setCurrentSet(s=>({...s, repsExecuted: v}))} max={currentSet.repsAttempted} />
                     <Stepper label="Hard Hits" value={currentSet.hardHits} onChange={(v) => setCurrentSet(s=>({...s, hardHits: v}))} max={currentSet.repsAttempted}/>
                     <Stepper label="Strikeouts" value={currentSet.strikeouts} onChange={(v) => setCurrentSet(s=>({...s, strikeouts: v}))} max={currentSet.repsAttempted}/>
                 </div>
                 <div className="pt-4">
                    <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Grade Your Set ({currentSet.grade})</label>
                    <input type="range" min="1" max="10" value={currentSet.grade} onChange={e => setCurrentSet(s=>({...s, grade: parseInt(e.target.value)}))} className="w-full h-2 bg-base-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                 </div>
                 <button onClick={handleAddSet} className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-2 px-4 rounded-lg text-sm">+ Add Set</button>
            </div>
            
             {loggedSets.length > 0 && (
                <div className="bg-white dark:bg-dark-base-200 p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Session Summary ({totalExec}/{totalReps})</h3>
                     <ul className="divide-y divide-base-200 dark:divide-dark-base-300">
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

            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="bg-base-200 hover:bg-base-300 text-neutral dark:text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                <button onClick={handleSaveSession} className="bg-secondary hover:bg-secondary/90 text-white font-bold py-2 px-6 rounded-lg">Save Session</button>
            </div>
        </div>
    );
};


const SessionHistory: React.FC<{ sessions: Session[]; drills: Drill[]; }> = ({ sessions, drills }) => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-neutral dark:text-white mb-6">My Session History</h1>
            <div className="bg-white dark:bg-dark-base-200 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-base-200 dark:divide-dark-base-300">
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
                                    <p className="text-sm text-gray-400">{formatDate(session.date)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-400">Exec %</p>
                                    <p className="font-bold text-lg text-neutral dark:text-white">{calculateExecutionPercentage(session.sets)}%</p>
                                </div>
                                <div className={`text-center px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                    {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                </div>
                            </li>
                        );
                    }) : (
                        <p className="text-center text-gray-400 p-6">You have not completed any sessions yet.</p>
                    )}
                </ul>
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
        getDrillsForTeam,
        logSession
    } = useContext(DataContext)!;

    const [drillToLog, setDrillToLog] = useState<Drill | null>(null);

    const player = currentUser as Player;
    const teamId = player.teamIds[0]; // Assuming player is on one team for simplicity

    const assignedDrills = useMemo(() => getAssignedDrillsForPlayerToday(player.id, teamId), [player.id, teamId, getAssignedDrillsForPlayerToday]);
    const sessions = useMemo(() => getSessionsForPlayer(player.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [player.id, getSessionsForPlayer]);
    const allTeamDrills = useMemo(() => getDrillsForTeam(teamId), [teamId, getDrillsForTeam]);

    const handleStartAssignedSession = (drill: Drill) => {
        setDrillToLog(drill);
        setCurrentView('log_session');
    };
    
    const handleStartAdHocSession = () => {
        setDrillToLog(null);
        setCurrentView('log_session');
    };

    const handleCancelLogSession = () => {
        setCurrentView('dashboard');
    }

    const handleLogSession = (sessionData: { name: string; drillId?: string; sets: SetResult[] }) => {
        logSession({
            ...sessionData,
            playerId: player.id,
            teamId: teamId,
            date: new Date().toISOString()
        });
        setCurrentView('dashboard');
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Log Session', icon: <PencilIcon />, view: 'log_session' },
        { name: 'History', icon: <ClipboardListIcon />, view: 'history' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
    ];
    
    const analyticsData = useMemo(() => {
        const reversedSessions = [...sessions].reverse();
        const executionData = reversedSessions.map(s => ({
            name: formatDate(s.date, { month: 'short', day: 'numeric' }),
            'Execution %': calculateExecutionPercentage(s.sets)
        }));

        const hardHitData = reversedSessions.map(s => ({
            name: formatDate(s.date, { month: 'short', day: 'numeric' }),
            'Hard Hit %': calculateHardHitPercentage(s.sets)
        }));
        
        const drillSuccessMap = new Map<string, { success: number, total: number }>();
        sessions.forEach(session => {
            const drill = allTeamDrills.find(d => d.id === session.drillId);
            if (drill) {
                const { isSuccess } = getSessionGoalProgress(session, drill);
                const entry = drillSuccessMap.get(drill.name) || { success: 0, total: 0 };
                entry.total++;
                if (isSuccess) {
                    entry.success++;
                }
                drillSuccessMap.set(drill.name, entry);
            }
        });

        const drillSuccessData = Array.from(drillSuccessMap.entries()).map(([name, data]) => ({
            name,
            'Success Rate': Math.round((data.success / data.total) * 100)
        }));
        
        return { playerExecutionData: executionData, drillSuccessData, hardHitData };
    }, [sessions, allTeamDrills]);

    const renderContent = () => {
        switch(currentView) {
            case 'dashboard':
                return <PlayerDashboard 
                    player={player}
                    assignedDrills={assignedDrills}
                    recentSessions={sessions}
                    drills={allTeamDrills}
                    onStartAssignedSession={handleStartAssignedSession}
                    onStartAdHocSession={handleStartAdHocSession}
                />;
            case 'log_session':
                return <LogSession assignedDrill={drillToLog} onSave={handleLogSession} onCancel={handleCancelLogSession} />;
            case 'history':
                return <SessionHistory sessions={sessions} drills={allTeamDrills} />;
            case 'analytics':
                 return (
                    <div>
                        <h1 className="text-2xl font-bold text-neutral dark:text-white mb-6">My Analytics</h1>
                        <AnalyticsCharts 
                            playerExecutionData={analyticsData.playerExecutionData}
                            drillSuccessData={analyticsData.drillSuccessData}
                            hardHitData={analyticsData.hardHitData}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dashboard 
            navItems={navItems} 
            currentView={currentView} 
            setCurrentView={setCurrentView}
        >
            {renderContent()}
        </Dashboard>
    );
};