import React, { useState } from 'react';
import { Team, Player } from '../types';
import { ReportTypeSelector, ReportType } from './ReportTypeSelector';
import { ReportFilters, ReportFiltersState } from './ReportFilters';
import { ReportPreview } from './ReportPreview';

interface ReportsPageProps {
    team: Team;
    players: Player[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ team, players }) => {
    const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
    const [filters, setFilters] = useState<ReportFiltersState>({
        dateRange: {
            start: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
        },
        selectedPlayerIds: [],
        includeCharts: true,
        includeNotes: true,
        pitchType: 'All',
        groupBySession: false,
        selectedGoalId: '',
        showActiveGoalsOnly: true,
    });

    const handleGenerateReport = () => {
        // This will trigger the preview to update via props
        console.log('Generating report with:', { selectedReportType, filters });
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Builder Panel */}
                <div className="w-full md:w-1/3 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate printable summaries for pitching, goals, and more.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-6">
                        <ReportTypeSelector
                            selectedType={selectedReportType}
                            onSelect={setSelectedReportType}
                        />

                        {selectedReportType && (
                            <>
                                <div className="border-t border-border my-4" />
                                <ReportFilters
                                    reportType={selectedReportType}
                                    filters={filters}
                                    onFilterChange={setFilters}
                                    players={players}
                                    teamId={team.id}
                                />
                                <div className="pt-4">
                                    <button
                                        onClick={handleGenerateReport}
                                        className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg shadow hover:bg-primary/90 transition-colors"
                                    >
                                        Generate Report
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Preview Panel */}
                <div className="w-full md:w-2/3">
                    <ReportPreview
                        reportType={selectedReportType}
                        filters={filters}
                        team={team}
                        players={players}
                    />
                </div>
            </div>
        </div>
    );
};
