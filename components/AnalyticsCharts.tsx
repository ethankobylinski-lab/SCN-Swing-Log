
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ChartData {
  name: string;
  [key: string]: any;
}

interface AnalyticsChartsProps {
    playerExecutionData: ChartData[];
    drillSuccessData: ChartData[];
    hardHitData: ChartData[];
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-base-200 p-4 rounded-lg shadow-lg">
        <h3 className="text-lg font-bold text-secondary mb-4">{title}</h3>
        <div className="h-64 md:h-80">
            {children}
        </div>
    </div>
);

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ playerExecutionData, drillSuccessData, hardHitData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Execution % Over Time">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={playerExecutionData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1D2D44', border: '1px solid #3E5C76' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Execution %" stroke="#3E92CC" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Drill Success Rates">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drillSuccessData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1D2D44', border: '1px solid #3E5C76' }} />
                    <Legend />
                    <Bar dataKey="Success Rate" fill="#3E92CC" />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hard Hit %">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hardHitData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1D2D44', border: '1px solid #3E5C76' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Hard Hit %" stroke="#D8315B" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    </div>
  );
};
