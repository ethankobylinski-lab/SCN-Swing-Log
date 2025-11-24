import React from 'react';
import { WeeklyTrend } from '../utils/teamInsights';

interface TeamTrendChartProps {
  data: WeeklyTrend[];
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export const TeamTrendChart: React.FC<TeamTrendChartProps> = ({ data, title, subtitle, headerRight }) => {
  if (data.length === 0 || data.every(d => d.avgReps === 0)) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center">
        <p className="text-muted-foreground">Not enough data to show trends yet</p>
      </div>
    );
  }

  // Find max values for scaling
  const maxReps = Math.max(...data.map(d => d.avgReps), 1);
  const maxExecution = 100; // Percentage is always 0-100

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title || 'Week-over-Week Trends'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle || 'Tracking team improvement over the past 4 weeks'}
          </p>
        </div>
        {headerRight}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Latest Avg Reps</p>
          <p className="text-2xl font-bold text-primary">{data[data.length - 1]?.avgReps || 0}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Latest Execution</p>
          <p className="text-2xl font-bold text-secondary">{data[data.length - 1]?.avgExecution || 0}%</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trend</p>
          <p className="text-2xl font-bold text-accent">
            {(() => {
              if (data.length < 2) return '—';
              const first = data[0].avgExecution;
              const last = data[data.length - 1].avgExecution;
              const diff = last - first;
              if (diff > 0) return `+${diff}%`;
              if (diff < 0) return `${diff}%`;
              return '—';
            })()}
          </p>
        </div>
      </div>

      {/* Line Chart Visualization */}
      <div className="space-y-4">
        {/* Reps Trend */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            Average Reps per Session
          </h4>
          <div className="space-y-2">
            {data.map((week, index) => {
              const width = maxReps > 0 ? (week.avgReps / maxReps) * 100 : 0;
              return (
                <div key={week.weekLabel} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground">
                    {week.weekLabel}
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                      style={{ width: `${width}%` }}
                    >
                      {week.avgReps > 0 && (
                        <span className="text-xs font-bold text-primary-foreground">
                          {week.avgReps}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution Trend */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary" />
            Average Execution %
          </h4>
          <div className="space-y-2">
            {data.map((week, index) => {
              const width = week.avgExecution;
              return (
                <div key={week.weekLabel} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground">
                    {week.weekLabel}
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-secondary h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                      style={{ width: `${width}%` }}
                    >
                      {week.avgExecution > 0 && (
                        <span className="text-xs font-bold text-secondary-foreground">
                          {week.avgExecution}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insight */}
      {data.length >= 2 && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-info mb-2 flex items-center gap-2">
              💡 Trend Insight
            </h4>
            <p className="text-xs text-foreground">
              {(() => {
                const firstWeek = data[0];
                const lastWeek = data[data.length - 1];
                const execDiff = lastWeek.avgExecution - firstWeek.avgExecution;
                const repsDiff = lastWeek.avgReps - firstWeek.avgReps;

                if (execDiff > 5) {
                  return `📈 Team execution is improving! Up ${execDiff}% from week 1.`;
                } else if (execDiff < -5) {
                  return `📉 Team execution has decreased by ${Math.abs(execDiff)}%. Consider reviewing training focus.`;
                } else if (repsDiff > 10) {
                  return `🔥 Training volume is increasing! Average reps up by ${repsDiff}.`;
                } else {
                  return `✅ Team performance is stable over the past 4 weeks.`;
                }
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
