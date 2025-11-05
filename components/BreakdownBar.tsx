import React from 'react';

export const BreakdownBar: React.FC<{ label: string; percentage: number; reps: number; colorClass?: string }> = ({ label, percentage, reps, colorClass = 'bg-primary' }) => (
    <div>
        <div className="flex justify-between items-baseline text-sm font-medium text-card-foreground">
            <span className="font-bold">{label}</span>
            <span className="text-xs text-muted-foreground">{reps} reps</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
            <div className="w-full bg-muted rounded-full h-2">
                <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="font-semibold w-10 text-right">{percentage}%</span>
        </div>
    </div>
);