import React from 'react';
import { Team, Player } from '../types';
import { ReportFiltersState } from './ReportFilters';
import { useTeamGoalProgressReportData } from '../hooks/useReportsData';

interface TeamGoalProgressReportViewProps {
    filters: ReportFiltersState;
    team: Team;
    players: Player[];
}

export const TeamGoalProgressReportView: React.FC<TeamGoalProgressReportViewProps> = ({
    filters,
    team,
    players,
}) => {
    const data = useTeamGoalProgressReportData(filters, players, team.id);

    if (!data) {
        return (
            <div className="text-center py-12 text-gray-500">
                Please select a goal to view this report.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Goal Header */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{data.goal?.description}</h2>
                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                    <div>
                        <span className="font-semibold">Target:</span> {data.summary.targetValue} {data.goal?.metric}
                    </div>
                    <div>
                        <span className="font-semibold">Dates:</span> {new Date(data.goal?.startDate || '').toLocaleDateString()} - {new Date(data.goal?.targetDate || '').toLocaleDateString()}
                    </div>
                    <div>
                        <span className="font-semibold">Status:</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${data.summary.isOnPace ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {data.summary.isOnPace ? 'ON PACE' : 'BEHIND PACE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                    <span>Progress: {data.summary.currentValue} / {data.summary.targetValue}</span>
                    <span>{data.summary.percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${data.summary.isOnPace ? 'bg-primary' : 'bg-red-500'}`}
                        style={{ width: `${data.summary.percentComplete}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                    {data.summary.daysRemaining} days remaining
                </p>
            </div>

            {/* Leaderboard */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Contribution Leaderboard</h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-4 py-3 text-right">Contribution</th>
                            <th className="px-4 py-3 text-right">% of Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.leaderboard.length > 0 ? (
                            data.leaderboard.map((entry, index) => (
                                <tr key={entry.playerId}>
                                    <td className="px-4 py-3 text-gray-500 w-12">#{index + 1}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{entry.playerName}</td>
                                    <td className="px-4 py-3 text-right font-bold">{entry.contribution}</td>
                                    <td className="px-4 py-3 text-right text-gray-500">{entry.percentOfTotal}%</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    No contributions recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Notes Section */}
            {filters.includeNotes && (
                <div className="break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Coach's Takeaways</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[100px] border-dashed">
                        <p className="text-gray-400 italic text-sm">Write your observations here...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
