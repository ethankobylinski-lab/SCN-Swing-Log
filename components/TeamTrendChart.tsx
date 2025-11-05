import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendData {
  date: string;
  'Execution %': number;
}

interface TeamTrendChartProps {
  data: TrendData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
          <p className="label text-sm font-bold">{`${label}`}</p>
          <p style={{ color: payload[0].color }} className="text-xs font-semibold">
              {`${payload[0].name}: ${payload[0].value.toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
};

export const TeamTrendChart: React.FC<TeamTrendChartProps> = ({ data }) => {
  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-96">
        <h3 className="text-lg font-bold text-primary mb-4">Team Execution % (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line type="monotone" dataKey="Execution %" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
};