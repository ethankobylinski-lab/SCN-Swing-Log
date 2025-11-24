import React, { useState, useMemo } from 'react';
import { Session, PitchSession, Player } from '../types';
import { formatDate } from '../utils/helpers';

interface WorkloadCalendarProps {
    hittingSessions: Session[];
    pitchingSessions: PitchSession[];
    players?: Player[]; // Optional, for coach view details
    days?: number;
}

interface DayWorkload {
    date: Date;
    key: string; // YYYY-MM-DD
    fullDateLabel: string;
    hittingReps: number;
    pitchingPitches: number;
    totalLoad: number;
    dominantType: 'hitting' | 'pitching' | 'mixed' | 'none';
    players: {
        id: string;
        name: string;
        reps: number;
        pitches: number;
        type: 'hitting' | 'pitching' | 'mixed';
    }[];
}

export const WorkloadCalendar: React.FC<WorkloadCalendarProps> = ({
    hittingSessions,
    pitchingSessions,
    players = [],
    days = 14
}) => {
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

    const workloadData = useMemo(() => {
        const today = new Date();
        const grid: (DayWorkload | null)[][] = [];
        const daysOfWeekOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Generate last N days
        const dateRange: Date[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dateRange.push(d);
        }

        // Map sessions to dates
        const dayMap = new Map<string, DayWorkload>();
        let maxLoad = 0;

        dateRange.forEach(date => {
            const key = date.toISOString().split('T')[0];
            dayMap.set(key, {
                date,
                key,
                fullDateLabel: formatDate(date.toISOString()),
                hittingReps: 0,
                pitchingPitches: 0,
                totalLoad: 0,
                dominantType: 'none',
                players: []
            });
        });

        // Process Hitting Sessions
        hittingSessions.forEach(session => {
            const key = session.date.split('T')[0];
            const day = dayMap.get(key);
            if (day) {
                const reps = session.sets.reduce((sum, s) => sum + s.repsAttempted, 0);
                day.hittingReps += reps;

                // Track player contribution
                let playerEntry = day.players.find(p => p.id === session.playerId);
                if (!playerEntry) {
                    const player = players.find(p => p.id === session.playerId);
                    playerEntry = {
                        id: session.playerId,
                        name: player?.name || 'Unknown Player',
                        reps: 0,
                        pitches: 0,
                        type: 'hitting'
                    };
                    day.players.push(playerEntry);
                }
                playerEntry.reps += reps;
                if (playerEntry.pitches > 0) playerEntry.type = 'mixed';
            }
        });

        // Process Pitching Sessions
        pitchingSessions.forEach(session => {
            const key = session.date.split('T')[0];
            const day = dayMap.get(key);
            if (day) {
                const pitches = session.totalPitches || 0;
                day.pitchingPitches += pitches;

                // Track player contribution
                let playerEntry = day.players.find(p => p.id === session.pitcherId);
                if (!playerEntry) {
                    const player = players.find(p => p.id === session.pitcherId);
                    playerEntry = {
                        id: session.pitcherId,
                        name: player?.name || 'Unknown Player',
                        reps: 0,
                        pitches: 0,
                        type: 'pitching'
                    };
                    day.players.push(playerEntry);
                }
                playerEntry.pitches += pitches;
                if (playerEntry.reps > 0) playerEntry.type = 'mixed';
                else playerEntry.type = 'pitching';
            }
        });

        // Finalize Day Data
        dayMap.forEach(day => {
            day.totalLoad = day.hittingReps + day.pitchingPitches;
            if (day.totalLoad > maxLoad) maxLoad = day.totalLoad;

            if (day.hittingReps > day.pitchingPitches) day.dominantType = 'hitting';
            else if (day.pitchingPitches > day.hittingReps) day.dominantType = 'pitching';
            else if (day.totalLoad > 0) day.dominantType = 'mixed'; // Equal load
        });

        // Build Grid (Weeks)
        let currentWeek: (DayWorkload | null)[] = new Array(7).fill(null);
        dateRange.forEach(date => {
            const dayOfWeek = date.getDay(); // 0 = Sun
            const key = date.toISOString().split('T')[0];
            currentWeek[dayOfWeek] = dayMap.get(key) || null;

            if (dayOfWeek === 6) { // Saturday, end of week
                grid.push(currentWeek);
                currentWeek = new Array(7).fill(null);
            }
        });
        if (currentWeek.some(d => d !== null)) {
            grid.push(currentWeek);
        }

        return { grid, daysOfWeekOrder, maxLoad, dayMap };
    }, [hittingSessions, pitchingSessions, players, days]);

    const selectedDay = selectedDayKey ? workloadData.dayMap.get(selectedDayKey) : null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1 mb-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Workload Calendar</h3>
                    <p className="text-xs text-muted-foreground">Tap a day to see details.</p>
                </div>
                <div className="flex gap-3 text-xs font-semibold uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-primary"></span>
                        <span className="text-muted-foreground">Hitting</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-accent"></span>
                        <span className="text-muted-foreground">Pitching</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                    {workloadData.daysOfWeekOrder.map(day => (
                        <span key={day}>{day}</span>
                    ))}
                </div>
                {workloadData.grid.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                        {week.map((day, dayIndex) => {
                            if (!day) {
                                return (
                                    <div
                                        key={`cell-${weekIndex}-${dayIndex}`}
                                        className="aspect-square rounded-md border border-dashed border-border/60 bg-muted/20"
                                    />
                                );
                            }

                            const intensity = workloadData.maxLoad > 0 ? day.totalLoad / workloadData.maxLoad : 0;

                            // Determine color based on dominant type
                            let backgroundColor = 'hsl(var(--muted))';
                            let textColor = 'hsl(var(--foreground))';

                            if (day.totalLoad > 0) {
                                const alpha = (0.3 + intensity * 0.7).toFixed(2);
                                if (day.dominantType === 'hitting') {
                                    backgroundColor = `rgba(var(--primary-rgb), ${alpha})`; // Blue-ish
                                    textColor = intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))';
                                } else if (day.dominantType === 'pitching') {
                                    backgroundColor = `rgba(249, 115, 22, ${alpha})`; // Orange/Accent (assuming accent is orange-ish or distinct)
                                    // Fallback if accent var isn't RGB compatible, hardcode orange for now or use a class
                                    // Using a safe approach:
                                } else {
                                    backgroundColor = `rgba(147, 51, 234, ${alpha})`; // Purple for mixed
                                    textColor = 'white';
                                }
                            }

                            // Inline styles for dynamic colors are tricky with Tailwind vars if not RGB. 
                            // Let's use classes for simplicity where possible, or style for opacity.
                            // Assuming --primary-rgb exists. For pitching, let's assume an orange-red.
                            const style: React.CSSProperties = {};
                            if (day.totalLoad > 0) {
                                if (day.dominantType === 'hitting') {
                                    style.backgroundColor = `hsl(var(--primary) / ${(0.3 + intensity * 0.7)})`;
                                    style.color = 'hsl(var(--primary-foreground))';
                                } else if (day.dominantType === 'pitching') {
                                    style.backgroundColor = `hsl(var(--accent) / ${(0.3 + intensity * 0.7)})`;
                                    style.color = 'hsl(var(--accent-foreground))';
                                } else {
                                    style.backgroundColor = `hsl(var(--secondary) / ${(0.3 + intensity * 0.7)})`;
                                    style.color = 'hsl(var(--secondary-foreground))';
                                }
                            } else {
                                style.backgroundColor = 'hsl(var(--muted))';
                                style.color = 'hsl(var(--muted-foreground))';
                            }

                            const isSelected = selectedDayKey === day.key;

                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => setSelectedDayKey(day.key)}
                                    className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-semibold transition-all focus:outline-none ${isSelected
                                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                                        : 'hover:ring-2 hover:ring-foreground/20'
                                        }`}
                                    style={style}
                                    title={`${day.fullDateLabel}: ${day.hittingReps} reps, ${day.pitchingPitches} pitches`}
                                >
                                    <span>{day.date.getDate()}</span>
                                    {day.totalLoad > 0 && (
                                        <span className="text-[9px] opacity-80">{day.totalLoad}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Details Section */}
            <div className="mt-4 border-t border-border pt-4 min-h-[100px]">
                {selectedDay ? (
                    selectedDay.totalLoad > 0 ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-foreground">{selectedDay.fullDateLabel}</h4>
                                <div className="text-xs text-muted-foreground space-x-3">
                                    <span>⚾️ {selectedDay.hittingReps} reps</span>
                                    <span>🎯 {selectedDay.pitchingPitches} pitches</span>
                                </div>
                            </div>

                            {selectedDay.players.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedDay.players.map(player => (
                                        <li key={player.id} className="flex justify-between items-center bg-muted/30 p-2 rounded-md text-sm">
                                            <span className="font-medium text-foreground">{player.name}</span>
                                            <div className="flex gap-3 text-xs text-muted-foreground">
                                                {player.reps > 0 && <span>{player.reps} reps</span>}
                                                {player.pitches > 0 && <span>{player.pitches} pitches</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Work logged, but player details unavailable.</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            No sessions logged on {selectedDay.fullDateLabel}.
                        </div>
                    )
                ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        Select a day to view workload details.
                    </div>
                )}
            </div>
        </div>
    );
};
