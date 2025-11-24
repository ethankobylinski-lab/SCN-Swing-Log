import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../contexts/DataContext';
import { ZoneId, DayOfWeek } from '../types';
import { Modal } from './Modal';

interface StepInput {
    pitchTypeId: string;
    intendedZone: ZoneId;
    reps: number;
}

interface PitchingProgramFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (templateId: string) => void; // Now returns the created template ID
    templateId?: string; // For editing (future enhancement)
}

// Zone labels for dropdown
const ZONE_OPTIONS: Array<{ value: ZoneId; label: string }> = [
    { value: 'Z11', label: 'High-In' },
    { value: 'Z12', label: 'High-Middle' },
    { value: 'Z13', label: 'High-Away' },
    { value: 'Z21', label: 'Middle-In' },
    { value: 'Z22', label: 'Middle-Middle' },
    { value: 'Z23', label: 'Middle-Away' },
    { value: 'Z31', label: 'Low-In' },
    { value: 'Z32', label: 'Low-Middle' },
    { value: 'Z33', label: 'Low-Away' },
];

// Common pitch type templates
const COMMON_PITCH_TYPES = [
    { name: 'Fastball', code: 'FB', colorHex: '#ef4444' },
    { name: 'Curveball', code: 'CB', colorHex: '#3b82f6' },
    { name: 'Changeup', code: 'CH', colorHex: '#22c55e' },
    { name: 'Slider', code: 'SL', colorHex: '#a855f7' },
];

/**
 * Form for creating pitch simulation templates
 * Features: running total pitch count, row-by-row step builder, custom pitch types
 */
export const PitchingProgramForm: React.FC<PitchingProgramFormProps> = ({
    isOpen,
    onClose,
    onSuccess,
    templateId, // If provided, we're in edit mode
}) => {
    const { activeTeam, createSimulationTemplate, updateSimulationTemplate, getSimulationTemplatesForTeam, getSimulationSteps, getPitchTypesForPitcher, getPlayersInTeam, addCustomPitchType } = useContext(DataContext)!;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<StepInput[]>([]);

    // Current input row
    const [currentPitchTypeId, setCurrentPitchTypeId] = useState('');
    const [currentZone, setCurrentZone] = useState<ZoneId>('Z22');
    const [currentReps, setCurrentReps] = useState(1);

    const [pitchTypes, setPitchTypes] = useState<Array<{ id: string; name: string; code: string; colorHex: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom pitch type modal
    const [showAddPitchType, setShowAddPitchType] = useState(false);
    const [newPitchName, setNewPitchName] = useState('');
    const [newPitchCode, setNewPitchCode] = useState('');
    const [newPitchColor, setNewPitchColor] = useState('#ef4444');
    const [addingPitchType, setAddingPitchType] = useState(false);

    const isEditMode = !!templateId;

    // Load template data when editing
    useEffect(() => {
        if (!templateId || !activeTeam || !isOpen) return;

        const loadTemplateData = async () => {
            try {
                // Get template metadata
                const templates = await getSimulationTemplatesForTeam(activeTeam.id);
                const template = templates.find(t => t.id === templateId);

                if (!template) {
                    setError('Template not found');
                    return;
                }

                setName(template.name);
                setDescription(template.description || '');

                // Get steps and convert back to grouped format
                const flatSteps = await getSimulationSteps(templateId);

                // Group consecutive steps with same pitch type and zone
                const grouped: StepInput[] = [];
                for (const step of flatSteps) {
                    const last = grouped[grouped.length - 1];
                    if (last && last.pitchTypeId === step.pitchTypeId && last.intendedZone === step.intendedZone) {
                        last.reps++;
                    } else {
                        grouped.push({
                            pitchTypeId: step.pitchTypeId,
                            intendedZone: step.intendedZone,
                            reps: 1
                        });
                    }
                }

                setSteps(grouped);
            } catch (err) {
                console.error('Error loading template:', err);
                setError('Failed to load template data');
            }
        };

        loadTemplateData();
    }, [templateId, activeTeam, isOpen, getSimulationTemplatesForTeam, getSimulationSteps]);

    // Load pitch types from any pitcher on the team
    useEffect(() => {
        if (!activeTeam || !isOpen) return;

        const loadPitchTypes = async () => {
            try {
                const players = getPlayersInTeam(activeTeam.id);
                if (players.length === 0) {
                    setPitchTypes([]);
                    return;
                }

                // Get pitch types from first pitcher (or combine from all)
                const firstPitcher = players[0];
                const types = await getPitchTypesForPitcher(firstPitcher.id);
                setPitchTypes(types);

                if (types.length > 0 && !currentPitchTypeId) {
                    setCurrentPitchTypeId(types[0].id);
                }
            } catch (err) {
                console.error('Error loading pitch types:', err);
            }
        };

        loadPitchTypes();
    }, [activeTeam, isOpen, getPlayersInTeam, getPitchTypesForPitcher]);

    // Reload pitch types when modal opens
    const reloadPitchTypes = async () => {
        if (!activeTeam) return;

        try {
            const players = getPlayersInTeam(activeTeam.id);
            if (players.length > 0) {
                const firstPitcher = players[0];
                const types = await getPitchTypesForPitcher(firstPitcher.id);
                setPitchTypes(types);

                // Select the newly added one
                if (types.length > 0) {
                    setCurrentPitchTypeId(types[types.length - 1].id);
                }
            }
        } catch (err) {
            console.error('Error reloading pitch types:', err);
        }
    };

    // Add common pitch type
    const handleAddCommonPitchType = async (template: { name: string; code: string; colorHex: string }) => {
        if (!activeTeam) return;

        const players = getPlayersInTeam(activeTeam.id);
        if (players.length === 0) {
            setError('No players on team');
            return;
        }

        setAddingPitchType(true);
        try {
            const firstPitcher = players[0];
            await addCustomPitchType(firstPitcher.id, template.name, template.code, template.colorHex);
            await reloadPitchTypes();
            setShowAddPitchType(false);
        } catch (err) {
            setError('Failed to add pitch type');
        } finally {
            setAddingPitchType(false);
        }
    };

    // Add fully custom pitch type
    const handleAddCustomPitchType = async () => {
        if (!newPitchName.trim() || !newPitchCode.trim()) {
            setError('Please enter name and code');
            return;
        }

        if (!activeTeam) return;

        const players = getPlayersInTeam(activeTeam.id);
        if (players.length === 0) {
            setError('No players on team');
            return;
        }

        setAddingPitchType(true);
        setError(null);

        try {
            const firstPitcher = players[0];
            await addCustomPitchType(firstPitcher.id, newPitchName.trim(), newPitchCode.trim().toUpperCase(), newPitchColor);
            await reloadPitchTypes();

            // Reset form
            setNewPitchName('');
            setNewPitchCode('');
            setNewPitchColor('#ef4444');
            setShowAddPitchType(false);
        } catch (err) {
            setError('Failed to add pitch type');
        } finally {
            setAddingPitchType(false);
        }
    };

    // Calculate total pitch count
    const totalPitches = steps.reduce((sum, step) => sum + step.reps, 0);


    const handleAddStep = () => {
        if (!currentPitchTypeId) {
            setError('Please select a pitch type');
            return;
        }

        if (currentReps < 1) {
            setError('Reps must be at least 1');
            return;
        }

        setSteps(prev => [...prev, {
            pitchTypeId: currentPitchTypeId,
            intendedZone: currentZone,
            reps: currentReps
        }]);

        // Reset input row
        setCurrentReps(1);
        setError(null);
    };

    const handleRemoveStep = (index: number) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    };

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === steps.length - 1)
        ) {
            return;
        }

        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const handleSubmit = async () => {
        if (!activeTeam) {
            setError('No active team selected');
            return;
        }

        if (!name.trim()) {
            setError('Please enter a program name');
            return;
        }

        if (steps.length === 0) {
            setError('Please add at least one step');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isEditMode && templateId) {
                // Update existing template
                await updateSimulationTemplate(
                    templateId,
                    name.trim(),
                    description.trim(),
                    steps
                );

                // Don't reset form in edit mode, just close
                onSuccess(templateId);
                onClose();
            } else {
                // Create new template
                const newTemplateId = await createSimulationTemplate(
                    activeTeam.id,
                    name.trim(),
                    description.trim(),
                    steps
                );

                // Reset form
                setName('');
                setDescription('');
                setSteps([]);
                setCurrentReps(1);

                onSuccess(newTemplateId); // Pass the template ID to parent
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} program`);
        } finally {
            setLoading(false);
        }
    };

    const getPitchTypeDisplay = (pitchTypeId: string) => {
        const pt = pitchTypes.find(p => p.id === pitchTypeId);
        return pt ? `${pt.name} (${pt.code})` : 'Unknown';
    };

    const getZoneDisplay = (zoneId: ZoneId) => {
        const zone = ZONE_OPTIONS.find(z => z.value === zoneId);
        return zone ? zone.label : zoneId;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {isEditMode ? 'Edit' : 'Create'} Pitching Program
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Build a scripted pitch sequence for your pitchers.
                    </p>
                </div>

                {/* Total Pitch Count - Prominent Display */}
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Pitches</p>
                    <p className="text-4xl font-bold text-primary">{totalPitches}</p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Template Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Program Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., FB/CH Command - Basic"
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the purpose of this program..."
                            rows={2}
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Step Builder */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Build Sequence</h3>

                    {/* Input Row */}
                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Add Step</p>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-muted-foreground mb-1">Pitch Type</label>
                                <div className="flex gap-1">
                                    <select
                                        value={currentPitchTypeId}
                                        onChange={(e) => setCurrentPitchTypeId(e.target.value)}
                                        className="flex-1 bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {pitchTypes.map(pt => (
                                            <option key={pt.id} value={pt.id}>
                                                {pt.name} ({pt.code})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPitchType(true)}
                                        className="px-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-md text-xs font-semibold"
                                        title="Add pitch type"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs text-muted-foreground mb-1">Target Zone</label>
                                <select
                                    value={currentZone}
                                    onChange={(e) => setCurrentZone(e.target.value as ZoneId)}
                                    className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {ZONE_OPTIONS.map(zone => (
                                        <option key={zone.value} value={zone.value}>
                                            {zone.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground mb-1"># of Pitches</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={currentReps}
                                    onChange={(e) => setCurrentReps(parseInt(e.target.value) || 1)}
                                    className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddStep}
                            disabled={!currentPitchTypeId}
                            className="w-full bg-secondary text-secondary-foreground font-semibold py-2 rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add to Sequence
                        </button>
                    </div>

                    {/* Steps List */}
                    {steps.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Sequence ({steps.length} steps)</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {steps.map((step, index) => (
                                    <div
                                        key={index}
                                        className="bg-card border border-border rounded-md p-3 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground flex-shrink-0">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm text-foreground truncate">
                                                {getPitchTypeDisplay(step.pitchTypeId)} → {getZoneDisplay(step.intendedZone)}
                                            </span>
                                            <span className="text-xs font-semibold text-primary flex-shrink-0">
                                                × {step.reps}
                                            </span>
                                        </div>

                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleMoveStep(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => handleMoveStep(index, 'down')}
                                                disabled={index === steps.length - 1}
                                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                onClick={() => handleRemoveStep(index)}
                                                className="p-1 text-destructive hover:text-destructive/80"
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Pitch Type Modal */}
                {showAddPitchType && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Add Pitch Type</h3>
                                <p className="text-sm text-muted-foreground">Choose a common pitch or create your own</p>
                            </div>

                            {/* Common Pitch Types */}
                            <div>
                                <p className="text-sm font-medium text-foreground mb-2">Common Pitches</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {COMMON_PITCH_TYPES.map(template => (
                                        <button
                                            key={template.code}
                                            onClick={() => handleAddCommonPitchType(template)}
                                            disabled={addingPitchType}
                                            className="p-3 border border-border rounded-md hover:bg-muted text-left disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: template.colorHex }}
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{template.name}</p>
                                                    <p className="text-xs text-muted-foreground">{template.code}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <p className="text-sm font-medium text-foreground mb-2">Custom Pitch</p>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Pitch name (e.g., Sinker)"
                                        value={newPitchName}
                                        onChange={(e) => setNewPitchName(e.target.value)}
                                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Code (e.g., SI)"
                                        value={newPitchCode}
                                        onChange={(e) => setNewPitchCode(e.target.value)}
                                        maxLength={3}
                                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-foreground">Color:</label>
                                        <input
                                            type="color"
                                            value={newPitchColor}
                                            onChange={(e) => setNewPitchColor(e.target.value)}
                                            className="h-8 w-16 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setShowAddPitchType(false)}
                                    disabled={addingPitchType}
                                    className="flex-1 bg-muted text-muted-foreground py-2 rounded-md hover:bg-muted/80 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCustomPitchType}
                                    disabled={addingPitchType || !newPitchName.trim() || !newPitchCode.trim()}
                                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {addingPitchType ? 'Adding...' : 'Add Custom'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-muted text-muted-foreground font-semibold py-2 rounded-md hover:bg-muted/80 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || steps.length === 0}
                        className="flex-1 bg-primary text-primary-foreground font-semibold py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Program' : 'Create & Assign')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
