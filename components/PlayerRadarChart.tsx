import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Session } from '../types';
import { calculateExecutionPercentage, calculateHardHitPercentage, calculateStrikeoutPercentage } from '../utils/helpers';

interface PlayerRadarChartProps {
    sessions: Session[];
    playerName: string;
}

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

    const overallExecution = calculateExecutionPercentage(allSets);
    const power = calculateHardHitPercentage(allSets);
    const contact = 100 - calculateStrikeoutPercentage(allSets);

    const twoStrikeSets = allSets.filter(s => s.countSituation === 'Behind');
    const twoStrikeHitting = twoStrikeSets.length > 0 ? calculateExecutionPercentage(twoStrikeSets) : 0;
    
    const clutchSets = allSets.filter(s => s.baseRunners && s.baseRunners.length > 0);
    const clutchHitting = clutchSets.length > 0 ? calculateExecutionPercentage(clutchSets) : 0;
    
    return [
        { subject: 'Execution', value: overallExecution, fullMark: 100 },
        { subject: 'Power', value: power, fullMark: 100 },
        { subject: 'Contact', value: contact, fullMark: 100 },
        { subject: '2-Strike', value: twoStrikeHitting, fullMark: 100 },
        { subject: 'Clutch', value: clutchHitting, fullMark: 100 },
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