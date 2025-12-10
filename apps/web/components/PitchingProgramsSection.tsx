import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { PitchingProgramsList } from './PitchingProgramsList';
import { PitchingProgramForm } from './PitchingProgramForm';
import { PitchingProgramAssignmentModal } from './PitchingProgramAssignmentModal';

/**
 * Main container for Pitching Programs section in Coach Drills tab
 * Orchestrates list, form, and assignment modal
 */
export const PitchingProgramsSection: React.FC = () => {
    const { getSimulationTemplatesForTeam, activeTeam } = useContext(DataContext)!;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleOpenForm = () => {
        setEditingTemplateId(null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingTemplateId(null);
    };

    const handleFormSuccess = async (templateId: string) => {
        setRefreshKey(prev => prev + 1); // Trigger list refresh

        // If we just edited, don't open assignment modal
        if (editingTemplateId) {
            return;
        }

        // Fetch the template name for the assignment modal
        if (activeTeam) {
            try {
                const templates = await getSimulationTemplatesForTeam(activeTeam.id);
                const template = templates.find(t => t.id === templateId);
                setSelectedTemplateName(template?.name || 'New Program');
            } catch (err) {
                setSelectedTemplateName('New Program');
            }
        }

        // Auto-open assignment modal with the newly created template
        setSelectedTemplateId(templateId);
        setIsAssignmentOpen(true);
    };

    const handleOpenEdit = (templateId: string, templateName?: string) => {
        setEditingTemplateId(templateId);
        setIsFormOpen(true);
    };

    const handleOpenAssignment = (templateId: string, templateName?: string) => {
        setSelectedTemplateId(templateId);
        setSelectedTemplateName(templateName || '');
        setIsAssignmentOpen(true);
    };

    const handleCloseAssignment = () => {
        setIsAssignmentOpen(false);
        setSelectedTemplateId(null);
        setSelectedTemplateName('');
    };

    return (
        <div>
            {/* Programs List */}
            <PitchingProgramsList
                key={refreshKey}
                onCreateNew={handleOpenForm}
                onEdit={handleOpenEdit}
                onAssign={handleOpenAssignment}
            />

            {/* Create/Edit Form Modal */}
            <PitchingProgramForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSuccess={handleFormSuccess}
                templateId={editingTemplateId || undefined}
            />

            {/* Assignment Modal */}
            <PitchingProgramAssignmentModal
                isOpen={isAssignmentOpen}
                onClose={handleCloseAssignment}
                templateId={selectedTemplateId}
                templateName={selectedTemplateName}
            />
        </div>
    );
};
