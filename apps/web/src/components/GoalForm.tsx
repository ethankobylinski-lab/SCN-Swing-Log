import React, { useState } from 'react';
import { PersonalGoal, GoalType, DrillType, TargetZone, PitchType } from '../types';
import { DRILL_TYPES, TARGET_ZONES, PITCH_TYPES } from '../constants';

export type GoalFormValues = Omit<PersonalGoal, 'id' | 'playerId' | 'status' | 'startDate' | 'teamId'>;

interface GoalFormProps {
    onSave: (data: GoalFormValues) => Promise<void> | void;
    isSaving?: boolean;
    errorMessage?: string | null;
    context?: 'hitting' | 'pitching' | 'all';
}

// Define hitting-specific metrics
const HITTING_METRICS: GoalType[] = [
    'Execution %',
    'Hard Hit %',
    'No Strikeouts',
    'Total Reps'
];

// Define pitching-specific metrics
const PITCHING_METRICS: GoalType[] = [
    'Strike %',
    'Total Pitches',
    'Command' // For location-based goals
];

export const GoalForm: React.FC<GoalFormProps> = ({
    onSave,
    isSaving = false,
    errorMessage,
    context = 'all'
}) => {
    // Determine available metrics based on context
    const availableMetrics = context === 'hitting'
        ? HITTING_METRICS
        : context === 'pitching'
            ? PITCHING_METRICS
            : [...HITTING_METRICS, ...PITCHING_METRICS];

    const [metric, setMetric] = useState<GoalType>(availableMetrics[0]);
    const [targetValue, setTargetValue] = useState(85);
    const [targetDate, setTargetDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
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
        if (drillType) goalData.drillType = drillType;
        if (targetZones.length > 0) goalData.targetZones = targetZones;
        if (pitchTypes.length > 0) goalData.pitchTypes = pitchTypes;
        if (metric === 'Execution %' || metric === 'Total Reps') {
            goalData.minReps = Math.max(1, minReps);
        }
        try {
            await onSave(goalData);
        } catch (err) {
            console.error('Goal save failed:', err);
        }
    };

    const isHittingMetric = HITTING_METRICS.includes(metric);
    const isPitchingMetric = PITCHING_METRICS.includes(metric);
    const showMinReps = metric === 'Execution %' || metric === 'Total Reps' || metric === 'Total Pitches';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Metric</label>
                    <select
                        value={metric}
                        onChange={e => setMetric(e.target.value as GoalType)}
                        className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        {availableMetrics.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                        Target {metric === 'No Strikeouts' ? 'Max' : 'Value'}
                    </label>
                    <input
                        type="number"
                        value={targetValue}
                        onChange={e => setTargetValue(parseInt(e.target.value))}
                        required
                        className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            </div>

            {showMinReps && (
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                        {metric === 'Total Reps' || metric === 'Total Pitches' ? 'Target' : 'Minimum'} {metric === 'Total Pitches' ? 'Pitches' : 'Reps'}
                    </label>
                    <p className="text-xs text-muted-foreground mb-1">
                        {metric === 'Total Reps' || metric === 'Total Pitches'
                            ? `Total ${metric === 'Total Pitches' ? 'pitches' : 'reps'} to achieve this goal.`
                            : 'Minimum reps required to count toward this goal.'
                        }
                    </p>
                    <input
                        type="number"
                        value={minReps}
                        onChange={e => setMinReps(parseInt(e.target.value))}
                        min={1}
                        className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-muted-foreground">Target Date</label>
                <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    required
                    className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            </div>

            <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Filters (Optional)</h4>
                <p className="text-xs text-muted-foreground mb-3">Focus this goal on specific conditions</p>
                <div className="space-y-4">
                    {/* Drill Type - Show for hitting metrics only */}
                    {isHittingMetric && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">Drill Type</label>
                            <select
                                value={drillType || ''}
                                onChange={e => setDrillType(e.target.value ? e.target.value as DrillType : undefined)}
                                className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="">Any Drill Type</option>
                                {DRILL_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Strike Zone - Show for hitting metrics */}
                    {isHittingMetric && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Strike Zone Location</label>
                            <div className="grid grid-cols-3 gap-2">
                                {TARGET_ZONES.map(zone => (
                                    <button
                                        key={zone}
                                        type="button"
                                        onClick={() => handleTargetZoneSelect(zone)}
                                        className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${targetZones.includes(zone)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                    >
                                        {zone}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pitch Location - Show for pitching metrics */}
                    {isPitchingMetric && (metric === 'Strike %' || metric === 'Command') && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Pitch Location</label>
                            <div className="grid grid-cols-3 gap-2">
                                {TARGET_ZONES.map(zone => (
                                    <button
                                        key={zone}
                                        type="button"
                                        onClick={() => handleTargetZoneSelect(zone)}
                                        className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${targetZones.includes(zone)
                                                ? 'bg-secondary text-secondary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                    >
                                        {zone}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pitch Type - Show for both hitting and pitching */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Pitch Type {isHittingMetric ? '(Faced)' : '(Thrown)'}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PITCH_TYPES.map(pitch => (
                                <button
                                    key={pitch}
                                    type="button"
                                    onClick={() => handlePitchTypeSelect(pitch)}
                                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${pitchTypes.includes(pitch)
                                            ? isHittingMetric
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-secondary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                >
                                    {pitch}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Set Goal'}
                </button>
            </div>
        </form>
    );
};
