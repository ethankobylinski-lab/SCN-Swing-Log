import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PitchRecord, PitchTypeModel } from '../types';
import {
    calculateStrikePercentage,
    calculateTargetHitPercentage
} from '../utils/pitchingHelpers';

interface PitchCommandRadarProps {
    pitchRecords: PitchRecord[];
    pitchTypes: PitchTypeModel[];
    playerName: string;
}

export const PitchCommandRadar: React.FC<PitchCommandRadarProps> = ({ pitchRecords, pitchTypes, playerName }) => {
    const chartData = useMemo(() => {
        if (pitchRecords.length === 0 || pitchTypes.length === 0) {
            // Show common pitch types as placeholders
            return [
                { subject: 'Fastball', accuracy: 0, strike: 0, fullMark: 100 },
                { subject: 'Changeup', accuracy: 0, strike: 0, fullMark: 100 },
                { subject: 'Curveball', accuracy: 0, strike: 0, fullMark: 100 },
                { subject: 'Slider', accuracy: 0, strike: 0, fullMark: 100 },
            ];
        }

        // Group pitches by type and calculate metrics
        const pitchTypeData = new Map<string, PitchRecord[]>();
        pitchRecords.forEach(pitch => {
            if (!pitchTypeData.has(pitch.pitchTypeId)) {
                pitchTypeData.set(pitch.pitchTypeId, []);
            }
            pitchTypeData.get(pitch.pitchTypeId)!.push(pitch);
        });

        return pitchTypes
            .filter(pt => pitchTypeData.has(pt.id))
            .map(pitchType => {
                const pitches = pitchTypeData.get(pitchType.id) || [];
                const accuracy = calculateTargetHitPercentage(pitches);
                const strike = calculateStrikePercentage(pitches);

                return {
                    subject: pitchType.name,
                    accuracy,
                    strike,
                    fullMark: 100,
                };
            });
    }, [pitchRecords, pitchTypes]);

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full">
            <h3 className="text-lg font-bold text-primary mb-4 text-center">Pitch Command by Type</h3>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Accuracy %" dataKey="accuracy" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.5} />
                        <Radar name="Strike %" dataKey="strike" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                            color: 'hsl(var(--popover-foreground))',
                        }} />
                        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
