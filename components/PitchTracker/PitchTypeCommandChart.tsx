import React from 'react';
import { PitchTypeMetrics } from '../../types';

interface PitchTypeCommandChartProps {
    metrics: PitchTypeMetrics[];
}

/**
 * PitchTypeCommandChart - Horizontal grouped bar chart for pitch type comparison
 */
export const PitchTypeCommandChart: React.FC<PitchTypeCommandChartProps> = ({ metrics }) => {
    if (metrics.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                No pitch type data available
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem 0' }}>
            {metrics.map((pitchMetric) => (
                <div key={pitchMetric.pitchTypeId} style={{ marginBottom: '1.5rem' }}>
                    {/* Pitch Type Name */}
                    <div style={{
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        marginBottom: '0.5rem',
                        color: '#333'
                    }}>
                        {pitchMetric.pitchTypeName} ({pitchMetric.count} pitches)
                    </div>

                    {/* Metrics Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {/* Strike % */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '90px', fontSize: '0.8rem', color: '#666' }}>
                                Strike%
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#e0e0e0', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${pitchMetric.strikePct}%`,
                                        height: '100%',
                                        backgroundColor: '#4CAF50',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingLeft: '0.5rem',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {pitchMetric.strikePct > 15 && `${pitchMetric.strikePct}%`}
                                </div>
                            </div>
                            {pitchMetric.strikePct <= 15 && (
                                <span style={{ fontSize: '0.75rem', color: '#666', width: '35px' }}>
                                    {pitchMetric.strikePct}%
                                </span>
                            )}
                        </div>

                        {/* Hit Target % */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '90px', fontSize: '0.8rem', color: '#666' }}>
                                Hit Target
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#e0e0e0', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${pitchMetric.accuracyHitRate}%`,
                                        height: '100%',
                                        backgroundColor: '#2196F3',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingLeft: '0.5rem',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {pitchMetric.accuracyHitRate > 15 && `${pitchMetric.accuracyHitRate}%`}
                                </div>
                            </div>
                            {pitchMetric.accuracyHitRate <= 15 && (
                                <span style={{ fontSize: '0.75rem', color: '#666', width: '35px' }}>
                                    {pitchMetric.accuracyHitRate}%
                                </span>
                            )}
                        </div>

                        {/* Proximity Score */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '90px', fontSize: '0.8rem', color: '#666' }}>
                                Proximity
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#e0e0e0', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${pitchMetric.accuracyProximityAvg * 100}%`,
                                        height: '100%',
                                        backgroundColor: '#FF9800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingLeft: '0.5rem',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {pitchMetric.accuracyProximityAvg > 0.15 && pitchMetric.accuracyProximityAvg.toFixed(2)}
                                </div>
                            </div>
                            {pitchMetric.accuracyProximityAvg <= 0.15 && (
                                <span style={{ fontSize: '0.75rem', color: '#666', width: '35px' }}>
                                    {pitchMetric.accuracyProximityAvg.toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
