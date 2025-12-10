import React, { useRef } from 'react';
import { Team, Player } from '../types';
import { ReportType } from './ReportTypeSelector';
import { ReportFiltersState } from './ReportFilters';
import { PitchingCommandReportView } from './PitchingCommandReportView';
import { TeamGoalProgressReportView } from './TeamGoalProgressReportView';

interface ReportPreviewProps {
    reportType: ReportType | null;
    filters: ReportFiltersState;
    team: Team;
    players: Player[];
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
    reportType,
    filters,
    team,
    players,
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    if (!reportType) {
        return (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-muted/30 border-2 border-dashed border-border rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">No report generated yet</h3>
                <p className="text-muted-foreground max-w-xs mt-2">
                    Choose a report type and filters on the left, then click Generate.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Report Preview</h3>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Download PDF
                </button>
            </div>

            <div className="flex-1 bg-white border border-border rounded-xl shadow-sm overflow-hidden overflow-y-auto max-h-[800px]">
                <div id="printable-report" className="p-8 min-h-[1000px] bg-white text-black print:p-0 print:shadow-none">
                    {/* Print Header - Visible only in preview/print */}
                    <div className="mb-8 border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-black">{team.name}</h1>
                                <p className="text-gray-500 text-sm">Generated on {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-semibold text-primary">
                                    {reportType === 'pitching-command' && 'Pitching Command Report'}
                                    {reportType === 'team-goal-progress' && 'Team Goal Progress Report'}
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    {new Date(filters.dateRange.start).toLocaleDateString()} - {new Date(filters.dateRange.end).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="report-content">
                        {reportType === 'pitching-command' && (
                            <PitchingCommandReportView filters={filters} team={team} players={players} />
                        )}
                        {reportType === 'team-goal-progress' && (
                            <TeamGoalProgressReportView filters={filters} team={team} players={players} />
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-report, #printable-report * {
                        visibility: visible;
                    }
                    #printable-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        background: white;
                        color: black;
                    }
                    /* Hide scrollbars and other UI elements */
                    ::-webkit-scrollbar {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};
