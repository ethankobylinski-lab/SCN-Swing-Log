import React, { useState, useMemo } from 'react';
import { Session, PitchSession, Drill } from '../types';
import { Button } from './Button';
import { ListSkeleton } from './LoadingSkeleton';
import { NoHistoryEmpty } from './EmptyState';
import { NoteIcon } from './icons/NoteIcon';
import { PitchSessionDetailModal } from './PitchSessionDetailModal';
import { ChevronRight } from 'lucide-react';
import {
    formatDate,
    describeRelativeDay,
    getSessionGoalProgress,
    calculateExecutionPercentage
} from '../utils/helpers';
import { generatePitchSessionTitle } from '../utils/sessionTitleGenerator';

interface SessionHistoryProps {
    sessions: Session[];
    pitchSessions: PitchSession[];
    drills: Drill[];
    onSelectSession: (session: Session | PitchSession) => void;
    onEditSession?: (session: Session) => void;
    loading?: boolean;
    hideFilters?: boolean;
    initialFilter?: 'all' | 'batting' | 'pitching';
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
    sessions,
    pitchSessions,
    drills,
    onSelectSession,
    onEditSession,
    loading = false,
    hideFilters = false,
    initialFilter = 'all'
}) => {
    const [sessionFilter, setSessionFilter] = useState<'all' | 'batting' | 'pitching'>(initialFilter);
    const [selectedPitchSession, setSelectedPitchSession] = useState<PitchSession | null>(null);

    // If filters are hidden, we assume the parent passed the correct filtered lists, 
    // but we still need to respect the filter state if it was set initially.
    // Actually, if hideFilters is true, we probably shouldn't filter inside here, 
    // or we should just use 'all' logic on the passed data.
    // But the stats calculation depends on the filter.

    // Let's assume if hideFilters is true, we just show everything passed in "unifiedSessions".

    /**
     * Calculate statistics for session history header tiles.
     */
    const stats = useMemo(() => {
        // === ALL TAB METRICS ===
        const totalSessions = sessions.length + pitchSessions.length;

        // Filter for batting sessions (hitting type or no type for backward compatibility)
        const battingSessions = sessions.filter(s => s.type === 'hitting' || !s.type);

        // Total batting reps across all batting sessions
        const battingReps = battingSessions
            .reduce((sum, s) => sum + s.sets.reduce((reps, set) => reps + set.repsAttempted, 0), 0);

        // Total pitches thrown across all pitching sessions
        const pitchingPitches = pitchSessions.reduce((sum, ps) => sum + (ps.totalPitches || 0), 0);

        // === BATTING TAB METRICS ===
        const totalBattingSessions = battingSessions.length;

        // Average execution percentage across all batting sessions
        const totalBattingAttempted = battingSessions
            .reduce((sum, s) => sum + s.sets.reduce((reps, set) => reps + set.repsAttempted, 0), 0);
        const totalBattingExecuted = battingSessions
            .reduce((sum, s) => sum + s.sets.reduce((exec, set) => exec + set.repsExecuted, 0), 0);
        const avgBattingExecution = totalBattingAttempted > 0
            ? Math.round((totalBattingExecuted / totalBattingAttempted) * 100)
            : 0;

        // === PITCHING TAB METRICS ===
        const totalPitchingSessions = pitchSessions.length;

        // Overall strike %
        const totalStrikes = pitchSessions.reduce((sum, ps) => {
            const strikePct = ps.analytics?.strikePct || 0;
            const pitches = ps.totalPitches || 0;
            return sum + Math.round((strikePct / 100) * pitches);
        }, 0);
        const overallStrikePercentage = pitchingPitches > 0
            ? Math.round((totalStrikes / pitchingPitches) * 100)
            : 0;

        // Average accuracy
        const avgAccuracy = pitchSessions.length > 0
            ? Math.round(
                pitchSessions.reduce((sum, ps) => sum + (ps.analytics?.accuracyHitRate || 0), 0)
                / pitchSessions.length
            )
            : 0;

        return {
            totalSessions,
            battingReps,
            pitchingPitches,
            totalBattingSessions,
            avgBattingExecution,
            totalPitchingSessions,
            overallStrikePercentage,
            avgAccuracy,
        };
    }, [sessions, pitchSessions]);

    // Create unified session list
    const unifiedSessions = useMemo(() => {
        const hitting = sessions.map(s => ({
            ...s,
            sessionType: 'hitting' as const,
            date: s.date,
            displayDate: s.date
        }));

        const pitching = pitchSessions
            .map(ps => ({
                id: ps.id,
                sessionType: 'pitching' as const,
                name: generatePitchSessionTitle(ps),
                date: ps.sessionEndTime || ps.createdAt,
                displayDate: ps.sessionEndTime || ps.createdAt,
                totalPitches: ps.totalPitches || 0,
                strikeRate: ps.analytics?.strikePct || 0,
                pitchSession: ps
            }));

        return [...hitting, ...pitching].sort((a, b) =>
            new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime()
        );
    }, [sessions, pitchSessions]);

    // Apply filter
    const filteredSessions = useMemo(() => {
        if (hideFilters) return unifiedSessions; // If filters hidden, show all (parent should filter)

        if (sessionFilter === 'batting') {
            return sessions.map(s => ({
                ...s,
                sessionType: 'hitting' as const,
                date: s.date,
                displayDate: s.date
            })).sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
        } else if (sessionFilter === 'pitching') {
            return unifiedSessions.filter(s => s.sessionType === 'pitching');
        }
        return unifiedSessions;
    }, [sessions, sessionFilter, unifiedSessions, hideFilters]);

    return (
        <div className="space-y-4">
            {/* Filter Buttons */}
            {!hideFilters && (
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">Filter:</span>
                    <div className="inline-flex rounded-lg border border-border overflow-hidden">
                        {(['all', 'batting', 'pitching'] as const).map((filter) => (
                            <Button
                                key={filter}
                                type="button"
                                onClick={() => setSessionFilter(filter)}
                                variant={sessionFilter === filter ? 'primary' : 'ghost'}
                                size="sm"
                            >
                                {filter === 'all' ? 'All Sessions' : filter === 'batting' ? 'Batting' : 'Pitching'}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Statistics - Tab-specific header tiles */}
            {/* Only show stats if not hiding filters, OR show relevant stats based on initialFilter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(sessionFilter === 'all' || (hideFilters && initialFilter === 'all')) && (
                    <>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Sessions</p>
                            <p className="text-3xl font-bold text-foreground">{stats.totalSessions}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Batting Reps</p>
                            <p className="text-3xl font-bold text-primary">{stats.battingReps.toLocaleString()}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pitches Thrown</p>
                            <p className="text-3xl font-bold text-accent">{(stats.pitchingPitches || 0).toLocaleString()}</p>
                        </div>
                    </>
                )}

                {(sessionFilter === 'batting' || (hideFilters && initialFilter === 'batting')) && (
                    <>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Batting Sessions</p>
                            <p className="text-3xl font-bold text-foreground">{stats.totalBattingSessions}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Reps</p>
                            <p className="text-3xl font-bold text-primary">{stats.battingReps.toLocaleString()}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg Execution %</p>
                            <p className="text-3xl font-bold text-primary">{stats.avgBattingExecution}%</p>
                        </div>
                    </>
                )}

                {(sessionFilter === 'pitching' || (hideFilters && initialFilter === 'pitching')) && (
                    <>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pitching Sessions</p>
                            <p className="text-3xl font-bold text-foreground">{stats.totalPitchingSessions}</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Overall Strike %</p>
                            <p className="text-3xl font-bold text-accent">{stats.overallStrikePercentage}%</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg Accuracy %</p>
                            <p className="text-3xl font-bold text-accent">{stats.avgAccuracy}%</p>
                        </div>
                    </>
                )}
            </div>

            {/* Filter placeholder */}
            {hideFilters && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Filter:</span>
                    <span>All sessions (filtering coming soon)</span>
                </div>
            )}

            {/* Session List */}
            <div className="space-y-3">
                <ul className="space-y-3">
                    {loading ? (
                        <ListSkeleton count={5} />
                    ) : filteredSessions.length > 0 ? filteredSessions.map((session: any) => {
                        const drill = drills.find(d => d.id === session.drillId);
                        const hasReflection = Boolean(session.reflection && session.reflection.trim().length > 0);
                        const editDescriptor = describeRelativeDay(session.updatedAt || session.createdAt);

                        const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelectSession(session);
                            }
                        };

                        // Check if it's a pitching session
                        if (session.sessionType === 'pitching') {
                            const pitches = session.totalPitches || 0;
                            const strikeRate = session.strikeRate || 0;
                            const hasNotes = session.pitchSession?.notes && session.pitchSession.notes.trim().length > 0;

                            return (
                                <li key={session.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedPitchSession(session.pitchSession);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group min-h-[72px]"
                                    >
                                        <div className="grid gap-4 items-center md:grid-cols-[1.5fr_1fr_1fr_auto]">
                                            <div>
                                                <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-1">{session.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(() => {
                                                        const dateStr = session.displayDate;
                                                        if (!dateStr) return 'N/A';
                                                        const date = new Date(dateStr);
                                                        if (isNaN(date.getTime())) return 'Invalid Date';
                                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                    })()}
                                                </p>
                                                <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-full font-medium">Pitching Session</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pitches</p>
                                                <p className="text-2xl font-bold text-foreground">{pitches}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Strike %</p>
                                                <p className={`text-2xl font-bold ${strikeRate === 0 ? 'text-muted-foreground' : 'text-accent'}`}>{strikeRate}%</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${hasNotes ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'text-muted-foreground bg-muted/30'}`}>
                                                    <NoteIcon filled={hasNotes} className={`w-3 h-3 ${hasNotes ? 'text-secondary' : 'text-muted-foreground'}`} />
                                                    {hasNotes ? 'Has notes' : 'No notes'}
                                                </span>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        }

                        // Hitting session rendering
                        const totalReps = session.sets ? session.sets.reduce((sum, set) => sum + set.repsAttempted, 0) : 0;
                        const execPct = session.sets ? calculateExecutionPercentage(session.sets) : 0;
                        const drillType = drill?.drillType || 'Session';

                        return (
                            <li key={session.id}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelectSession(session)}
                                    onKeyDown={handleKeyDown}
                                    className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group min-h-[72px]"
                                >
                                    <div className="grid gap-4 items-center md:grid-cols-[1.5fr_1fr_1fr_auto]">
                                        <div>
                                            <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-1">{session.name}</p>
                                            <p className="text-sm text-muted-foreground mb-1">
                                                {formatDate(session.date)}
                                                {editDescriptor && <span className="ml-2 text-xs">· Edited {editDescriptor}</span>}
                                            </p>
                                            <span className="inline-block text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{drillType}</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Reps</p>
                                            <p className="text-2xl font-bold text-foreground">{totalReps}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exec %</p>
                                            <p className={`text-2xl font-bold ${execPct === 0 ? 'text-muted-foreground' : 'text-primary'}`}>{execPct}%</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${hasReflection ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'text-muted-foreground bg-muted/30'}`}>
                                                <NoteIcon filled={hasReflection} className={`w-3 h-3 ${hasReflection ? 'text-secondary' : 'text-muted-foreground'}`} />
                                                {hasReflection ? 'Has notes' : 'No notes'}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    }) : (
                        <NoHistoryEmpty onLogSession={() => { }} />
                    )}
                </ul>
            </div>

            {/* Pitch Session Detail Modal */}
            {selectedPitchSession && (
                <PitchSessionDetailModal
                    session={selectedPitchSession}
                    onClose={() => setSelectedPitchSession(null)}
                />
            )}
        </div>
    );
};
