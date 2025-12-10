import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { getPitchingPerformanceOverTime } from '../utils/pitchingHelpers';
import { PitchSession } from '../types';

interface PitchingPerformanceChartProps {
    pitchSessions: PitchSession[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const formatValue = (pld: any) => {
            const value = typeof pld.value === 'number' ? pld.value : Number(pld.value ?? 0);
            return `${pld.name}: ${value.toFixed(1)}%`;
        };
        return (
            <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
                <p className="label text-sm font-bold">{`${label}`}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color }} className="text-xs font-semibold">
                        {formatValue(pld)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const PitchingPerformanceChart: React.FC<PitchingPerformanceChartProps> = ({ pitchSessions }) => {
    const data = useMemo(() => getPitchingPerformanceOverTime(pitchSessions), [pitchSessions]);

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full">
            <h3 className="text-lg font-bold text-primary mb-4">Performance Over Time</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            unit="%"
                            domain={[0, 100]}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="strikePct" name="Strike %" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="competitiveStrikePct" name="Competitive Strike %" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="targetHitPct" name="Target Hit %" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
