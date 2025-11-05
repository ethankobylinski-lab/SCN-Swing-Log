import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Brush } from 'recharts';
import { addTrendLineData } from '../utils/helpers';

interface ChartData {
  name: string;
  [key: string]: any;
}

interface AnalyticsChartsProps {
    performanceOverTimeData: ChartData[];
    drillSuccessData: ChartData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const filteredPayload = payload.filter((p: any) => !p.dataKey.includes('Trend'));
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
          <p className="label text-sm font-bold">{`${label}`}</p>
          {filteredPayload.map((pld: any, index: number) => (
              <p key={index} style={{ color: pld.color }} className="text-xs font-semibold">
                  {`${pld.name}: ${pld.value.toFixed(1)}%`}
              </p>
          ))}
        </div>
      );
    }
    return null;
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
        <div className="h-80">
            {children}
        </div>
    </div>
);

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ performanceOverTimeData, drillSuccessData }) => {
  const performanceDataWithTrend = useMemo(() => {
    if (!performanceOverTimeData || performanceOverTimeData.length < 2) {
      return performanceOverTimeData;
    }
    let data = addTrendLineData(performanceOverTimeData, 'Execution %');
    data = addTrendLineData(data, 'Hard Hit %');
    return data;
  }, [performanceOverTimeData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Performance Over Time">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceDataWithTrend}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '14px' }}/>
                    <Line type="monotone" dataKey="Execution %" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} dot={false} />
                    <Line type="monotone" dataKey="Hard Hit %" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    <Line dataKey="Execution % Trend" name="Execution Trend" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line dataKey="Hard Hit % Trend" name="Hard Hit Trend" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Brush dataKey="name" height={30} stroke="hsl(var(--primary))" fill="hsl(var(--muted))" />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Drill Success Rates">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drillSuccessData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '14px' }}/>
                    <Bar dataKey="Success Rate" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    </div>
  );
};