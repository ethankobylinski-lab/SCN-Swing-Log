import React, { useMemo } from 'react';
import { Team, Player } from '../types';
import { ReportFiltersState } from './ReportFilters';
import { usePitchingCommandReportData } from '../hooks/useReportsData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface PitchingCommandReportViewProps {
    filters: ReportFiltersState;
    team: Team;
    players: Player[];
}

export const PitchingCommandReportView: React.FC<PitchingCommandReportViewProps> = ({
    filters,
    team,
    players,
}) => {
    const data = usePitchingCommandReportData(filters, players, team.id);

    // Prepare data for charts
    const pitchTypeChartData = useMemo(() => {
        // Aggregate across all players for the main chart
        const aggregated: Record<string, { name: string, strike: number, accuracy: number, count: number }> = {};

        data.playerStats.forEach(player => {
            Object.entries(player.pitchTypeBreakdown).forEach(([type, stats]) => {
                if (!aggregated[type]) {
                    aggregated[type] = { name: type, strike: 0, accuracy: 0, count: 0 };
                }
                // Weighted average accumulation
                const current = aggregated[type];
                const totalCount = current.count + stats.count;
                if (totalCount > 0) {
                    current.strike = (current.strike * current.count + stats.strikePercentage * stats.count) / totalCount;
                    current.accuracy = (current.accuracy * current.count + stats.accuracyPercentage * stats.count) / totalCount;
                    current.count = totalCount;
                }
            });
        });

        return Object.values(aggregated).sort((a, b) => b.count - a.count);
    }, [data.playerStats]);

    // Prepare Miss Pattern Data (Aggregated)
    const missPatternData = useMemo(() => {
        const total = { high: 0, low: 0, armSide: 0, gloveSide: 0 };
        data.playerStats.forEach(p => {
            total.high += p.missPatterns.high;
            total.low += p.missPatterns.low;
            total.armSide += p.missPatterns.armSide;
            total.gloveSide += p.missPatterns.gloveSide;
        });
        return total;
    }, [data.playerStats]);

    return (
        <div className="space-y-8">
            {/* Summary Section */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-primary">{data.summary.strikePercentage}%</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Strike %</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-gray-800">{data.summary.accuracyPercentage}%</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Accuracy %</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-gray-800">{data.summary.totalPitches}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Pitches</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-gray-800">{data.sessions.length}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Sessions Logged</div>
                </div>
            </div>

            {/* Player Table */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Player Breakdown</h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-4 py-3 text-center">Pitches</th>
                            <th className="px-4 py-3 text-center">Strike %</th>
                            <th className="px-4 py-3 text-center">Accuracy %</th>
                            <th className="px-4 py-3 text-center">Miss Tendency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.playerStats.length > 0 ? (
                            data.playerStats.map((stat) => (
                                <tr key={stat.playerId}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{stat.playerName}</td>
                                    <td className="px-4 py-3 text-center">{stat.totalPitches}</td>
                                    <td className="px-4 py-3 text-center font-bold">{stat.strikePercentage}%</td>
                                    <td className="px-4 py-3 text-center">{stat.accuracyPercentage}%</td>
                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            {stat.missPatterns.high > stat.missPatterns.low ? (
                                                <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded">High ({stat.missPatterns.high})</span>
                                            ) : stat.missPatterns.low > stat.missPatterns.high ? (
                                                <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Low ({stat.missPatterns.low})</span>
                                            ) : (
                                                <span className="text-gray-400">Balanced</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No data found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Charts Section */}
            {filters.includeCharts && (
                <div className="break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Visual Analysis</h3>
                    <div className="grid grid-cols-2 gap-8">
                        {/* Pitch Type Breakdown Chart */}
                        <div className="bg-white rounded-lg p-4 h-80 border border-gray-200 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-500 mb-4 text-center uppercase tracking-wider">Performance by Pitch Type</h4>
                            {pitchTypeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pitchTypeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Bar dataKey="strike" name="Strike %" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="accuracy" name="Accuracy %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 italic">
                                    No pitch type data available
                                </div>
                            )}
                        </div>

                        {/* Miss Pattern Visualization */}
                        <div className="bg-white rounded-lg p-4 h-80 border border-gray-200 shadow-sm flex flex-col">
                            <h4 className="text-sm font-semibold text-gray-500 mb-4 text-center uppercase tracking-wider">Miss Tendencies (Aggregate)</h4>
                            <div className="flex-1 flex items-center justify-center relative">
                                {/* Strike Zone Representation */}
                                <div className="w-32 h-40 border-2 border-gray-800 relative bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs font-bold">ZONE</span>
                                </div>

                                {/* Miss Indicators */}
                                {/* High */}
                                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                                    <span className="text-red-500 font-bold text-lg">{missPatternData.high}</span>
                                    <span className="text-xs text-gray-500 uppercase">High</span>
                                </div>
                                {/* Low */}
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                                    <span className="text-xs text-gray-500 uppercase">Low</span>
                                    <span className="text-blue-500 font-bold text-lg">{missPatternData.low}</span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-2">
                                * Shows count of pitches missing High vs Low
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Notes Section */}
            {filters.includeNotes && (
                <div className="break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Coaching Notes</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[100px] border-dashed">
                        <p className="text-gray-400 italic text-sm">Space for handwritten notes...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
