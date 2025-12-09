import React from 'react';

export const BreakdownBar: React.FC<{ label: string; percentage: number; reps: number; colorClass?: string }> = ({ label, percentage, reps, colorClass = 'bg-primary' }) => (
    <div>
        <div className="flex justify-between items-baseline text-base font-semibold text-card-foreground">
            <span className="font-bold">{label}</span>
            <span className="text-sm text-muted-foreground font-medium">{reps} reps</span>
        </div>
        <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-full bg-muted rounded-full h-2.5">
                <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="font-bold text-base w-12 text-right text-foreground">{percentage}%</span>
        </div>
    </div>
);