import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Brush, ComposedChart } from 'recharts';
import { addTrendLineData } from '../utils/helpers';

interface ChartData {
  name: string;
  [key: string]: any;
}

interface AnalyticsChartsProps {
  performanceOverTimeData: ChartData[];
  drillSuccessData?: ChartData[];
  performanceMetricKey?: string;
  performanceMetricLabel?: string;
  volumeMetricKey?: string;
  volumeMetricLabel?: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter((p: any) => !p.dataKey.includes('Trend'));
    const formatValue = (pld: any) => {
      if (pld.dataKey === 'Total Reps' || pld.dataKey === 'Total Pitches') {
        return `${pld.name}: ${Math.round(pld.value).toLocaleString()} ${pld.dataKey === 'Total Pitches' ? 'pitches' : 'reps'}`;
      }
      const value = typeof pld.value === 'number' ? pld.value : Number(pld.value ?? 0);
      return `${pld.name}: ${value.toFixed(1)}%`;
    };
    return (
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
        <p className="label text-sm font-bold">{`${label}`}</p>
        {filteredPayload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }} className="text-xs font-semibold">
            {formatValue(pld)}
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

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  performanceOverTimeData,
  drillSuccessData,
  performanceMetricKey = 'Execution %',
  performanceMetricLabel = 'Execution %',
  volumeMetricKey = 'Total Reps',
  volumeMetricLabel = 'Total Reps'
}) => {
  const performanceDataWithTrend = useMemo(() => {
    if (!performanceOverTimeData || performanceOverTimeData.length < 2) {
      return performanceOverTimeData;
    }
    let data = addTrendLineData(performanceOverTimeData, performanceMetricKey);
    // Only add hard hit trend if it exists in data
    if (performanceOverTimeData[0] && 'Hard Hit %' in performanceOverTimeData[0]) {
      data = addTrendLineData(data, 'Hard Hit %');
    }
    return data;
  }, [performanceOverTimeData, performanceMetricKey]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Performance Over Time">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={performanceDataWithTrend}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="percentage"
              stroke="hsl(var(--muted-foreground))"
              unit="%"
              domain={[0, 100]}
              allowDecimals={false}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              domain={[0, 'auto']}
              allowDecimals={false}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar
              yAxisId="volume"
              dataKey={volumeMetricKey}
              name={volumeMetricLabel}
              fill="hsl(var(--secondary))"
              fillOpacity={0.25}
              stroke="hsl(var(--secondary))"
              barSize={16}
              isAnimationActive={true}
              animationDuration={400}
              animationEasing="ease-out"
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey={performanceMetricKey}
              name={performanceMetricLabel}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={false}
              isAnimationActive={true}
              animationDuration={700}
              animationEasing="ease-out"
            />
            {performanceDataWithTrend.length > 0 && 'Hard Hit %' in performanceDataWithTrend[0] && (
              <Line
                yAxisId="percentage"
                type="monotone"
                dataKey="Hard Hit %"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
                animationBegin={100}
              />
            )}
            <Line yAxisId="percentage" dataKey={`${performanceMetricKey} Trend`} name={`${performanceMetricLabel} Trend`} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            {performanceDataWithTrend.length > 0 && 'Hard Hit %' in performanceDataWithTrend[0] && (
              <Line yAxisId="percentage" dataKey="Hard Hit % Trend" name="Hard Hit Trend" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            )}
            <Brush dataKey="name" height={30} stroke="hsl(var(--primary))" fill="hsl(var(--muted))" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {drillSuccessData && (
        <ChartCard title="Drill Success Rates">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drillSuccessData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <Bar
                dataKey="Success Rate"
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
};
