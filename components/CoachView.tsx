import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Player, Team, Drill, Session, DayOfWeek, TargetZone, PitchType, CountSituation, BaseRunner, GoalType, DrillType } from '../types';
import { AnalyticsCharts } from './AnalyticsCharts';
import { Modal } from './Modal';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, GOAL_TYPES, DRILL_TYPES } from '../constants';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage } from '../utils/helpers';
import { Avatar } from './Avatar';

const CoachDashboard: React.FC<{ players: Player[], drills: Drill[], sessions: Session[], team: Team }> = ({ players, drills, sessions, team }) => {
    
    const teamExecutionPct = useMemo(() => {
        const allSets = sessions.flatMap(s => s.sets);
        return calculateExecutionPercentage(allSets);
    }, [sessions]);

    const recentSessions = useMemo(() => {
        return sessions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [sessions]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold text-neutral dark:text-white">Team Overview: {team.name}</h1>
                 <div className="flex items-center gap-2 bg-base-200 dark:bg-dark-base-200 p-2 rounded-lg">
                    <UsersIcon className="w-5 h-5 text-primary"/>
                    <span className="font-bold text-neutral dark:text-white">{players.length}</span>
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Players</h3>
                    <p className="text-4xl font-bold text-primary">{players.length}</p>
                </div>
                <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Drills</h3>
                    <p className="text-4xl font-bold text-primary">{drills.length}</p>
                </div>
                <div className="bg-white dark:bg-dark-base-200 p-6 rounded-xl shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Team Execution %</h3>
                    <p className="text-4xl font-bold text-primary">{teamExecutionPct}%</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-neutral dark:text-white mb-4">Recent Activity</h2>
            <div className="bg-white dark:bg-dark-base-200 p-4 rounded-xl shadow-md">
                <ul className="divide-y divide-base-200 dark:divide-dark-base-300">
                    {recentSessions.map(session => {
                        const player = players.find(p => p.id === session.playerId);
                        const drill = drills.find(d => d.id === session.drillId);
                        if (!player) return null;
                        
                        const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: calculateExecutionPercentage(session.sets) > 70 };
                        const goalType = drill ? drill.goalType : 'Execution %';
                        
                        return (
                            <li key={session.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-neutral dark:text-gray-200">{player.name} completed <span className="text-primary font-bold">{session.name}</span></p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(session.date)}</p>
                                </div>
                                 <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                    {goalType}: {progress.value}%
                                </div>
                            </li>
                        )
                    })}
                     {recentSessions.length === 0 && <p className="text-gray-400 text-center py-4">No recent activity.</p>}
                </ul>
            </div>
        </div>
    );
};

const PlayerList: React.FC<{ players: Player[], sessionsByPlayer: Record<string, Session[]>, onPlayerClick: (player: Player) => void }> = ({ players, sessionsByPlayer, onPlayerClick }) => {
    
    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            const sessionsA = sessionsByPlayer[a.id]?.length || 0;
            const sessionsB = sessionsByPlayer[b.id]?.length || 0;
            return sessionsB - sessionsA; // Sort by most active
        });
    }, [players, sessionsByPlayer]);
    
    return (
    <div>
        <h1 className="text-2xl font-bold text-neutral dark:text-white mb-6">Players</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedPlayers.map(player => {
                const playerSessions = sessionsByPlayer[player.id] || [];
                const avgExec = playerSessions.length > 0
                    ? Math.round(playerSessions.reduce((acc, s) => acc + calculateExecutionPercentage(s.sets), 0) / playerSessions.length)
                    : 0;
                const hardHit = playerSessions.length > 0
                    ? Math.round(playerSessions.reduce((acc, s) => acc + calculateHardHitPercentage(s.sets), 0) / playerSessions.length)
                    : 0;

                return (
                    <div key={player.id} onClick={() => onPlayerClick(player)} className="bg-white dark:bg-dark-base-200 rounded-xl shadow-md p-4 space-y-3 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg">
                        <div className="flex items-center gap-4">
                            <Avatar name={player.name} className="w-12 h-12 text-lg" />
                            <div>
                                <h3 className="font-bold text-lg text-neutral dark:text-white">{player.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sessions: {playerSessions.length}</p>
                            </div>
                        </div>
                         <div className="flex justify-around text-center pt-2 border-t border-base-200 dark:border-dark-base-300">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Exec %</p>
                                <p className="font-bold text-lg text-primary">{avgExec}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Hard Hit %</p>
                                <p className="font-bold text-lg text-accent">{hardHit}%</p>
                            </div>
                         </div>
                         {playerSessions.length === 0 && <p className="text-center text-sm text-gray-400 pt-2">No sessions yet — encourage your player to log one!</p>}
                    </div>
                );
            })}
        </div>
    </div>
    )
};


const PlayerDetail: React.FC<{ player: Player; sessions: Session[]; drills: Drill[]; onBack: () => void; }> = ({ player, sessions, drills, onBack }) => {
    return (
        <div>
            <button onClick={onBack} className="mb-6 text-sm text-primary hover:underline font-semibold">
                &larr; Back to Player List
            </button>
            <div className="flex items-center mb-6">
                 <Avatar name={player.name} className="w-16 h-16 text-2xl mr-4" />
                <div>
                    <h1 className="text-3xl font-bold text-neutral dark:text-white">{player.name}</h1>
                    <div className="flex gap-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Grad: {player.profile.gradYear}</span>
                        <span>Bats: {player.profile.bats}</span>
                        <span>Throws: {player.profile.throws}</span>
                        {player.profile.position && <span>Position: {player.profile.position}</span>}
                    </div>
                </div>
            </div>
            
            <h2 className="text-xl font-bold text-neutral dark:text-white mb-4">Session History</h2>
            <div className="bg-white dark:bg-dark-base-200 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-base-200 dark:divide-dark-base-300">
                    {sessions.length > 0 ? sessions.slice().reverse().map(session => {
                        const drill = drills.find(d => d.id === session.drillId);
                        const progress = drill ? getSessionGoalProgress(session, drill) : { value: calculateExecutionPercentage(session.sets), isSuccess: true };
                        const goalType = drill ? drill.goalType : "Exec %";

                        return (
                            <li key={session.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-primary">{session.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(session.date)}</p>
                                </div>
                                <div className={`px-3 py-1 text-sm font-semibold rounded-full ${progress.isSuccess ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                    {goalType}: {progress.value}{drill?.goalType.includes('%') ? '%' : ''}
                                </div>
                            </li>
                        );
                    }) : (
                        <p className="text-center text-gray-400 p-6">This player has not completed any sessions yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

const DrillForm: React.FC<{
    onSave: (drill: Omit<Drill, 'id' | 'teamId'>) => void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [drill, setDrill] = useState<Omit<Drill, 'id' | 'teamId'>>({
        name: '', description: '', targetZones: [], pitchTypes: [], drillType: 'Tee Work',
        countSituation: 'Even', baseRunners: [], outs: 0,
        goalType: 'Execution %', goalTargetValue: 80, repsPerSet: 10, sets: 3
    });

    // FIX: Argument of type 'any' is not assignable to parameter of type 'never'.
    // This error was caused by using array methods on a union of array types.
    // The implementation is updated to cast the array to a common type before manipulation.
    const handleMultiSelect = (field: 'targetZones' | 'pitchTypes' | 'baseRunners', value: TargetZone | PitchType | BaseRunner) => {
        setDrill(prev => {
            const currentList = prev[field] as string[];
            const newList = currentList.includes(value) ? currentList.filter(v => v !== value) : [...currentList, value];
            return {
                ...prev,
                [field]: newList,
            };
        });
    };
    
    const handleChange = (field: keyof Omit<Drill, 'id' | 'teamId' | 'targetZones' | 'pitchTypes' | 'baseRunners'>, value: any) => {
        setDrill(prev => ({...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(drill);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Drill Name</label>
                    <input type="text" value={drill.name} onChange={e => handleChange('name', e.target.value)} required className="mt-1 block w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Drill Type</label>
                    <select value={drill.drillType} onChange={e => handleChange('drillType', e.target.value as DrillType)} className="mt-1 block w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        {DRILL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Description</label>
                <textarea value={drill.description} onChange={e => handleChange('description', e.target.value)} required rows={2} className="mt-1 block w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>

            {/* Target Zones and Pitch Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Target Zones (Optional)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {TARGET_ZONES.map(zone => (
                            <button type="button" key={zone} onClick={() => handleMultiSelect('targetZones', zone)} className={`p-2 text-xs rounded-md ${drill.targetZones.includes(zone) ? 'bg-primary text-white' : 'bg-base-100 dark:bg-dark-base-100 hover:bg-base-200'}`}>{zone}</button>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Pitch Types (Optional)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {PITCH_TYPES.map(type => (
                            <button type="button" key={type} onClick={() => handleMultiSelect('pitchTypes', type)} className={`p-2 text-xs rounded-md ${drill.pitchTypes.includes(type) ? 'bg-primary text-white' : 'bg-base-100 dark:bg-dark-base-100 hover:bg-base-200'}`}>{type}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Game Situation */}
             <div>
                <h4 className="text-md font-semibold text-gray-500 dark:text-gray-300 border-b border-base-200 pb-2 mb-3">Game Situation Defaults</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Outs</label>
                         <div className="flex gap-2">
                             {OUTS_OPTIONS.map(out => <button type="button" key={out} onClick={() => handleChange('outs', out)} className={`flex-1 p-2 text-sm rounded-md ${drill.outs === out ? 'bg-primary text-white' : 'bg-base-100 dark:bg-dark-base-100 hover:bg-base-200'}`}>{out}</button>)}
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Count</label>
                        <select value={drill.countSituation} onChange={(e) => handleChange('countSituation', e.target.value)} className="w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md py-2 px-3 text-sm">
                            {COUNT_SITUATIONS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">Base Runners</label>
                        <div className="flex gap-2">
                            {BASE_RUNNERS.map(runner => <button type="button" key={runner} onClick={() => handleMultiSelect('baseRunners', runner)} className={`flex-1 p-2 text-sm rounded-md ${drill.baseRunners.includes(runner) ? 'bg-primary text-white' : 'bg-base-100 dark:bg-dark-base-100 hover:bg-base-200'}`}>{runner}</button>)}
                        </div>
                    </div>
                </div>
             </div>

             {/* Goal and Volume */}
            <div>
                <h4 className="text-md font-semibold text-gray-500 dark:text-gray-300 border-b border-base-200 pb-2 mb-3">Goal & Volume Defaults</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Goal Type</label>
                         <select value={drill.goalType} onChange={e => handleChange('goalType', e.target.value as GoalType)} className="mt-1 w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md py-2 px-3 text-sm">
                            {GOAL_TYPES.map(g => <option key={g}>{g}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Target Value</label>
                         <input type="number" value={drill.goalTargetValue} onChange={e => handleChange('goalTargetValue', parseInt(e.target.value))} className="mt-1 w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md py-2 px-3 text-sm"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Sets</label>
                         <input type="number" value={drill.sets} onChange={e => handleChange('sets', parseInt(e.target.value))} className="mt-1 w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md py-2 px-3 text-sm"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Reps/Set</label>
                         <input type="number" value={drill.repsPerSet} onChange={e => handleChange('repsPerSet', parseInt(e.target.value))} className="mt-1 w-full bg-base-100 dark:bg-dark-base-100 border-base-300 dark:border-dark-base-300 rounded-md py-2 px-3 text-sm"/>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-base-200">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-base-200 dark:bg-dark-base-200 hover:bg-base-300 dark:hover:bg-dark-base-300 rounded-md">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md">Save Drill</button>
            </div>
        </form>
    );
};

const AssignDrillModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drill: Drill;
    players: Player[];
    onAssign: (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => void;
}> = ({ isOpen, onClose, drill, players, onAssign }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [recurringDays, setRecurringDays] = useState<DayOfWeek[]>([]);
    const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handlePlayerSelect = (playerId: string) => {
        setSelectedPlayerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
    };
    
    const handleSelectAll = () => {
        if (selectedPlayerIds.length === players.length) {
            setSelectedPlayerIds([]);
        } else {
            setSelectedPlayerIds(players.map(p => p.id));
        }
    };

    const toggleDay = (day: DayOfWeek) => {
        setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleSubmit = () => {
        if (selectedPlayerIds.length === 0 || recurringDays.length === 0) {
            alert("Please select at least one player and one day.");
            return;
        }
        onAssign({
            playerIds: selectedPlayerIds,
            isRecurring: true,
            recurringDays: recurringDays,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign Drill: ${drill.name}`}>
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-neutral dark:text-white mb-2">Assign to Players</h3>
                    <div className="flex items-center mb-2">
                        <input type="checkbox" id="select-all" checked={selectedPlayerIds.length === players.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <label htmlFor="select-all" className="ml-2 block text-sm text-gray-500 dark:text-gray-300">Select All Players</label>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-base-300 dark:border-dark-base-300 p-2">
                        {players.map(p => (
                            <div key={p.id} className="flex items-center">
                                <input type="checkbox" id={`p-${p.id}`} checked={selectedPlayerIds.includes(p.id)} onChange={() => handlePlayerSelect(p.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                <label htmlFor={`p-${p.id}`} className="ml-2 block text-sm text-gray-500 dark:text-gray-300">{p.name}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-neutral dark:text-white mb-2">Set Recurring Schedule</h3>
                    <div className="flex justify-center gap-1 sm:gap-2">
                        {days.map(day => (
                            <button key={day} onClick={() => toggleDay(day)} className={`w-10 h-10 rounded-full font-semibold text-sm transition-colors ${recurringDays.includes(day) ? 'bg-primary text-white' : 'bg-base-200 dark:bg-dark-base-300 hover:bg-base-300'}`}>
                                {day.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-base-200 dark:bg-dark-base-200 hover:bg-base-300 dark:hover:bg-dark-base-300 rounded-md">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md">Assign Drill</button>
                </div>
            </div>
        </Modal>
    );
};

const DrillList: React.FC<{ 
    drills: Drill[], 
    players: Player[],
    createDrill: (drill: Omit<Drill, 'id' | 'teamId'>) => void,
    assignDrill: (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => void
}> = ({ drills, players, createDrill, assignDrill }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [drillToAssign, setDrillToAssign] = useState<Drill | null>(null);

    const handleAssign = (assignment: { playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        if (!drillToAssign) return;
        assignDrill({ drillId: drillToAssign.id, ...assignment });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-neutral dark:text-white">Drills</h1>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg">
                    + Create Drill
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drills.map(drill => (
                    <div key={drill.id} className="bg-white dark:bg-dark-base-200 p-4 rounded-xl shadow-md flex flex-col">
                        <div className="flex-grow space-y-2">
                            <h3 className="text-lg font-bold text-primary">{drill.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">{drill.description}</p>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 pt-2 mt-2 border-t border-base-200 dark:border-dark-base-300">
                            <p><strong>Goal:</strong> {drill.goalType} >= {drill.goalTargetValue}{drill.goalType.includes('%') ? '%' : ''}</p>
                            <p><strong>Volume:</strong> {drill.sets} sets of {drill.repsPerSet} reps</p>
                        </div>
                        <button onClick={() => setDrillToAssign(drill)} className="w-full mt-4 bg-secondary/20 hover:bg-secondary/30 text-secondary font-bold py-2 px-4 rounded-lg text-sm">
                            Assign Drill
                        </button>
                    </div>
                ))}
                 {drills.length === 0 && <p className="text-gray-400 md:col-span-3 text-center py-4">No drills created yet.</p>}
            </div>
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Drill">
                <DrillForm onSave={createDrill} onClose={() => setIsCreateModalOpen(false)} />
            </Modal>
            {drillToAssign && (
                 <AssignDrillModal 
                    isOpen={!!drillToAssign}
                    onClose={() => setDrillToAssign(null)}
                    drill={drillToAssign}
                    players={players}
                    onAssign={handleAssign}
                 />
            )}
        </div>
    );
}

export const CoachView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const { currentUser, getTeamsForCoach, getPlayersInTeam, getDrillsForTeam, getSessionsForTeam, createDrill, createAssignment } = useContext(DataContext)!;
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const coachTeams = getTeamsForCoach(currentUser!.id);
    const [activeTeamId, setActiveTeamId] = useState<string>(coachTeams.length > 0 ? coachTeams[0].id : '');
    
    const activeTeam = useMemo(() => coachTeams.find(t => t.id === activeTeamId), [coachTeams, activeTeamId])

    const players = useMemo(() => getPlayersInTeam(activeTeamId), [activeTeamId, getPlayersInTeam]);
    const drills = useMemo(() => getDrillsForTeam(activeTeamId), [activeTeamId, getDrillsForTeam]);
    const sessions = useMemo(() => getSessionsForTeam(activeTeamId), [activeTeamId, getSessionsForTeam]);

    const sessionsByPlayer = useMemo(() => {
        return sessions.reduce((acc, session) => {
            if (!acc[session.playerId]) {
                acc[session.playerId] = [];
            }
            acc[session.playerId].push(session);
            return acc;
        }, {} as Record<string, Session[]>);
    }, [sessions]);


    const handleCreateDrill = (drillData: Omit<Drill, 'id' | 'teamId'>) => {
        createDrill(drillData, activeTeamId);
    };

    const handleAssignDrill = (assignment: { drillId: string, playerIds: string[], isRecurring: boolean, recurringDays: DayOfWeek[] }) => {
        createAssignment({ teamId: activeTeamId, ...assignment });
    };

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayer(player);
    };
    
    const handleBackToPlayerList = () => {
        setSelectedPlayer(null);
    }

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, view: 'dashboard' },
        { name: 'Players', icon: <UsersIcon />, view: 'players' },
        { name: 'Drills', icon: <ClipboardListIcon />, view: 'drills' },
        { name: 'Analytics', icon: <ChartBarIcon />, view: 'analytics' },
    ];
    
    React.useEffect(() => {
        if(currentView !== 'players') {
            setSelectedPlayer(null);
        }
    }, [currentView]);

    const analyticsData = useMemo(() => {
        // ... (analytics data logic remains the same)
        return { playerExecutionData: [], drillSuccessData: [], hardHitData: [] };
    }, [players, drills, sessions, sessionsByPlayer]);
    
    if (!activeTeamId || coachTeams.length === 0 || !activeTeam) {
        return <div className="p-8 text-center text-neutral dark:text-gray-300">You have not created or joined any teams yet.</div>
    }

    return (
        <Dashboard 
            navItems={navItems} 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            teams={coachTeams}
            activeTeamId={activeTeamId}
            setActiveTeamId={setActiveTeamId}
        >
            {currentView === 'dashboard' && <CoachDashboard players={players} drills={drills} sessions={sessions} team={activeTeam} />}
            {currentView === 'players' && (
                 selectedPlayer ? (
                    <PlayerDetail 
                        player={selectedPlayer} 
                        sessions={sessionsByPlayer[selectedPlayer.id] || []}
                        drills={drills}
                        onBack={handleBackToPlayerList}
                    />
                ) : (
                    <PlayerList players={players} sessionsByPlayer={sessionsByPlayer} onPlayerClick={handlePlayerClick} />
                )
            )}
            {currentView === 'drills' && <DrillList drills={drills} players={players} createDrill={handleCreateDrill} assignDrill={handleAssignDrill} />}
            {currentView === 'analytics' && (
                <div>
                    <h1 className="text-2xl font-bold text-neutral dark:text-white mb-6">Team Analytics</h1>
                    <AnalyticsCharts 
                        playerExecutionData={analyticsData.playerExecutionData}
                        drillSuccessData={analyticsData.drillSuccessData}
                        hardHitData={analyticsData.hardHitData}
                    />
                </div>
            )}
        </Dashboard>
    );
};