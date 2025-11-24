import React from 'react';
import { IntegrityAlert, IntegrityAlertType } from '../utils/teamInsights';

interface IntegrityAlertsProps {
    alerts: IntegrityAlert[];
}

export const IntegrityAlerts: React.FC<IntegrityAlertsProps> = ({ alerts }) => {
    const getAlertIcon = (type: IntegrityAlertType): string => {
        switch (type) {
            case 'perfect-streak': return '💯';
            case 'identical-counts': return '🔁';
            case 'no-variation': return '📊';
            case 'too-fast': return '⚡';
            default: return '⚠️';
        }
    };

    const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
        switch (severity) {
            case 'high': return 'bg-destructive/10 border-destructive/30 text-destructive';
            case 'medium': return 'bg-warning/10 border-warning/30 text-warning';
            case 'low': return 'bg-info/10 border-info/30 text-info';
        }
    };

    const getSeverityBadge = (severity: 'low' | 'medium' | 'high'): string => {
        switch (severity) {
            case 'high': return 'bg-destructive text-destructive-foreground';
            case 'medium': return 'bg-warning text-warning-foreground';
            case 'low': return 'bg-info text-info-foreground';
        }
    };

    if (alerts.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm p-12 text-center space-y-3">
                <div className="text-4xl">✅</div>
                <div>
                    <p className="font-semibold text-success">All Clear!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        No data integrity issues detected
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <span className="text-warning">🚨</span>
                    Integrity Alerts
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    {alerts.length} potential {alerts.length === 1 ? 'issue' : 'issues'} detected
                </p>
            </div>

            {/* Alert List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {alerts.map((alert, index) => (
                    <div
                        key={`${alert.playerId}-${alert.alertType}-${index}`}
                        className={`rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{getAlertIcon(alert.alertType)}</span>
                                <div>
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        {alert.playerName}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getSeverityBadge(alert.severity)} uppercase font-bold`}>
                                            {alert.severity}
                                        </span>
                                    </h4>
                                    <p className="text-sm mt-1 opacity-90">
                                        {alert.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Footer */}
            <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-muted-foreground text-center">
                    These alerts help identify unusual patterns that may indicate data quality issues.
                    Review with the player to ensure accurate logging.
                </p>
            </div>
        </div>
    );
};
