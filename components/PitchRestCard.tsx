import React from 'react';
import { usePitchRestStatus } from '../hooks/usePitchRestStatus';
import { formatDate } from '../utils/helpers';

interface PitchRestCardProps {
    playerId: string;
}

export const PitchRestCard: React.FC<PitchRestCardProps> = ({ playerId }) => {
    const { restStatus, loading } = usePitchRestStatus(playerId);

    if (loading) {
        return (
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
        );
    }

    if (!restStatus) {
        return null;
    }

    // No pitching sessions logged yet
    if (!restStatus.lastSessionDate) {
        return (
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-2">Pitching Rest Status</h3>
                <p className="text-sm text-muted-foreground">{restStatus.statusMessage}</p>
            </div>
        );
    }

    // Determine badge color classes
    const badgeClasses = {
        green: 'bg-green-500/20 text-green-700 border-green-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
        red: 'bg-red-500/20 text-red-700 border-red-500/30',
    };

    const formattedDate = formatDate(restStatus.lastSessionDate, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">Pitching Rest Status</h3>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClasses[restStatus.status]}`}
                >
                    {restStatus.statusLabel}
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last session:</span>
                    <span className="font-semibold text-foreground">
                        {formattedDate} · {restStatus.totalPitches} pitches
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Required rest:</span>
                    <span className="font-semibold text-foreground">
                        {restStatus.requiredRestDays?.toFixed(1)} days
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current rest:</span>
                    <span className="font-semibold text-foreground">
                        {restStatus.daysSinceLast?.toFixed(1)} days
                    </span>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                    {restStatus.statusMessage}
                </p>
            </div>

            {/* Optional: Show rule being used */}
            <div className="mt-2 text-xs text-muted-foreground">
                Using rule: {restStatus.restHoursPerPitch} hour{restStatus.restHoursPerPitch !== 1 ? 's' : ''} rest per pitch
            </div>
        </div>
    );
};
