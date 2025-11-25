import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { PitchSimulationTemplate, SimulationStepWithDetails, PitchTypeModel } from '../types';
import { ProgramEligibilityTable } from './ProgramEligibilityTable';

interface PitchingProgramsListProps {
    onCreateNew: () => void;
    onEdit: (templateId: string, templateName?: string) => void;
    onAssign: (templateId: string, templateName?: string) => void;
}

/**
 * Displays list of pitch simulation templates for a team
 * Shows: name, description, total pitches, actions
 */
export const PitchingProgramsList: React.FC<PitchingProgramsListProps> = ({
    onCreateNew,
    onEdit,
    onAssign
}) => {
    const { activeTeam, getSimulationTemplatesForTeam, getSimulationSteps, deactivateSimulationTemplate } = useContext(DataContext)!;
    const [templates, setTemplates] = useState<PitchSimulationTemplate[]>([]);
    const [templateStepCounts, setTemplateStepCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [deactivating, setDeactivating] = useState<string | null>(null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

    // Load templates on mount
    React.useEffect(() => {
        if (!activeTeam) {
            setTemplates([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        getSimulationTemplatesForTeam(activeTeam.id)
            .then(async (data) => {
                setTemplates(data);

                // Fetch step counts for each template
                const counts: Record<string, number> = {};
                await Promise.all(
                    data.map(async (template) => {
                        const steps = await getSimulationSteps(template.id);
                        counts[template.id] = steps.length;
                    })
                );
                setTemplateStepCounts(counts);
            })
            .catch((err) => {
                console.error('Error loading templates:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [activeTeam, getSimulationTemplatesForTeam, getSimulationSteps]);

    const handleDeactivate = async (templateId: string) => {
        if (!confirm('Deactivate this pitching program? It will be hidden from view.')) return;

        setDeactivating(templateId);
        try {
            await deactivateSimulationTemplate(templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (err) {
            console.error('Error deactivating template:', err);
            alert('Failed to deactivate program');
        } finally {
            setDeactivating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading pitching programs...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Pitching Programs</h2>
                    <p className="text-sm text-muted-foreground">
                        Create scripted pitch sequences for pitchers to execute.
                    </p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    + New Program
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        No pitching programs yet. Create your first one to get started.
                    </p>
                    <button
                        onClick={onCreateNew}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        Create Pitching Program
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => {
                        const totalPitches = templateStepCounts[template.id] || 0;
                        const isDeactivating = deactivating === template.id;

                        return (
                            <div
                                key={template.id}
                                className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col gap-4"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-primary">{template.name}</h3>
                                    {template.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {template.description}
                                        </p>
                                    )}
                                </div>

                                <div className="text-xs text-card-foreground pt-2 mt-2 border-t border-border">
                                    <p>
                                        <strong>Total Pitches:</strong> {totalPitches}
                                    </p>
                                    <p className="text-muted-foreground mt-1">
                                        Created {new Date(template.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => setExpandedProgramId(expandedProgramId === template.id ? null : template.id)}
                                        className="flex-1 bg-primary/15 hover:bg-primary/25 text-primary font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        {expandedProgramId === template.id ? 'Hide Details' : 'View Program'}
                                    </button>
                                    <button
                                        onClick={() => onEdit(template.id, template.name)}
                                        className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onAssign(template.id, template.name)}
                                        className="flex-1 bg-secondary/15 hover:bg-secondary/25 text-secondary font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        Assign
                                    </button>
                                    <button
                                        onClick={() => handleDeactivate(template.id)}
                                        disabled={isDeactivating}
                                        className="bg-destructive/15 hover:bg-destructive/25 text-destructive font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                                    >
                                        {isDeactivating ? '...' : 'Delete'}
                                    </button>
                                </div>

                                {/* Expandable Eligibility Table */}
                                {expandedProgramId === template.id && (
                                    <ProgramEligibilityTable
                                        templateId={template.id}
                                        templateName={template.name}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
