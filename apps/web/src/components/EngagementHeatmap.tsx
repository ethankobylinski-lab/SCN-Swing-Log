import React, { useMemo } from 'react';
import { Session, PitchSession } from '../types';
import { useTeamColor } from '../hooks/useTeamColor';

interface EngagementHeatmapProps {
    sessions: Session[];
    pitchSessions: PitchSession[];
    days?: number; // Default 28 days (4 weeks)
}

export const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
    sessions = [],
    pitchSessions = [],
    days = 28
}) => {
    const teamColor = useTeamColor();

    const heatmapData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data = [];

        // Generate last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Find sessions for this day
            const daySessions = sessions.filter(s => s.date.startsWith(dateStr));
            const dayPitchSessions = pitchSessions.filter(s => s.date.startsWith(dateStr));

            const totalSessions = daySessions.length + dayPitchSessions.length;

            // Count unique players
            const uniquePlayers = new Set([
                ...daySessions.map(s => s.playerId),
                ...dayPitchSessions.map(s => s.pitcherId)
            ]).size;

            data.push({
                date: date,
                dateStr,
                totalSessions,
                uniquePlayers,
                dayOfWeek: date.getDay() // 0 = Sunday
            });
        }

        return data;
    }, [sessions, pitchSessions, days]);

    // Calculate intensity levels based on max sessions
    const maxSessions = Math.max(...heatmapData.map(d => d.totalSessions), 1);

    const getIntensityColor = (count: number) => {
        if (count === 0) return 'bg-muted/30';

        const intensity = count / maxSessions;
        if (intensity < 0.25) return 'bg-primary/20';
        if (intensity < 0.5) return 'bg-primary/40';
        if (intensity < 0.75) return 'bg-primary/70';
        return 'bg-primary';
    };

    const getIntensityStyle = (count: number) => {
        if (count === 0) return { backgroundColor: 'rgba(0,0,0,0.05)' };

        const intensity = Math.max((count / maxSessions), 0.2); // Min 20% opacity if active
        return {
            backgroundColor: teamColor.primaryColor,
            opacity: intensity
        };
    };

    // Group by weeks for grid layout
    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentWeek = [];

        heatmapData.forEach((day, index) => {
            currentWeek.push(day);

            // If it's Saturday (6) or last day, push week
            if (day.dayOfWeek === 6 || index === heatmapData.length - 1) {
                // Pad beginning of first week if needed
                if (weeksArray.length === 0 && currentWeek.length < 7) {
                    const padding = 7 - currentWeek.length;
                    for (let i = 0; i < padding; i++) {
                        currentWeek.unshift(null);
                    }
                }
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        });

        return weeksArray;
    }, [heatmapData]);

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Activity Heatmap</h3>
                    <p className="text-sm text-muted-foreground">Session intensity over last 4 weeks</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-muted/30" />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: teamColor.primaryColor, opacity: 0.2 }} />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: teamColor.primaryColor, opacity: 0.5 }} />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: teamColor.primaryColor, opacity: 0.8 }} />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: teamColor.primaryColor, opacity: 1 }} />
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div className="flex gap-4">
                {/* Day Labels (Row Headers) */}
                <div className="flex flex-col gap-2 pt-6 text-xs text-muted-foreground text-right pr-2">
                    <div className="h-8 flex items-center justify-end">Sun</div>
                    <div className="h-8 flex items-center justify-end">Mon</div>
                    <div className="h-8 flex items-center justify-end">Tue</div>
                    <div className="h-8 flex items-center justify-end">Wed</div>
                    <div className="h-8 flex items-center justify-end">Thu</div>
                    <div className="h-8 flex items-center justify-end">Fri</div>
                    <div className="h-8 flex items-center justify-end">Sat</div>
                </div>

                {/* Heatmap Grid */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {weeks.map((week, weekIndex) => {
                        const weekStartDate = week.find(d => d !== null)?.date;
                        return (
                            <div key={weekIndex} className="flex flex-col gap-2">
                                {/* Week Label (Column Header) */}
                                <div className="h-4 text-[10px] text-muted-foreground whitespace-nowrap text-center">
                                    {weekStartDate ? weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                </div>
                                {week.map((day, dayIndex) => {
                                    if (!day) return <div key={`pad-${dayIndex}`} className="w-8 h-8" />;

                                    return (
                                        <div
                                            key={day.dateStr}
                                            className="w-8 h-8 rounded-md transition-all hover:scale-110 relative group cursor-default"
                                            style={getIntensityStyle(day.totalSessions)}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max">
                                                <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-md border border-border">
                                                    <p className="font-semibold">{day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                    <p>{day.totalSessions} sessions</p>
                                                    <p>{day.uniquePlayers} active players</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
                <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Total Sessions</p>
                    <p className="font-bold text-xl mt-1">
                        {heatmapData.reduce((sum, d) => sum + d.totalSessions, 0)}
                    </p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Active Days</p>
                    <p className="font-bold text-xl mt-1">
                        {heatmapData.filter(d => d.totalSessions > 0).length} / {days}
                    </p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Peak Day</p>
                    <p className="font-bold text-xl mt-1">
                        {maxSessions} <span className="text-xs font-normal text-muted-foreground">sessions</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
