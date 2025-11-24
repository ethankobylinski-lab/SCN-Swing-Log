import React, { useState } from 'react';
import { PitchSessionAnalytics, PitchRecord } from '../../types';
import { ZoneHeatmap } from './ZoneHeatmap';
import { PitchTypeCommandChart } from './PitchTypeCommandChart';
import { MissDirectionCompass } from './MissDirectionCompass';
import { AccuracyTrendChart } from './AccuracyTrendChart';

interface AfterSessionReportModalProps {
    isOpen: boolean;
    analytics: PitchSessionAnalytics;
    pitches: PitchRecord[];
    totalPitches: number;
    sessionName: string;
    onClose: () => void;
}

/**
 * AfterSessionReportModal - Full-screen modal that appears after session save
 * Shows comprehensive analytics with visualizations and insights
 */
export const AfterSessionReportModal: React.FC<AfterSessionReportModalProps> = ({
    isOpen,
    analytics,
    pitches,
    totalPitches,
    sessionName,
    onClose
}) => {
    const [heatmapMode, setHeatmapMode] = useState<'intended' | 'actual' | 'overlay'>('overlay');

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            overflow: 'auto',
            padding: '1rem'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                padding: '2rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: '2rem',
                    borderBottom: '2px solid #e0e0e0',
                    paddingBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#333' }}>
                                Session Complete!
                            </h1>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '1rem' }}>
                                {sessionName} • {totalPitches} pitches
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* A. Summary Strip */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <MetricCard
                        label="Command+"
                        value={analytics.commandScore}
                        color="#2196F3"
                        suffix=""
                    />
                    <MetricCard
                        label="Strike%"
                        value={analytics.strikePct}
                        color="#4CAF50"
                    />
                    <MetricCard
                        label="Hit Target"
                        value={analytics.accuracyHitRate}
                        color="#FF9800"
                    />
                    <MetricCard
                        label="Proximity"
                        value={analytics.accuracyProximityAvg}
                        color="#9C27B0"
                        suffix=""
                        decimals={2}
                    />
                    <MetricCard
                        label="Pitches"
                        value={totalPitches}
                        color="#607D8B"
                        suffix=""
                    />
                </div>

                {/* B. Intended vs Actual Zone Heatmap */}
                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
                        📍 Command Zone Map
                    </h2>

                    {/* Toggle Controls */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        justifyContent: 'center'
                    }}>
                        {(['intended', 'actual', 'overlay'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setHeatmapMode(mode)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: heatmapMode === mode ? '2px solid #2196F3' : '1px solid #ddd',
                                    backgroundColor: heatmapMode === mode ? '#e3f2fd' : 'white',
                                    color: heatmapMode === mode ? '#2196F3' : '#666',
                                    fontWeight: heatmapMode === mode ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #e0e0e0'
                    }}>
                        <ZoneHeatmap pitches={pitches} mode={heatmapMode} />
                    </div>
                </section>

                {/* C. Pitch-Type Command Comparison */}
                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
                        🎯 Pitch Type Breakdown
                    </h2>
                    <div style={{
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #e0e0e0'
                    }}>
                        <PitchTypeCommandChart metrics={analytics.pitchTypeMetrics} />
                    </div>
                </section>

                {/* D. Miss Direction Compass */}
                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
                        🧭 Miss Pattern Analysis
                    </h2>
                    <div style={{
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #e0e0e0'
                    }}>
                        <MissDirectionCompass missPattern={analytics.missPattern} />
                    </div>
                </section>

                {/* E. Accuracy Trend Over Time */}
                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
                        📈 Command Trend
                    </h2>
                    <div style={{
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #e0e0e0'
                    }}>
                        <AccuracyTrendChart pitches={pitches} trend={analytics.trend} />
                    </div>
                </section>

                {/* F. Auto Coaching Insights */}
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
                        💡 Key Insights & Coaching Points
                    </h2>
                    <div style={{
                        backgroundColor: '#f0f7ff',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #bbdefb'
                    }}>
                        {analytics.insights.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                                {analytics.insights.map((insight, index) => (
                                    <li key={index} style={{ fontSize: '0.95rem', color: '#333', marginBottom: '0.5rem' }}>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#666' }}>
                                Keep logging sessions to build personalized insights!
                            </p>
                        )}
                    </div>
                </section>

                {/* Bottom CTA */}
                <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '1rem 2rem',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            maxWidth: '300px'
                        }}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper component for metric cards
const MetricCard: React.FC<{
    label: string;
    value: number;
    color: string;
    suffix?: string;
    decimals?: number;
}> = ({ label, value, color, suffix = '%', decimals = 0 }) => {
    const displayValue = decimals > 0 ? value.toFixed(decimals) : value.toString();

    return (
        <div style={{
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            border: `2px solid ${color}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500', marginBottom: '0.25rem' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color }}>
                {displayValue}{suffix}
            </div>
        </div>
    );
};
