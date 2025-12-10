import React from 'react';

export type ReportType = 'pitching-command' | 'team-goal-progress' | 'hitting-situation' | 'attendance' | 'team-snapshot';

interface ReportTypeSelectorProps {
    selectedType: ReportType | null;
    onSelect: (type: ReportType) => void;
}

export const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({ selectedType, onSelect }) => {
    const reportOptions: { id: ReportType; title: string; description: string; disabled?: boolean }[] = [
        {
            id: 'pitching-command',
            title: 'Pitching Command Report',
            description: 'Strike %, accuracy, miss patterns, and notes from bullpen sessions.',
        },
        {
            id: 'team-goal-progress',
            title: 'Team Goal Progress Report',
            description: 'Goal completion %, contribution leaderboard, and who is behind pace.',
        },
        {
            id: 'hitting-situation',
            title: 'Hitting Situation Report',
            description: 'Coming Soon',
            disabled: true,
        },
        {
            id: 'attendance',
            title: 'Attendance Report',
            description: 'Coming Soon',
            disabled: true,
        },
        {
            id: 'team-snapshot',
            title: 'Team Snapshot / Weekly Summary',
            description: 'Coming Soon',
            disabled: true,
        },
    ];

    return (
        <div className="space-y-3">
            <h3 className="font-semibold text-foreground">1. Select Report Type</h3>
            <div className="space-y-2">
                {reportOptions.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => !option.disabled && onSelect(option.id)}
                        disabled={option.disabled}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedType === option.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-background hover:bg-muted/50'
                            } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={`font-semibold ${selectedType === option.id ? 'text-primary' : 'text-foreground'}`}>
                                {option.title}
                            </span>
                            {selectedType === option.id && (
                                <span className="text-primary text-sm font-bold">✓</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
