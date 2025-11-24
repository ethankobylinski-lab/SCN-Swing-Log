import React, { useState, useEffect, useContext, useMemo } from 'react';
import { PitchSession, PitchRecord, PitchTypeModel } from '../types';
import { DataContext } from '../contexts/DataContext';
import { Modal } from './Modal';
import { getPitchTypeDisplayName } from '../utils/pitchTypeHelpers';
import { getShortZoneLabel } from '../utils/zoneDescriptions';

interface PitchSessionDetailModalProps {
    session: PitchSession | null;
    onClose: () => void;
}

export const PitchSessionDetailModal: React.FC<PitchSessionDetailModalProps> = ({ session, onClose }) => {
    const { getPitchHistory, getPitchTypesForPitcher } = useContext(DataContext);
    const [pitchRecords, setPitchRecords] = useState<PitchRecord[]>([]);
    const [pitchTypes, setPitchTypes] = useState<PitchTypeModel[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'strikes' | 'balls' | 'hits'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    useEffect(() => {
        if (!session) {
            setPitchRecords([]);
            setPitchTypes([]);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const [records, types] = await Promise.all([
                    getPitchHistory(session.id),
                    getPitchTypesForPitcher(session.pitcherId)
                ]);
                setPitchRecords(records);
                setPitchTypes(types);
            } catch (error) {
                console.error('Error fetching pitch session details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session, getPitchHistory, getPitchTypesForPitcher]);

    // Reset filters when session changes
    useEffect(() => {
        setOutcomeFilter('all');
        setTypeFilter('all');
    }, [session]);

    if (!session) return null;

    const analytics = session.analytics || {};
    const strikeRate = analytics.strikePct || 0;
    const totalPitches = session.totalPitches || 0;

    /**
     * Get human-readable pitch type name for display.
     */
    const getPitchTypeName = (pitch: PitchRecord) => {
        const typeId = pitch.pitchTypeId;
        if (!typeId) return 'Unknown';
        const type = pitchTypes.find(t => t.id === typeId);
        if (!type) return 'Unknown';
        return getPitchTypeDisplayName(type.code, type.name);
    };

    const getPitchTypeColor = (pitch: PitchRecord) => {
        const typeId = pitch.pitchTypeId;
        if (!typeId) return '#888888';
        const type = pitchTypes.find(t => t.id === typeId);
        return type?.colorHex || '#888888';
    };

    const getOutcomeLabel = (outcome: string) => {
        switch (outcome) {
            case 'called_strike': return 'Called Strike';
            case 'swinging_strike': return 'Swinging Strike';
            case 'foul': return 'Foul';
            case 'ball': return 'Ball';
            case 'in_play': return 'In Play';
            default: return outcome;
        }
    };

    // Calculate accuracy stats (based on ALL records, not filtered)
    const accuracyStats = pitchRecords.reduce((acc, pitch) => {
        const hitTarget = pitch.targetZone === pitch.actualZone;
        return {
            total: acc.total + 1,
            hits: acc.hits + (hitTarget ? 1 : 0)
        };
    }, { total: 0, hits: 0 });

    const accuracyPct = accuracyStats.total > 0
        ? Math.round((accuracyStats.hits / accuracyStats.total) * 100)
        : 0;

    // Filter and Sort Records
    const filteredRecords = useMemo(() => {
        return pitchRecords.filter(pitch => {
            // Filter by Outcome
            if (outcomeFilter === 'strikes') {
                if (!['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(pitch.outcome)) return false;
            } else if (outcomeFilter === 'balls') {
                if (pitch.outcome !== 'ball') return false;
            } else if (outcomeFilter === 'hits') {
                if (pitch.targetZone !== pitch.actualZone) return false;
            }

            // Filter by Pitch Type
            if (typeFilter !== 'all') {
                if (pitch.pitchTypeId !== typeFilter) return false;
            }

            return true;
        });
    }, [pitchRecords, outcomeFilter, typeFilter]);

    const sortedFilteredRecords = [...filteredRecords].sort((a, b) => {
        if (a.index && b.index) return a.index - b.index;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    // Get unique pitch types used in this session for the filter dropdown
    const usedPitchTypes = useMemo(() => {
        const typeIds = new Set(pitchRecords.map(p => p.pitchTypeId));
        return pitchTypes.filter(pt => typeIds.has(pt.id));
    }, [pitchRecords, pitchTypes]);

    return (
        <Modal isOpen={true} onClose={onClose} title="Pitch Session Details">
            <div className="space-y-6">
                {/* Session Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Pitches */}
                    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /><circle cx="12" cy="12" r="5" /></svg>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Pitches</p>
                        <p className="text-3xl font-bold text-foreground">{totalPitches}</p>
                    </div>

                    {/* Strike % */}
                    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-primary">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Strike %</p>
                        <p className="text-3xl font-bold text-primary">{strikeRate}%</p>
                    </div>

                    {/* Location Accuracy */}
                    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-secondary">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Accuracy</p>
                        <p className="text-3xl font-bold text-secondary">{accuracyPct}%</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{accuracyStats.hits}/{accuracyStats.total} hit target</p>
                    </div>

                    {/* Session Date */}
                    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Date</p>
                        <p className="text-xl font-bold text-foreground">
                            {(() => {
                                const dateStr = session.sessionEndTime || session.createdAt;
                                if (!dateStr) return 'N/A';
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return 'Invalid';
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            })()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            {(() => {
                                const dateStr = session.sessionEndTime || session.createdAt;
                                if (!dateStr) return '';
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return '';
                                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            })()}
                        </p>
                    </div>
                </div>

                {/* Filters & Pitch List */}
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-lg font-bold text-foreground">Pitch Breakdown</h3>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <select
                                value={outcomeFilter}
                                onChange={(e) => setOutcomeFilter(e.target.value as any)}
                                className="bg-background border border-border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="all">All Outcomes</option>
                                <option value="strikes">Strikes Only</option>
                                <option value="balls">Balls Only</option>
                                <option value="hits">Hit Target Only</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-background border border-border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="all">All Pitch Types</option>
                                {usedPitchTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {getPitchTypeDisplayName(type.code, type.name)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : pitchRecords.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 bg-muted/20 rounded-lg">No pitch data available for this session.</p>
                    ) : sortedFilteredRecords.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 bg-muted/20 rounded-lg">No pitches match the selected filters.</p>
                    ) : (
                        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-12">#</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Pitch Type</th>
                                            <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Count</th>
                                            <th className="text-center py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Intended</th>
                                            <th className="text-center py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Actual</th>
                                            <th className="text-center py-3 px-4 font-semibold text-muted-foreground sm:hidden">Loc</th>
                                            <th className="text-center py-3 px-4 font-semibold text-muted-foreground" title="Hit Target?">Hit?</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sortedFilteredRecords.map((pitch, index) => {
                                            const isStrike = ['called_strike', 'swinging_strike', 'foul', 'in_play'].includes(pitch.outcome);
                                            const pitchNum = pitch.index || index + 1;
                                            const hitTarget = pitch.targetZone === pitch.actualZone;
                                            const targetLabel = getShortZoneLabel(pitch.targetZone);
                                            const actualLabel = getShortZoneLabel(pitch.actualZone);

                                            return (
                                                <tr key={pitch.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{pitchNum}</td>
                                                    <td className="py-3 px-4">
                                                        <span
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                                                            style={{ backgroundColor: getPitchTypeColor(pitch) }}
                                                        >
                                                            {getPitchTypeName(pitch)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-muted-foreground font-mono">
                                                        {pitch.ballsBefore}-{pitch.strikesBefore}
                                                    </td>
                                                    {/* Desktop View for Location */}
                                                    <td className="py-3 px-4 text-center text-xs hidden sm:table-cell">{targetLabel}</td>
                                                    <td className="py-3 px-4 text-center text-xs hidden sm:table-cell">{actualLabel}</td>

                                                    {/* Mobile View for Location (Combined) */}
                                                    <td className="py-3 px-4 text-center text-xs sm:hidden">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-muted-foreground text-[10px]">T: {targetLabel}</span>
                                                            <span className="font-medium">A: {actualLabel}</span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        {hitTarget ? (
                                                            <div className="flex justify-center">
                                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-success/10 text-success">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-center">
                                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground/50">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs font-medium ${isStrike ? 'text-success' : 'text-muted-foreground'}`}>
                                                            {getOutcomeLabel(pitch.outcome)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end pt-2 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};
