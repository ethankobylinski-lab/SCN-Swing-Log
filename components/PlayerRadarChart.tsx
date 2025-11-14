import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Session, SetResult } from '../types';

interface PlayerRadarChartProps {
    sessions: Session[];
    playerName: string;
}

const clampGrade = (grade?: number) => {
    if (typeof grade !== 'number' || Number.isNaN(grade)) {
        return 5;
    }
    return Math.min(10, Math.max(1, grade));
};

const perSetExecution = (set: SetResult) => {
    const attempted = set.repsAttempted ?? 0;
    if (attempted === 0) return 0;
    return Math.max(0, Math.min(100, ((set.repsExecuted ?? 0) / attempted) * 100));
};

const perSetPower = (set: SetResult) => {
    const attempted = set.repsAttempted ?? 0;
    if (attempted === 0) return 0;
    return Math.max(0, Math.min(100, ((set.hardHits ?? 0) / attempted) * 100));
};

const perSetContact = (set: SetResult) => {
    const attempted = set.repsAttempted ?? 0;
    if (attempted === 0) return 0;
    const strikeouts = set.strikeouts ?? 0;
    const contactRate = ((attempted - strikeouts) / attempted) * 100;
    return Math.max(0, Math.min(100, contactRate));
};

const weightedMetric = (sets: SetResult[], metricFn: (set: SetResult) => number) => {
    let totalWeight = 0;
    let weightedSum = 0;
    sets.forEach((set) => {
        const reps = set.repsAttempted ?? 0;
        if (reps <= 0) {
            return;
        }
        const weight = reps * clampGrade(set.grade);
        totalWeight += weight;
        weightedSum += metricFn(set) * weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

const calculateStats = (sessions: Session[]) => {
    const allSets = sessions.flatMap(s => s.sets);
    if (allSets.length === 0) {
        return [
            { subject: 'Execution', value: 0, fullMark: 100 },
            { subject: 'Power', value: 0, fullMark: 100 },
            { subject: 'Contact', value: 0, fullMark: 100 },
            { subject: '2-Strike', value: 0, fullMark: 100 },
            { subject: 'Clutch', value: 0, fullMark: 100 },
        ];
    }

    const overallExecution = weightedMetric(allSets, perSetExecution);
    const power = weightedMetric(allSets, perSetPower);
    const contact = weightedMetric(allSets, perSetContact);

    const twoStrikeSets = allSets.filter(s => s.countSituation === 'Behind');
    const twoStrikeHitting = twoStrikeSets.length > 0 ? weightedMetric(twoStrikeSets, perSetExecution) : 0;

    const clutchSets = allSets.filter(s => Array.isArray(s.baseRunners) && s.baseRunners.length > 0);
    const clutchHitting = clutchSets.length > 0 ? weightedMetric(clutchSets, perSetExecution) : 0;

    const toWhole = (value: number) => Math.round(value);

    return [
        { subject: 'Execution', value: toWhole(overallExecution), fullMark: 100 },
        { subject: 'Power', value: toWhole(power), fullMark: 100 },
        { subject: 'Contact', value: toWhole(contact), fullMark: 100 },
        { subject: '2-Strike', value: toWhole(twoStrikeHitting), fullMark: 100 },
        { subject: 'Clutch', value: toWhole(clutchHitting), fullMark: 100 },
    ];
};


export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ sessions, playerName }) => {
    const chartData = calculateStats(sessions);
    
    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-4 text-center">Player Skill Radar</h3>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={playerName} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                        <Tooltip contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                            color: 'hsl(var(--popover-foreground))',
                        }} />
                        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
