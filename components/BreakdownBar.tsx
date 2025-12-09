import React from 'react';

export const BreakdownBar: React.FC<{ label: string; percentage: number; reps: number; colorClass?: string }> = ({ label, percentage, reps, colorClass = 'bg-primary' }) => (
    <div>
        <div className="flex justify-between items-baseline mb-2">
            <span className="font-semibold text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground font-medium">{reps} reps · {percentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className={`${colorClass} h-3 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
        </div>
    </div>
);