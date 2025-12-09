import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext, PitchingStatsSummary } from '../contexts/DataContext';
import { Dashboard } from './Dashboard';
import { ToastProvider } from './ToastProvider';
import { LoadingSkeleton, SessionCardSkeleton, StatCardSkeleton, ListSkeleton, ChartSkeleton } from './LoadingSkeleton';
import { EmptyState, NoSessionsEmpty, NoDrillsEmpty, NoAssignedDrillsEmpty, NoGoalsEmpty, NoHistoryEmpty, NoAnalyticsEmpty } from './EmptyState';
import { Button, SaveButton, CancelButton, SaveSessionButton, EndSessionButton, LogPitchButton, CreateButton } from './Button';
import { PitchTracker } from './PitchTracker/PitchTracker';
import { ProfileTab } from './ProfileTab';
import { HomeIcon } from './icons/HomeIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { PencilIcon } from './icons/PencilIcon';
import { NoteIcon } from './icons/NoteIcon';
import { ProfileIcon } from './icons/ProfileIcon';
import { InfoIcon } from './icons/InfoIcon';
import { PlusIcon } from './icons/PlusIcon';
import { Drill, Session, SetResult, Player, DrillType, TargetZone, PitchType, CountSituation, BaseRunner, PersonalGoal, GoalType, TeamGoal, UserRole, PitchSession, PitchSimulationTemplate } from '../types';
import { formatDate, calculateExecutionPercentage, getSessionGoalProgress, calculateHardHitPercentage, formatGoalName, calculateStrikeoutPercentage, getCurrentTeamMetricValue, formatTeamGoalName, describeRelativeDay, resolveDrillTypeForSet } from '../utils/helpers';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TARGET_ZONES, PITCH_TYPES, COUNT_SITUATIONS, BASE_RUNNERS, OUTS_OPTIONS, DRILL_TYPES, GOAL_TYPES } from '../constants';
import { Modal } from './Modal';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { BreakdownBar } from './BreakdownBar';
import { SessionSaveAnimation } from './SessionSaveAnimation';
import { Tooltip } from './Tooltip';
import { ProgramDetailsModal } from './ProgramDetailsModal';
import { SessionDetail } from './SessionDetail';
import { PlayerAnalyticsTab } from './PlayerAnalyticsTab';
import { PitchRestCard } from './PitchRestCard';
import { PitchingSessionFlow } from './PitchingSessionFlow';
import { SimplePitchingForm } from './SimplePitchingForm';
import { PitchSessionDetailModal } from './PitchSessionDetailModal';
import { RecordSessionModal } from './RecordSessionModal';
import { generatePitchSessionTitle } from '../utils/sessionTitleGenerator';
import { supabase } from '../supabaseClient';

import { WorkloadCalendar } from './WorkloadCalendar';
import { FloatingActionButton } from './FloatingActionButton';
import { SessionTypeBottomSheet } from './SessionTypeBottomSheet';
import { PlayerDashboardTab } from './PlayerDashboardTab';
import { HittingTab } from './HittingTab';
import { PitchingTab } from './PitchingTab';
import { BaseballIcon } from './icons/BaseballIcon';
import { TargetIcon } from './icons/TargetIcon';
import { GoalProgress } from './GoalProgress';
import { SessionHistory } from './SessionHistory';
import { GoalForm } from './GoalForm';
import { GoalDetail } from './GoalDetail';




const TeamGoalProgress: React.FC<{ goal: TeamGoal; sessions: Session[]; drills: Drill[]; playerId?: string; }> = ({ goal, sessions, drills, playerId }) => {
    const currentValue = getCurrentTeamMetricValue(goal, sessions, drills);

    // Calculate player's individual contribution if playerId is provided
    let playerValue = 0;
    if (playerId) {
        const playerSessions = sessions.filter(s => s.playerId === playerId);
        playerValue = getCurrentTeamMetricValue(goal, playerSessions, drills);
    }

    let progress = 0;
    if (goal.targetValue > 0) {
        if (goal.metric === 'No Strikeouts') {
            progress = Math.max(0, 100 - (currentValue / goal.targetValue * 100));
        } else {
            progress = (currentValue / goal.targetValue) * 100;
        }
    } else if (goal.metric === 'No Strikeouts' && goal.targetValue === 0) {
        progress = currentValue === 0 ? 100 : 0;
    }

    // Calculate player progress percentage (for display bar)
    let playerProgress = 0;
    if (playerId && goal.targetValue > 0) {
        if (goal.metric === 'No Strikeouts') {
            playerProgress = Math.max(0, 100 - (playerValue / goal.targetValue * 100));
        } else {
            playerProgress = (playerValue / goal.targetValue) * 100;
        }
    }

    const isPercentage = goal.metric.includes('%');
    const displayValue = isPercentage ? `${Math.round(currentValue)}%` : Math.round(currentValue);
    const displayTarget = isPercentage ? `${goal.targetValue}%` : goal.targetValue;
    const playerDisplayValue = isPercentage ? `${Math.round(playerValue)}%` : Math.round(playerValue);

    return (
        <div className="bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-sm">
            <div>
                <h4 className="font-semibold text-card-foreground">{goal.description}</h4>
                <p className="text-xs text-muted-foreground">{formatTeamGoalName(goal)} | Target: {displayTarget} by {formatDate(goal.targetDate)}</p>
            </div>

            {/* Team Progress */}
            <div>
                <p className="text-xs text-muted-foreground mb-1">Team Progress</p>
                <div className="flex items-center gap-3">
                    <div className="w-full bg-background rounded-full h-2.5">
                        <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-primary">{displayValue}</span>
                </div>
            </div>

            {/* Player Contribution (if playerId provided) */}
            {playerId && (
                <div>
                    <p className="text-xs text-muted-foreground mb-1">My Contribution</p>
                    <div className="flex items-center gap-3">
                        <div className="w-full bg-background rounded-full h-2">
                            <div className="bg-primary/60 h-2 rounded-full" style={{ width: `${Math.min(playerProgress, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-primary">{playerDisplayValue}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

interface PitchingFormValues {
    totalPitches: number;
    strikes: number;
    balls: number;
    avgVelocity?: number;
    notes?: string;
}

const PitchingSessionForm: React.FC<{
    onSave: (values: PitchingFormValues) => Promise<void> | void;
    onCancel: () => void;
    isSaving: boolean;
    errorMessage?: string | null;
    resetKey: number;
}> = ({ onSave, onCancel, isSaving, errorMessage, resetKey }) => {
    // Pitch recording state
    const [pitchRecords, setPitchRecords] = useState<Array<{
        id: string;
        batterSide: 'L' | 'R';
        ballsBefore: number;
        strikesBefore: number;
        pitchTypeCode: string;
        pitchTypeColor: string;
        intendedZoneId: string;
        intendedXNorm: number;
        intendedYNorm: number;
        actualZoneId: string;
        actualXNorm: number;
        actualYNorm: number;
        isStrike: boolean;
        hitTarget: boolean;
    }>>([]);

    // UI state
    const [batterSide, setBatterSide] = useState<'L' | 'R'>('R');
    const [balls, setBalls] = useState(0);
    const [strikeCount, setStrikeCount] = useState(0);
    const [selectedPitchType, setSelectedPitchType] = useState('FB');
    const [pitchTypes, setPitchTypes] = useState([
        { id: 'FB', code: 'FB', name: 'Fastball', colorHex: '#ef4444' },
        { id: 'CURVE', code: 'CV', name: 'Curve', colorHex: '#3b82f6' },
        { id: 'CH', code: 'CH', name: 'Changeup', colorHex: '#10b981' }
    ]);
    const [notes, setNotes] = useState('');

    // Mode state ('setTarget' | 'logPitch')
    type Mode = 'setTarget' | 'logPitch';
    const [mode, setMode] = useState<Mode>('setTarget');

    // Target state (persists across pitches)
    const [targetZone, setTargetZone] = useState<string | null>(null);
    const [targetX, setTargetX] = useState<number | null>(null);
    const [targetY, setTargetY] = useState<number | null>(null);

    useEffect(() => {
        // Reset form when resetKey changes
        setPitchRecords([]);
        setBatterSide('R');
        setBalls(0);
        setStrikeCount(0);
        setSelectedPitchType('FB');
        setNotes('');
        setMode('setTarget');
        setTargetZone(null);
        setTargetX(null);
        setTargetY(null);
    }, [resetKey]);

    const handleTargetSelect = (zone: string, x: number, y: number) => {
        setTargetZone(zone);
        setTargetX(x);
        setTargetY(y);
        // Auto-switch to logging mode after setting target
        setMode('logPitch');
    };

    // Helper: Determine if a pitch is a strike based on coordinates
    // Strike zone is the 3x3 grid area: x from 25-115, y from 20-95 (in 140x140 viewBox)
    // If pitch coordinates touch ANY part of this area (including borders), it's a strike
    const isStrikeZone = (zoneId: string): boolean => {
        const strikeZones = ['Z11', 'Z12', 'Z13', 'Z21', 'Z22', 'Z23', 'Z31', 'Z32', 'Z33'];
        return strikeZones.includes(zoneId);
    };

    // Better strike detection based on coordinates (touching the black = strike)
    const isStrikeByCoords = (xNorm: number, yNorm: number): boolean => {
        // 3x3 zone in SVG: x from 25-115, y from 20-95 (viewBox 140x140)
        // Convert to normalized: x: 0.179-0.821, y: 0.143-0.679 (SVG coords)
        // But we flip y, so in our normalized coords: y: 0.321-0.857
        const svgX = xNorm * 140;
        const svgY = 140 - (yNorm * 140);

        // Check if coordinates are within or touching the 3x3 grid bounds
        return svgX >= 25 && svgX <= 115 && svgY >= 20 && svgY <= 95;
    };

    const handleActualPitchClick = (actualZone: string, actualX: number, actualY: number) => {
        if (!selectedPitchType) {
            alert('Please select a pitch type first');
            return;
        }

        // Get the color for this pitch type
        const pitchType = pitchTypes.find(pt => pt.code === selectedPitchType);
        const pitchColor = pitchType?.colorHex || '#f44336';

        // Determine if pitch hit the intended target zone
        const hitTarget = actualZone === targetZone;

        // Create new pitch record with color and target hit
        const newPitch = {
            id: `pitch_${Date.now()}_${Math.random()}`,
            batterSide,
            ballsBefore: balls,
            strikesBefore: strikeCount,
            pitchTypeCode: selectedPitchType,
            pitchTypeColor: pitchColor,
            intendedZoneId: targetZone,
            intendedXNorm: targetX,
            intendedYNorm: targetY,
            actualZoneId: actualZone,
            actualXNorm: actualX,
            actualYNorm: actualY,
            isStrike: isStrikeByCoords(actualX, actualY),
            hitTarget: hitTarget
        };

        setPitchRecords(prev => [...prev, newPitch]);

        // Optionally reset count after each pitch
        // setBalls(0);
        // setStrikeCount(0);
    };

    const handleAddCustomPitchType = (name: string, code: string, colorHex: string) => {
        const newType = {
            id: code,
            code,
            name,
            colorHex
        };
        setPitchTypes(prev => [...prev, newType]);
        setSelectedPitchType(code);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        // Calculate totals from pitch records using strike logic
        const totalPitches = pitchRecords.length;
        const strikes = pitchRecords.filter(p => p.isStrike).length;
        const ballsCount = totalPitches - strikes;

        try {
            await onSave({
                totalPitches,
                strikes,
                balls: ballsCount,
                notes
            });
        } catch (err) {
            console.error('Pitching session save failed:', err);
            // Error state is managed by parent via errorMessage prop
        }
    };

    const strikePercentage = pitchRecords.length > 0
        ? Math.round((pitchRecords.filter(p => p.isStrike).length / pitchRecords.length) * 100)
        : 0;

    // Convert pitch records to dots for StrikeZone with colors
    const pitchDots = pitchRecords.map(p => ({
        id: p.id,
        xNorm: p.actualXNorm,
        yNorm: p.actualYNorm,
        color: p.pitchTypeColor
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Pitching Session</h3>
                        <p className="text-sm text-muted-foreground">Pitch #{pitchRecords.length + 1}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{strikePercentage}%</div>
                        <div className="text-xs text-muted-foreground">Strike Rate</div>
                    </div>
                </div>
            </div>

            {/* 1. Batter & Count */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Situation</h4>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '0.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    {/* Batter Side */}
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Batter</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                type="button"
                                onClick={() => setBatterSide('L')}
                                variant={batterSide === 'L' ? 'primary' : 'ghost'}
                                size="sm"
                            >
                                L
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setBatterSide('R')}
                                variant={batterSide === 'R' ? 'primary' : 'ghost'}
                                size="sm"
                            >
                                R
                            </Button>
                        </div>
                    </div>

                    {/* Balls */}
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Balls</div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {[0, 1, 2, 3].map(i => (
                                <Button
                                    key={i}
                                    onClick={() => setBalls(i < balls ? i : i + 1)}
                                    variant={i < balls ? 'success' : 'secondary'}
                                    size="sm"
                                    className="rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Strikes */}
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Strikes</div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {[0, 1, 2].map(i => (
                                <Button
                                    key={i}
                                    onClick={() => setStrikeCount(i < strikeCount ? i : i + 1)}
                                    variant={i < strikeCount ? 'danger' : 'secondary'}
                                    size="sm"
                                    className="rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Count Display */}
                    <div style={{ marginLeft: 'auto' }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Count</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {balls}–{strikeCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Pitch Type */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pitch Type</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {pitchTypes.map(type => (
                        <Button
                            key={type.id}
                            type="button"
                            onClick={() => setSelectedPitchType(type.code)}
                            style={{
                                borderColor: selectedPitchType === type.code ? type.colorHex : undefined,
                                backgroundColor: selectedPitchType === type.code ? type.colorHex : undefined,
                                color: selectedPitchType === type.code ? 'white' : undefined,
                            }}
                            variant={selectedPitchType === type.code ? 'primary' : 'secondary'}
                            className={selectedPitchType === type.code ? '' : 'text-muted-foreground'}
                        >
                            {type.code}
                        </Button>
                    ))}
                    <Button
                        type="button"
                        onClick={() => {
                            const name = prompt('Enter pitch name (e.g., Slider):');
                            const code = prompt('Enter pitch code (e.g., SL):');
                            if (name && code) {
                                handleAddCustomPitchType(name, code, '#9333ea');
                            }
                        }}
                        variant="secondary"
                        size="sm"
                    >
                        + Custom
                    </Button>
                </div>
            </div>

            {/* 3. Strike Zone */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Strike Zone</h4>

                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
                    <Button
                        type="button"
                        onClick={() => setMode('setTarget')}
                        variant={mode === 'setTarget' ? 'primary' : 'secondary'}
                        className={mode === 'setTarget' ? 'border-yellow-400 bg-yellow-50/50 text-foreground' : 'text-muted-foreground'}
                    >
                        Set Intended Target
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            if (!targetZone) {
                                alert('Please set an intended target first');
                                setMode('setTarget');
                            } else {
                                setMode('logPitch');
                            }
                        }}
                        variant={mode === 'logPitch' ? 'success' : 'secondary'}
                        className={mode === 'logPitch' ? 'border-green-400 bg-green-50/50 text-foreground' : 'text-muted-foreground'}
                    >
                        Log Pitches
                    </Button>
                </div>

                {/* Helper Text */}
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem' }}>
                    {mode === 'setTarget' ? (
                        <span>📍 Tap a zone to choose where you're aiming</span>
                    ) : targetZone ? (
                        <span>⚾ Tap where the pitch actually went. Red dots = recorded pitches</span>
                    ) : (
                        <span style={{ color: '#f44336' }}>⚠️ Set an intended target first</span>
                    )}
                </p>

                <div style={{ maxWidth: '450px', margin: '0 auto' }}>
                    <svg
                        viewBox="0 0 140 140"
                        style={{ width: '100%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={(e) => {
                            const svg = e.currentTarget;
                            const rect = svg.getBoundingClientRect();
                            const x = (e.clientX - rect.left) / rect.width;
                            const y = 1 - (e.clientY - rect.top) / rect.height;

                            const zone = getZoneFromCoords(x, y);

                            if (mode === 'setTarget') {
                                // Set target mode - only set target
                                handleTargetSelect(zone, x, y);
                            } else if (mode === 'logPitch') {
                                // Log pitch mode
                                if (!targetZone) {
                                    alert('Set an intended target first');
                                    setMode('setTarget');
                                } else {
                                    handleActualPitchClick(zone, x, y);
                                }
                            }
                        }}
                    >
                        {/* Home plate - wider to match zone */}
                        <polygon
                            points="70,130 50,122 50,115 90,115 90,122"
                            fill="#f5f5f5"
                            stroke="#666"
                            strokeWidth="1.5"
                        />

                        {/* Batter indicators - Labeled circles (Pitcher's POV: R on left, L on right) */}
                        {/* Left circle with "RH" - lights up when R is selected */}
                        <g>
                            <circle
                                cx="15"
                                cy="60"
                                r="12"
                                fill={batterSide === 'R' ? '#3b82f6' : '#e5e7eb'}
                                stroke={batterSide === 'R' ? '#2563eb' : '#9ca3af'}
                                strokeWidth="2"
                            />
                            <text
                                x="15"
                                y="63"
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="bold"
                                fill={batterSide === 'R' ? '#ffffff' : '#6b7280'}
                            >RH</text>
                        </g>
                        {/* Right circle with "LH" - lights up when L is selected */}
                        <g>
                            <circle
                                cx="125"
                                cy="60"
                                r="12"
                                fill={batterSide === 'L' ? '#3b82f6' : '#e5e7eb'}
                                stroke={batterSide === 'L' ? '#2563eb' : '#9ca3af'}
                                strokeWidth="2"
                            />
                            <text
                                x="125"
                                y="63"
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="bold"
                                fill={batterSide === 'L' ? '#ffffff' : '#6b7280'}
                            >LH</text>
                        </g>

                        {/* Edge zones - dashed boxes */}
                        <rect x="25" y="5" width="90" height="15"
                            fill={targetZone === 'EDGE_HIGH' ? '#FFE066' : 'none'}
                            fillOpacity={targetZone === 'EDGE_HIGH' ? 0.5 : 0}
                            stroke="#999" strokeWidth="1" strokeDasharray="3,3" />
                        <rect x="25" y="95" width="90" height="15"
                            fill={targetZone === 'EDGE_LOW' ? '#FFE066' : 'none'}
                            fillOpacity={targetZone === 'EDGE_LOW' ? 0.5 : 0}
                            stroke="#999" strokeWidth="1" strokeDasharray="3,3" />
                        <rect x="5" y="20" width="20" height="75"
                            fill={targetZone === 'EDGE_GLOVE' ? '#FFE066' : 'none'}
                            fillOpacity={targetZone === 'EDGE_GLOVE' ? 0.5 : 0}
                            stroke="#999" strokeWidth="1" strokeDasharray="3,3" />
                        <rect x="115" y="20" width="20" height="75"
                            fill={targetZone === 'EDGE_ARM' ? '#FFE066' : 'none'}
                            fillOpacity={targetZone === 'EDGE_ARM' ? 0.5 : 0}
                            stroke="#999" strokeWidth="1" strokeDasharray="3,3" />

                        {/* 3x3 grid - aligned above plate */}
                        {[
                            ['Z11', 'Z12', 'Z13'],
                            ['Z21', 'Z22', 'Z23'],
                            ['Z31', 'Z32', 'Z33']
                        ].map((row, rowIdx) =>
                            row.map((zone, colIdx) => {
                                const x = 25 + colIdx * 30;
                                const y = 20 + rowIdx * 25;
                                const w = 30;
                                const h = 25;
                                return (
                                    <rect
                                        key={zone}
                                        x={x}
                                        y={y}
                                        width={w}
                                        height={h}
                                        fill={targetZone === zone ? '#FFE066' : 'none'}
                                        fillOpacity={targetZone === zone ? 0.6 : 0}
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        className="text-foreground/40"
                                    />
                                );
                            })
                        )}

                        {/* Pitch history dots - color coded by pitch type */}
                        {pitchDots.map((pitch) => {
                            const svgX = pitch.xNorm * 140;
                            const svgY = 140 - (pitch.yNorm * 140);
                            return (
                                <circle
                                    key={pitch.id}
                                    cx={svgX}
                                    cy={svgY}
                                    r="2.5"
                                    fill={pitch.color}
                                    stroke="#fff"
                                    strokeWidth="0.5"
                                    opacity="0.9"
                                />
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* 4. Notes */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h4>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                    placeholder="What were you working on? Velocity goals, pitch-mix focus, etc."
                />
            </div>

            {/* Stats & Actions */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Pitches</p>
                        <p className="text-xl font-bold text-foreground">{pitchRecords.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Strikes</p>
                        <p className="text-xl font-bold text-success">{pitchRecords.filter(p => ['Z11', 'Z12', 'Z13', 'Z21', 'Z22', 'Z23', 'Z31', 'Z32', 'Z33'].includes(p.actualZoneId)).length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Balls</p>
                        <p className="text-xl font-bold text-muted-foreground">{pitchRecords.length - pitchRecords.filter(p => ['Z11', 'Z12', 'Z13', 'Z21', 'Z22', 'Z23', 'Z31', 'Z32', 'Z33'].includes(p.actualZoneId)).length}</p>
                    </div>
                </div>

                {errorMessage && (
                    <p className="text-sm text-destructive mb-3" role="status" aria-live="assertive">
                        {errorMessage}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <CancelButton onClick={onCancel} disabled={isSaving} />
                    <Button
                        onClick={() => { }} // Form handles submit
                        isLoading={isSaving}
                        disabled={pitchRecords.length === 0}
                        variant="success"
                        type="submit"
                    >
                        Save Session ({pitchRecords.length} pitches)
                    </Button>
                </div>
            </div>
        </form>
    );
};

// Helper function remains the same
function getZoneFromCoords(x: number, y: number): string {
    const zoneLeft = 0.25;
    const zoneRight = 0.75;
    const zoneBottom = 0.125;
    const zoneTop = 0.792;

    if (y > zoneTop) return 'EDGE_HIGH';
    if (y < zoneBottom) return 'EDGE_LOW';
    if (x < zoneLeft) return 'EDGE_GLOVE';
    if (x > zoneRight) return 'EDGE_ARM';

    const col = Math.floor((x - zoneLeft) / ((zoneRight - zoneLeft) / 3));
    const row = Math.floor((y - zoneBottom) / ((zoneTop - zoneBottom) / 3));

    const clampedCol = Math.max(0, Math.min(2, col));
    const clampedRow = Math.max(0, Math.min(2, row));

    const zones = [
        ['Z31', 'Z32', 'Z33'],
        ['Z21', 'Z22', 'Z23'],
        ['Z11', 'Z12', 'Z13']
    ];

    return zones[clampedRow][clampedCol];
}

const summarizePitchingSession = (session: Session) => {
    const summarySet = session.sets[0];
    const total = summarySet ? Math.max(0, summarySet.repsAttempted) : 0;
    const strikes = summarySet ? Math.max(0, summarySet.repsExecuted) : 0;
    const balls = summarySet ? Math.max(0, summarySet.strikeouts ?? total - strikes) : 0;
    const strikePct = total > 0 ? Math.round((strikes / total) * 100) : 0;
    return { total, strikes, balls, strikePct };
};

const PitchingOverviewCard: React.FC<{ stats: PitchingStatsSummary; sessions: Session[] }> = ({ stats, sessions }) => {
    const recentSessions = sessions.slice(0, 3);
    const lastSessionLabel = stats.lastSessionDate ? formatDate(stats.lastSessionDate) : 'No sessions yet';
    const lastSessionDetail = stats.lastSessionDate ? `${stats.recentStrikePercentage}% strike rate` : 'Log a bullpen to unlock insights.';

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Pitching Overview</h2>
                    <p className="text-sm text-foreground/60 mt-0.5">Bullpen strike efficiency and workload totals.</p>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-bold text-primary">{stats.overallStrikePercentage}%</p>
                    <p className="text-xs uppercase text-foreground/70 tracking-wide font-semibold">Overall Strike %</p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
                <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Sessions</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.totalSessions}</p>
                </div>
                <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Total Pitches</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.totalPitches}</p>
                </div>
                <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Avg Strike %</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.avgStrikePercentage}%</p>
                </div>
                <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Best Strike %</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.bestStrikePercentage}%</p>
                </div>
                <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Last Session</p>
                    <p className="text-base font-semibold text-foreground mt-1">{lastSessionLabel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lastSessionDetail}</p>
                </div>
                {stats.avgVelocity !== null && (
                    <div>
                        <p className="text-xs text-foreground/60 uppercase tracking-wide font-medium">Avg Velo</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{stats.avgVelocity} mph</p>
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Recent Pitching Sessions</h3>
                {recentSessions.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {recentSessions.map((session) => {
                            const summary = summarizePitchingSession(session);
                            return (
                                <li key={session.id} className="py-3 flex items-center justify-between text-sm">
                                    <div>
                                        <p className="font-semibold text-foreground">{formatDate(session.date)}</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">{summary.total} pitches • {summary.strikePct}% strike rate</p>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p><span className="text-foreground font-bold">{summary.strikes}</span> strikes</p>
                                        <p><span className="text-foreground font-bold">{summary.balls}</span> balls</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-base text-muted-foreground">Log your first pitching session to unlock bullpen insights.</p>
                )}
            </div>
        </div>
    );
};

const LogSession: React.FC<{
    assignedDrill: Drill | null;
    onSave: (sessionData: { name: string; drillId?: string; sets: SetResult[]; reflection?: string }) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
    errorMessage?: string | null;
}> = ({ assignedDrill, onSave, onCancel, isLoading, errorMessage }) => {

    const isAssigned = !!assignedDrill;
    const initialSet: SetResult = { setNumber: 1, repsAttempted: assignedDrill?.repsPerSet || 10, repsExecuted: 0, hardHits: 0, strikeouts: 0, grade: 5 };

    const [drillType, setDrillType] = useState<DrillType>(assignedDrill?.drillType || 'Tee Work');
    const [targetZones, setTargetZones] = useState<TargetZone[]>(assignedDrill?.targetZones || []);
    const [pitchTypes, setPitchTypes] = useState<PitchType[]>(assignedDrill?.pitchTypes || []);
    const [outs, setOuts] = useState<0 | 1 | 2>(assignedDrill?.outs || 0);
    const [count, setCount] = useState<CountSituation>(assignedDrill?.countSituation || 'Even');
    const [runners, setRunners] = useState<BaseRunner[]>(assignedDrill?.baseRunners || []);

    const [currentSet, setCurrentSet] = useState<SetResult>(initialSet);
    const [loggedSets, setLoggedSets] = useState<SetResult[]>([]);
    const [reflection, setReflection] = useState('');

    const createContextualSet = (set: SetResult): SetResult => ({
        ...set,
        targetZones: targetZones.length ? [...targetZones] : [],
        pitchTypes: pitchTypes.length ? [...pitchTypes] : [],
        outs,
        countSituation: count,
        baseRunners: runners.length ? [...runners] : [],
        drillLabel: assignedDrill?.name || drillType,
        drillType: assignedDrill?.drillType || drillType,
    });

    const handleMultiSelect = <T extends string>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) => {
        if (isAssigned) return;
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const handleAddSet = () => {
        const setWithContext = createContextualSet(currentSet);
        const newLoggedSets = [...loggedSets, setWithContext];
        setLoggedSets(newLoggedSets);
        setCurrentSet({ ...initialSet, setNumber: newLoggedSets.length + 1 });
    };

    const handleSaveSession = async () => {
        if (isLoading) return;
        const finalSets = loggedSets.length > 0 ? loggedSets : [createContextualSet(currentSet)];
        await onSave({
            drillId: assignedDrill?.id,
            name: assignedDrill?.name || drillType,
            sets: finalSets,
            reflection: reflection.trim() ? reflection.trim() : undefined,
        });
    };

    const Stepper: React.FC<{ label: string, value: number, onChange: (val: number) => void, max?: number, readOnly?: boolean }> = ({ label, value, onChange, max, readOnly }) => (
        <div className="text-center">
            <label className="text-sm font-semibold text-muted-foreground">{label}</label>
            <div className="flex items-center justify-center gap-3 mt-2">
                <Button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(Math.max(0, value - 1))}
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    aria-label={`Decrease ${label}`}
                >
                    -
                </Button>
                <span className="text-2xl font-bold text-foreground w-12 text-center" aria-live="polite">
                    {value}
                </span>
                <Button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    aria-label={`Increase ${label}`}
                >
                    +
                </Button>
            </div>
        </div>
    );

    const totalReps = loggedSets.reduce((sum, s) => sum + s.repsAttempted, 0);
    const totalExec = loggedSets.reduce((sum, s) => sum + s.repsExecuted, 0);

    return (
        <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/30 text-sm rounded-lg p-4 space-y-2 text-primary">
                <p className="font-semibold flex items-center gap-2">
                    <NoteIcon className="w-4 h-4" aria-hidden="true" />
                    Quick directions
                </p>
                <ul className="list-disc list-inside text-primary/90 space-y-1">
                    <li>Dial in the drill context before logging each set so coaches know what you worked on.</li>
                    <li>Track every set. Aim for honest execution numbers so the analytics stay accurate.</li>
                    <li>Drop a short reflection so future you remembers what clicked (or what didn’t).</li>
                    <li>Switching drills? Update the drill details above, then tap "Log Set & Start Next" so that set keeps the new focus.</li>
                </ul>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <h3 className="font-semibold text-foreground mb-2">Drill Type</h3>
                    <div className="flex flex-wrap gap-2">
                        {DRILL_TYPES.map(d => <Button type="button" key={d} disabled={isAssigned} onClick={() => setDrillType(d)} variant={drillType === d ? 'primary' : 'ghost'}>{d}</Button>)}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-foreground mb-2">Target Zone (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {TARGET_ZONES.map(z => <Button type="button" key={z} disabled={isAssigned} onClick={() => handleMultiSelect(setTargetZones, z)} variant={targetZones.includes(z) ? 'primary' : 'ghost'} size="sm">{z}</Button>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground mb-2">Pitch Type (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {PITCH_TYPES.map(p => <Button type="button" key={p} disabled={isAssigned} onClick={() => handleMultiSelect(setPitchTypes, p)} variant={pitchTypes.includes(p) ? 'primary' : 'ghost'} size="sm">{p}</Button>)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <h3 className="font-semibold text-foreground mb-2">Game Situation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-foreground">Outs</label>
                        <div className="flex gap-2 mt-2">
                            {OUTS_OPTIONS.map(o => <Button type="button" key={o} disabled={isAssigned} onClick={() => setOuts(o)} variant={outs === o ? 'primary' : 'ghost'} className="flex-1">{o}</Button>)}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-foreground">Count</label>
                        <select value={count} disabled={isAssigned} onChange={(e) => setCount(e.target.value as CountSituation)} className="mt-2 w-full bg-background border-input rounded-md py-2 px-3 text-sm disabled:opacity-70">
                            {COUNT_SITUATIONS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-semibold text-foreground">Base Runners</label>
                        <div className="flex gap-2 mt-2">
                            {BASE_RUNNERS.map(r => <Button type="button" key={r} disabled={isAssigned} onClick={() => handleMultiSelect(setRunners, r)} variant={runners.includes(r) ? 'primary' : 'ghost'} className="flex-1">{r}</Button>)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <h3 className="font-semibold text-foreground">Log Set #{currentSet.setNumber}</h3>
                    <p className="text-xs text-muted-foreground">Drill focus: {assignedDrill?.name || drillType}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Stepper label="Reps" value={currentSet.repsAttempted} onChange={(v) => setCurrentSet(s => ({ ...s, repsAttempted: v }))} readOnly={isAssigned} />
                    <Stepper label="Executions" value={currentSet.repsExecuted} onChange={(v) => setCurrentSet(s => ({ ...s, repsExecuted: v }))} max={currentSet.repsAttempted} />
                    <Stepper label="Hard Hits" value={currentSet.hardHits} onChange={(v) => setCurrentSet(s => ({ ...s, hardHits: v }))} max={currentSet.repsAttempted} />
                    <Stepper label="Strikeouts" value={currentSet.strikeouts} onChange={(v) => setCurrentSet(s => ({ ...s, strikeouts: v }))} max={currentSet.repsAttempted} />
                </div>
                <div className="pt-4">
                    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                    Set Reflection Grade
                                    <Tooltip content="Slide to rate the quality of the set. Keep it honest—coaches see trends, not individual scores.">
                                        <span
                                            tabIndex={0}
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                            aria-label="How to score a set"
                                        >
                                            <InfoIcon className="w-3 h-3" />
                                        </span>
                                    </Tooltip>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Reflect on how you did during this set—consider your mental thoughts, improvements, focus, and anything else that stood out.
                                </p>
                            </div>
                            <span className="text-3xl font-black text-primary tabular-nums">{currentSet.grade}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={currentSet.grade}
                            onChange={e => setCurrentSet((s) => ({ ...s, grade: parseInt(e.target.value) }))}
                            className="w-full h-3 bg-muted rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Button onClick={handleAddSet} variant="primary" fullWidth>Log Set & Start Next</Button>
                    <p className="text-xs text-muted-foreground text-center">We’ll stamp each set with the drill info that’s selected when you press the button.</p>
                </div>
            </div>

            {loggedSets.length > 0 && (
                <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-foreground mb-2">Session Summary ({totalExec}/{totalReps})</h3>
                    <ul className="divide-y divide-border">
                        {loggedSets.map((s, i) => (
                            <li key={i} className="py-2 flex flex-wrap gap-3 justify-between items-center text-sm">
                                <div>
                                    <span className="font-bold">Set {s.setNumber}</span>
                                    {(s.drillLabel || s.drillType) && (
                                        <p className="text-xs text-muted-foreground">{s.drillLabel || s.drillType}</p>
                                    )}
                                </div>
                                <span>Reps: {s.repsAttempted}</span>
                                <span>Exec: {s.repsExecuted}</span>
                                <span>HH: {s.hardHits}</span>
                                <span>Grade: {s.grade}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">Reflection / Notes</label>
                <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="What adjustments did you make? What will you focus on next time?"
                    className="w-full min-h-[120px] border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
                <p className="text-xs text-muted-foreground">Reflections help you remember why a session worked. Keep it short and specific.</p>
            </div>

            {errorMessage && (
                <div className="text-center text-sm text-destructive" role="status" aria-live="assertive">
                    {errorMessage}
                </div>
            )}

            <div className="flex justify-end gap-4">
                <CancelButton onClick={onCancel} disabled={isLoading} />
                <SaveSessionButton
                    onClick={handleSaveSession}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};



const SessionEditForm: React.FC<{
    session: Session;
    onSubmit: (updates: { name: string; sets: SetResult[]; reflection?: string }) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    errorMessage?: string | null;
}> = ({ session, onSubmit, onCancel, isSaving, errorMessage }) => {
    const [sessionName, setSessionName] = useState(session.name);
    const [reflection, setReflection] = useState(session.reflection ?? '');
    const [editableSets, setEditableSets] = useState<SetResult[]>(() => session.sets.map(set => ({ ...set })));

    useEffect(() => {
        setSessionName(session.name);
        setReflection(session.reflection ?? '');
        setEditableSets(session.sets.map(set => ({ ...set })));
    }, [session]);

    const updateSet = <K extends keyof SetResult>(index: number, field: K, value: SetResult[K]) => {
        setEditableSets(prev => prev.map((set, idx) => idx === index ? { ...set, [field]: value } : set));
    };

    const removeSet = (index: number) => {
        if (editableSets.length === 1) return;
        setEditableSets(prev => prev.filter((_, idx) => idx !== index).map((set, idx) => ({ ...set, setNumber: idx + 1 })));
    };

    const addSet = () => {
        const last = editableSets[editableSets.length - 1];
        const fallbackDrillType = last?.drillType ?? (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);
        const newSet: SetResult = {
            setNumber: editableSets.length + 1,
            repsAttempted: last?.repsAttempted ?? 10,
            repsExecuted: last?.repsExecuted ?? 0,
            hardHits: last?.hardHits ?? 0,
            strikeouts: last?.strikeouts ?? 0,
            grade: last?.grade ?? 5,
            notes: '',
            drillLabel: last?.drillLabel ?? session.name,
            drillType: fallbackDrillType,
        };
        setEditableSets(prev => [...prev, newSet]);
    };

    const clampNumber = (value: number) => (Number.isNaN(value) ? 0 : value);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedSets = editableSets.map((set, idx) => {
            const repsAttempted = Math.max(0, clampNumber(Number(set.repsAttempted)));
            const repsExecuted = Math.min(repsAttempted, Math.max(0, clampNumber(Number(set.repsExecuted))));
            const hardHits = Math.min(repsExecuted, Math.max(0, clampNumber(Number(set.hardHits))));
            const strikeouts = Math.min(repsAttempted, Math.max(0, clampNumber(Number(set.strikeouts))));
            const grade = Math.min(10, Math.max(1, clampNumber(Number(set.grade ?? 5))));
            const drillLabel = set.drillLabel?.trim();
            return {
                ...set,
                setNumber: idx + 1,
                repsAttempted,
                repsExecuted,
                hardHits,
                strikeouts,
                grade,
                notes: set.notes?.trim(),
                drillLabel: drillLabel ? drillLabel : undefined,
            };
        });

        await onSubmit({
            name: sessionName.trim() || session.name,
            sets: normalizedSets,
            reflection: reflection.trim(),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Hitting Session</h2>
                <p className="text-sm text-muted-foreground">Log your sets and track your progress.</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Session Title</label>
                <input
                    type="text"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full border border-border rounded-lg bg-background p-3 focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
            </div>

            <div className="space-y-4">
                {editableSets.map((set, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-muted-foreground">Set {index + 1}</h4>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={() => removeSet(index)}
                                    disabled={editableSets.length === 1}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Reps Attempted</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.repsAttempted}
                                    onChange={e => updateSet(index, 'repsAttempted', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Reps Executed</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.repsExecuted}
                                    onChange={e => updateSet(index, 'repsExecuted', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Hard Hits</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.hardHits}
                                    onChange={e => updateSet(index, 'hardHits', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Strikeouts</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={set.strikeouts}
                                    onChange={e => updateSet(index, 'strikeouts', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Grade (1-10)</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={set.grade ?? 5}
                                    onChange={e => updateSet(index, 'grade', Number(e.target.value))}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Drill / Focus</span>
                                <input
                                    type="text"
                                    value={set.drillLabel || ''}
                                    onChange={e => updateSet(index, 'drillLabel', e.target.value)}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span>Drill Type</span>
                                <select
                                    value={set.drillType || ''}
                                    onChange={e => updateSet(index, 'drillType', (e.target.value || undefined) as DrillType | undefined)}
                                    className="w-full border border-border rounded-md bg-background px-3 py-2"
                                >
                                    <option value="">Not set</option>
                                    {DRILL_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Notes (optional)</label>
                            <textarea
                                value={set.notes ?? ''}
                                onChange={e => updateSet(index, 'notes', e.target.value)}
                                className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm"
                                placeholder="Remind yourself what happened in this set."
                            />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    onClick={addSet}
                    variant="secondary"
                    className="w-full"
                >
                    + Add Another Set
                </Button>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Reflection</label>
                <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    className="w-full min-h-[120px] border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    placeholder="Capture any cues, adjustments, or next steps."
                />
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <EndSessionButton
                    onClick={() => { }} // Form handles submit
                    isLoading={isSaving}
                    type="submit"
                    className="w-full py-4 text-lg"
                />
                <CancelButton onClick={onCancel} disabled={isSaving} className="w-full" />
            </div>
        </form>
    );
};

const KPICard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
        <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">{title}</p>
        <p className="mt-1.5 text-4xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
    </div>
);

const JoinTeam: React.FC<{ onSkip: () => void }> = ({ onSkip }) => {
    const { currentUser, joinTeamAsPlayer } = useContext(DataContext)!;
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!code) {
            setError('Please enter a team code.');
            setLoading(false);
            return;
        }
        try {
            await joinTeamAsPlayer(code.toUpperCase());
        } catch (err) {
            setError((err as Error).message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-foreground">Join a Team</h1>
                <p className="text-muted-foreground">You're not on a team yet. Enter a code from your coach to join.</p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    <input
                        type="text"
                        placeholder="Enter Team Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm uppercase tracking-widest text-center font-mono"
                    />
                    <Button type="submit" isLoading={loading} fullWidth>
                        Join Team
                    </Button>
                    <Button type="button" onClick={onSkip} variant="link" fullWidth className="mt-2 text-sm text-muted-foreground">
                        Continue to Dashboard
                    </Button>
                </form>
            </div>
        </div>
    );
};

export const PlayerView: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const {
        currentUser,
        loading,
        getAssignedDrillsForPlayerToday,
        getSessionsForPlayer,
        getSessionsForTeam,
        getDrillsForTeam,
        getGoalsForPlayer,
        getTeamGoals,
        logSession,
        updateSession,
        getTeamsForPlayer,
        joinTeamAsPlayer,
        recordSessionIntent,
        setRecordSessionIntent,
        getPitchingSessionsForPlayer,
        getPitchingStatsForSessions,
        createPitchSession,
        finalizePitchSession,
        getAllPitchSessionsForPlayer,
        getAssignedSimulations,
        startSimulationRun,
        createGoal,
        deleteGoal,
        updateGoal,
    } = useContext(DataContext)!;

    const [drillToLog, setDrillToLog] = useState<Drill | null>(null);
    const [lastSavedSession, setLastSavedSession] = useState<Session | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [logSessionError, setLogSessionError] = useState<string | null>(null);
    const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isUpdatingSession, setIsUpdatingSession] = useState(false);
    const [sessionUpdateError, setSessionUpdateError] = useState<string | null>(null);
    const [logMode, setLogMode] = useState<'hitting' | 'pitching' | null>(null);
    const [pitchingFormResetKey, setPitchingFormResetKey] = useState(0);
    const [activePitchSessionId, setActivePitchSessionId] = useState<string | null>(null);
    const [pitchSessions, setPitchSessions] = useState<PitchSession[]>([]);
    const [assignedSimulations, setAssignedSimulations] = useState<PitchSimulationTemplate[]>([]);
    const [activeSimulationRunId, setActiveSimulationRunId] = useState<string | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<PitchSimulationTemplate | null>(null);

    const player = currentUser as Player;
    const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(player.teamIds[0]);
    const playerTeams = useMemo(() => getTeamsForPlayer(player.id), [player.id, getTeamsForPlayer]);
    const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
    const [teamCodeInput, setTeamCodeInput] = useState('');
    const [teamJoinStatus, setTeamJoinStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isJoiningTeam, setIsJoiningTeam] = useState(false);
    const [hasSkippedTeamJoin, setHasSkippedTeamJoin] = useState(false);
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [isSessionTypeSheetOpen, setIsSessionTypeSheetOpen] = useState(false);

    // Goal Management State
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalFormError, setGoalFormError] = useState<string | null>(null);
    const [goalContext, setGoalContext] = useState<'hitting' | 'pitching' | 'all'>('all');
    const [goalListError, setGoalListError] = useState<string | null>(null);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [goalReflection, setGoalReflection] = useState('');
    const [isSavingReflection, setIsSavingReflection] = useState(false);
    const [goalDetailError, setGoalDetailError] = useState<string | null>(null);
    const [selectedPitchSession, setSelectedPitchSession] = useState<PitchSession | null>(null);

    useEffect(() => {
        if (player.teamIds.length === 0) {
            setSelectedTeamId(undefined);
            return;
        }
        if (!selectedTeamId || !player.teamIds.includes(selectedTeamId)) {
            setSelectedTeamId(player.teamIds[0]);
        }
    }, [player.teamIds, selectedTeamId]);

    // REMOVED: Auto-create pitch session useEffect - we'll create on demand when pitching mode is shown, player.id, createPitchSession, isSavingSession]);

    // Fetch pitch sessions for analytics
    useEffect(() => {
        const fetchPitchSessions = async () => {
            try {
                const sessions = await getAllPitchSessionsForPlayer(player.id);
                setPitchSessions(sessions);
            } catch (error) {
                console.error('Error fetching pitch sessions:', error);
                setPitchSessions([]);
            }
        };

        fetchPitchSessions();
    }, [player.id, getAllPitchSessionsForPlayer]);

    useEffect(() => {
        const fetchAssignedSimulations = async () => {
            if (!selectedTeamId) return;
            try {
                console.log('Fetching assigned simulations...');
                const sims = await getAssignedSimulations(player.id, selectedTeamId);
                console.log('Fetched simulations:', sims);
                setAssignedSimulations(sims);
            } catch (error) {
                console.error('Error fetching assigned simulations:', error);
                setAssignedSimulations([]);
            }
        };
        fetchAssignedSimulations();
    }, [player.id, selectedTeamId, getAssignedSimulations]);

    const handleStartSimulation = async (template: PitchSimulationTemplate & { dueDate?: string }) => {
        console.log('=== handleStartSimulation called ===');
        console.log('Template:', template);
        console.log('selectedTeamId:', selectedTeamId);

        if (!selectedTeamId) {
            console.error('No team selected');
            return;
        }
        try {
            console.log('Creating pitch session...');
            // 1. Create a new pitch session for this run
            const sessionId = await createPitchSession(
                player.id,
                selectedTeamId,
                `Program: ${template.name}`,
                'command', // Use 'command' or specific type for programs
                false,
                []
            );
            console.log('Session created:', sessionId);

            console.log('Starting simulation run...');
            // 2. Start the simulation run
            const runId = await startSimulationRun(template.id, player.id, selectedTeamId);
            console.log('Simulation run started:', runId);

            // 3. Set state to navigate to tracker
            console.log('Setting state to navigate...');
            setActivePitchSessionId(sessionId);
            setActiveSimulationRunId(runId);
            setLogMode('pitching');
            setCurrentView('log_session');
            setSelectedProgram(null); // Close modal if open
            console.log('Navigation state set');
        } catch (error) {
            console.error('Error starting simulation:', error);
            setLogSessionError('Failed to start program. Please try again.');
        }
    };

    useEffect(() => {
        if (!recordSessionIntent) {
            return;
        }
        setLogMode(recordSessionIntent.type);
        setDrillToLog(null);
        setCurrentView('log_session');
        setRecordSessionIntent(undefined);
    }, [recordSessionIntent, setRecordSessionIntent]);

    const handleSetCurrentView = (view: string) => {
        if (view === 'log_session') {
            setLogMode(null);
            setDrillToLog(null);
        }
        setCurrentView(view);
    };

    const handleJoinTeam = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedCode = teamCodeInput.trim();
        if (!trimmedCode) {
            setTeamJoinStatus({ type: 'error', message: 'Enter the team code to join.' });
            return;
        }
        setIsJoiningTeam(true);
        setTeamJoinStatus(null);
        try {
            await joinTeamAsPlayer(trimmedCode.toUpperCase());
            setTeamCodeInput('');
            setTeamJoinStatus({ type: 'success', message: 'Team added! Switch to it via Manage Teams.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to join team. Please try again.';
            setTeamJoinStatus({ type: 'error', message });
        } finally {
            setIsJoiningTeam(false);
        }
    };

    const handleSelectTeam = (teamId: string) => {
        setSelectedTeamId(teamId);
        setIsManageTeamsOpen(false);
    };

    const assignedDrills = useMemo(() => (selectedTeamId ? getAssignedDrillsForPlayerToday(player.id, selectedTeamId) : []), [player.id, selectedTeamId, getAssignedDrillsForPlayerToday]);
    const sessions = useMemo(() => getSessionsForPlayer(player.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [player.id, getSessionsForPlayer]);
    const teamSessions = useMemo(() => (selectedTeamId ? getSessionsForTeam(selectedTeamId) : []), [selectedTeamId, getSessionsForTeam]);
    const allTeamDrills = useMemo(() => (selectedTeamId ? getDrillsForTeam(selectedTeamId) : []), [selectedTeamId, getDrillsForTeam]);
    const goals = useMemo(() => getGoalsForPlayer(player.id), [player.id, getGoalsForPlayer]);
    const teamGoals = useMemo(() => (selectedTeamId ? getTeamGoals(selectedTeamId) : []), [selectedTeamId, getTeamGoals]);
    // NOTE: Pitching sessions now use dedicated pitch_sessions table, not the sessions table
    // Use getAllPitchSessionsForPlayer for real pitching data


    const selectedGoal = useMemo(() => goals.find(g => g.id === selectedGoalId) ?? null, [goals, selectedGoalId]);

    useEffect(() => {
        if (selectedGoal) {
            setGoalReflection(selectedGoal.reflection ?? '');
        } else {
            setGoalReflection('');
        }
    }, [selectedGoal]);

    const handleOpenGoalDetail = (goal: PersonalGoal) => {
        setSelectedGoalId(goal.id);
        setGoalDetailError(null);
    };

    const handleCloseGoalDetail = () => {
        if (isSavingReflection) return;
        setSelectedGoalId(null);
        setGoalDetailError(null);
    };

    const handleSaveGoalReflection = async () => {
        if (!selectedGoal) return;
        setGoalDetailError(null);
        setIsSavingReflection(true);
        try {
            const trimmedReflection = goalReflection.trim();
            await updateGoal(selectedGoal.id, { reflection: trimmedReflection });
            setGoalReflection(trimmedReflection);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save reflection. Please try again.';
            setGoalDetailError(message);
        } finally {
            setIsSavingReflection(false);
        }
    };

    const handleCreateGoal = async (goalData: Omit<PersonalGoal, 'id' | 'playerId' | 'status' | 'startDate' | 'teamId'>) => {
        if (!selectedTeamId) {
            setGoalFormError('Join a team before setting goals.');
            return;
        }

        setGoalFormError(null);
        setIsSavingGoal(true);
        try {
            await createGoal({
                ...goalData,
                playerId: player.id,
                teamId: selectedTeamId,
                status: 'Active',
                startDate: new Date().toISOString()
            });
            setIsGoalModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this goal. Please try again.';
            setGoalFormError(message);
        } finally {
            setIsSavingGoal(false);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        setGoalListError(null);
        try {
            await deleteGoal(goalId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to delete this goal. Please try again.';
            setGoalListError(message);
        }
    };

    const handleStartAssignedSession = (drill: Drill) => {
        setLogSessionError(null);
        setLogMode('hitting');
        setDrillToLog(drill);
        setCurrentView('log_session');
    };

    const handleStartAdHocSession = () => {
        setLogSessionError(null);
        setLogMode('hitting');
        setDrillToLog(null);
        setCurrentView('log_session');
    };

    const handleFABClick = () => {
        setIsSessionTypeSheetOpen(true);
    };

    const handleStartHittingFromSheet = () => {
        setLogSessionError(null);
        setLogMode('hitting');
        setDrillToLog(null);
        setCurrentView('log_session');
    };

    const handleStartPitchingFromSheet = () => {
        setLogSessionError(null);
        setLogMode('pitching');
        setDrillToLog(null);
        setCurrentView('pitching_session_flow');
    };

    const handleCancelLogSession = () => {
        setLogSessionError(null);
        setIsSavingSession(false);
        setDrillToLog(null);
        setSessionToEdit(null);
        setLogMode(null);
        // Clean up active pitch session if exists
        if (activePitchSessionId) {
            setActivePitchSessionId(null);
            setActiveSimulationRunId(null);
        }
        setCurrentView('dashboard');

        // Refresh simulations to update completion badges
        if (selectedTeamId) {
            getAssignedSimulations(player.id, selectedTeamId).then(sims => {
                console.log('Refreshed simulations after session:', sims);
                setAssignedSimulations(sims);
            }).catch(err => {
                console.error('Error refreshing simulations:', err);
            });
        }
    }

    const handleLogHittingSession = async (sessionData: { name: string; drillId?: string; sets: SetResult[]; reflection?: string }) => {
        // REMOVED: if (!selectedTeamId) check. Logging without a team is now allowed.

        setIsSavingSession(true);
        setLogSessionError(null);

        try {
            const newSession = await logSession({
                ...sessionData,
                playerId: player.id,
                teamId: selectedTeamId,
                date: new Date().toISOString(),
            });

            if (newSession) {
                setLastSavedSession(newSession);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this session. Please try again.';
            setLogSessionError(message);
        } finally {
            setIsSavingSession(false);
        }
    };

    // ADDED: Simple pitching session handler - saves directly to pitch_sessions table
    const handleLogPitchingSession = async (data: {
        sessionName: string;
        totalPitches: number;
        strikes: number;
        balls: number;
        notes?: string;
    }) => {
        if (!selectedTeamId) {
            setLogSessionError('Join a team before logging sessions.');
            return;
        }

        setIsSavingSession(true);
        setLogSessionError(null);

        try {
            // Create pitch session using DataContext method
            const sessionId = await createPitchSession(
                player.id,
                selectedTeamId,
                data.sessionName,
                'mix', // default session type
                false, // game situation disabled
                [] // no specific pitch goals
            );

            // Since we're logging summary data (not individual pitches),
            // we need to manually update totalPitches before finalizing
            const { default: { createClient } } = await import('@supabase/supabase-js');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseKey);

            await supabase
                .from('pitch_sessions')
                .update({
                    total_pitches: data.totalPitches,
                    session_end_time: new Date().toISOString(),
                })
                .eq('id', sessionId);

            // Finalize the session to calculate rest requirements
            await finalizePitchSession(sessionId);

            // Refresh data and show success
            setLastSavedSession({
                id: sessionId,
                playerId: player.id,
                name: data.sessionName,
                teamId: selectedTeamId,
                date: new Date().toISOString(),
                sets: [],
                createdAt: new Date().toISOString(),
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save this session. Please try again.';
            setLogSessionError(message);
        } finally {
            setIsSavingSession(false);
        }
    };

    const handleCloseAnimation = () => {
        setLastSavedSession(null);
        setLogSessionError(null);
        setCurrentView('dashboard');
    };

    const handleOpenSessionEditor = (session: Session) => {
        setSessionUpdateError(null);
        setSessionToEdit(session);
    };

    const handleCloseSessionEditor = () => {
        if (isUpdatingSession) return;
        setSessionToEdit(null);
        setSessionUpdateError(null);
    };

    const handleOpenSessionDetail = (session: Session) => {
        setSelectedSession(session);
    };

    const handleSaveSessionEdits = async (updates: { name: string; sets: SetResult[]; reflection?: string }) => {
        if (!sessionToEdit) return;
        setIsUpdatingSession(true);
        setSessionUpdateError(null);
        try {
            await updateSession(sessionToEdit.id, updates);
            setSessionToEdit(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to update this session. Please try again.';
            setSessionUpdateError(message);
        } finally {
            setIsUpdatingSession(false);
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: '🏠', view: 'dashboard' },
        { name: 'Hitting', icon: <BaseballIcon />, view: 'hitting' },
        { name: 'Pitching', icon: <TargetIcon />, view: 'pitching' },
    ];

    const pageTitles: { [key: string]: string } = {
        dashboard: `Welcome, ${player.name.split(' ')[0]}!`,
        log_session: logMode === 'pitching' ? 'Log: Pitching Session' : drillToLog ? `Log: ${drillToLog.name}` : 'Log Ad-Hoc Session',
        history: 'My Session History',
        analytics: 'My Analytics',
        profile: 'Profile'
    };

    const analyticsData = useMemo(() => {
        const chronoSessions = [...sessions].reverse();
        const allSets = sessions.flatMap(s => s.sets);

        const kpi = {
            execPct: calculateExecutionPercentage(allSets),
            hardHitPct: calculateHardHitPercentage(allSets),
            contactPct: 100 - calculateStrikeoutPercentage(allSets),
        };

        const performanceOverTimeData = chronoSessions.map(s => ({
            name: formatDate(s.date, { month: 'short', day: 'numeric' }),
            'Execution %': calculateExecutionPercentage(s.sets),
            'Hard Hit %': calculateHardHitPercentage(s.sets),
        }));

        const drillSuccessMap = new Map<string, { success: number, total: number }>();
        sessions.forEach(session => {
            const drill = allTeamDrills.find(d => d.id === session.drillId);
            if (drill) {
                const { isSuccess } = getSessionGoalProgress(session, drill);
                const entry = drillSuccessMap.get(drill.name) || { success: 0, total: 0 };
                entry.total++;
                if (isSuccess) entry.success++;
                drillSuccessMap.set(drill.name, entry);
            }
        });
        const drillSuccessData = Array.from(drillSuccessMap.entries()).map(([name, data]) => ({
            name,
            'Success Rate': data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
        }));

        const byDrillType: { [key in DrillType]?: { executed: number, attempted: number } } = {};
        const byPitchType: { [key in PitchType]?: { executed: number, attempted: number } } = {};
        const byCount: { [key in CountSituation]: { executed: number, attempted: number } } = { 'Ahead': { executed: 0, attempted: 0 }, 'Even': { executed: 0, attempted: 0 }, 'Behind': { executed: 0, attempted: 0 } };
        const byZone: { [key in TargetZone]?: { executed: number, attempted: number } } = {};

        sessions.forEach(session => {
            const drill = session.drillId ? allTeamDrills.find(d => d.id === session.drillId) : undefined;
            const sessionDrillType = drill?.drillType || (DRILL_TYPES.includes(session.name as DrillType) ? session.name as DrillType : undefined);

            session.sets.forEach(set => {
                const focusType = set.drillType || sessionDrillType;
                if (focusType) {
                    if (!byDrillType[focusType]) byDrillType[focusType] = { executed: 0, attempted: 0 };
                    byDrillType[focusType]!.executed += set.repsExecuted;
                    byDrillType[focusType]!.attempted += set.repsAttempted;
                }

                const situation = set.countSituation || 'Even';
                byCount[situation].executed += set.repsExecuted;
                byCount[situation].attempted += set.repsAttempted;

                if (set.pitchTypes && set.pitchTypes.length > 0) {
                    const repsPerType = set.repsAttempted / set.pitchTypes.length;
                    const execPerType = set.repsExecuted / set.pitchTypes.length;
                    set.pitchTypes.forEach(pitch => {
                        if (!byPitchType[pitch]) byPitchType[pitch] = { executed: 0, attempted: 0 };
                        byPitchType[pitch]!.executed += execPerType;
                        byPitchType[pitch]!.attempted += repsPerType;
                    });
                }

                if (set.targetZones && set.targetZones.length > 0) {
                    const repsPerZone = set.repsAttempted / set.targetZones.length;
                    const execPerZone = set.repsExecuted / set.targetZones.length;
                    set.targetZones.forEach(zone => {
                        if (!byZone[zone]) byZone[zone] = { executed: 0, attempted: 0 };
                        byZone[zone]!.executed += execPerZone;
                        byZone[zone]!.attempted += repsPerZone;
                    });
                }
            });
        });

        const calculateBreakdownData = (data: { [key: string]: { executed: number, attempted: number } | undefined }) => {
            return Object.entries(data)
                .map(([name, values]) => ({
                    name,
                    reps: Math.round(values!.attempted),
                    execution: values!.attempted > 0 ? Math.round((values!.executed / values!.attempted) * 100) : 0,
                }))
                .filter(item => item.reps > 0)
                .sort((a, b) => b.execution - a.execution);
        };

        const byDrillTypeData = calculateBreakdownData(byDrillType);
        const byPitchTypeData = calculateBreakdownData(byPitchType);
        const byCountData = calculateBreakdownData(byCount);
        const byZoneData = calculateBreakdownData(byZone).map(d => ({ ...d, zone: d.name as TargetZone, topPlayers: [] }));

        return { kpi, performanceOverTimeData, drillSuccessData, byDrillTypeData, byPitchTypeData, byCountData, byZoneData };
    }, [sessions, allTeamDrills]);

    if (!selectedTeamId && !hasSkippedTeamJoin) {
        return <JoinTeam onSkip={() => setHasSkippedTeamJoin(true)} />;
    }

    const headerContent = (
        <div className="flex flex-wrap gap-3">
            <Button
                onClick={() => setIsManageTeamsOpen(true)}
                variant="secondary"
            >
                Manage Teams
            </Button>
        </div>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <PlayerDashboardTab
                        player={player}
                        sessions={sessions}
                        pitchSessions={pitchSessions}
                        goals={goals}
                        assignedDrills={assignedDrills}
                        assignedSimulations={assignedSimulations}
                        onStartHitting={() => {
                            setLogMode('hitting');
                            setCurrentView('log_session');
                        }}
                        onStartPitching={() => {
                            setLogMode('pitching');
                            setCurrentView('pitching_session_flow');
                        }}
                        onViewProfile={() => setCurrentView('profile')}
                        onStartProgram={(program) => handleStartSimulation(program)}
                        onStartDrill={(drill) => {
                            setDrillToLog(drill);
                            setLogMode('hitting');
                            setCurrentView('log_session');
                        }}
                    />
                );
            case 'hitting':
                return (
                    <HittingTab
                        player={player}
                        sessions={sessions}
                        goals={goals}
                        drills={allTeamDrills}
                        onLogSession={() => {
                            setLogMode('hitting');
                            setCurrentView('log_session');
                        }}
                        onSelectSession={handleOpenSessionDetail}
                        onEditSession={handleOpenSessionEditor}
                        onDeleteGoal={handleDeleteGoal}
                        onAddGoal={() => {
                            setGoalFormError(null);
                            setGoalContext('hitting');
                            setIsGoalModalOpen(true);
                        }}
                        onSelectGoal={handleOpenGoalDetail}
                    />
                );
            case 'pitching':
                return (
                    <PitchingTab
                        player={player}
                        pitchSessions={pitchSessions}
                        goals={goals}
                        onLogSession={() => {
                            setLogMode('pitching');
                            setCurrentView('pitching_session_flow');
                        }}
                        onSelectSession={setSelectedPitchSession}
                        onDeleteGoal={handleDeleteGoal}
                        onAddGoal={() => {
                            setGoalFormError(null);
                            setGoalContext('pitching');
                            setIsGoalModalOpen(true);
                        }}
                        onSelectGoal={handleOpenGoalDetail}
                    />
                );
            case 'log_session':
                return (
                    <LogSession
                        assignedDrill={drillToLog}
                        onSave={handleLogHittingSession}
                        onCancel={handleCancelLogSession}
                        isLoading={isSavingSession}
                        errorMessage={logSessionError}
                    />
                );
            case 'pitching_session_flow':
                return (
                    <PitchingSessionFlow
                        player={player}
                        selectedTeamId={selectedTeamId}
                        activePitchSessionId={activePitchSessionId}
                        setActivePitchSessionId={setActivePitchSessionId}
                        onCancel={handleCancelLogSession}
                        createPitchSession={createPitchSession}
                        activeSimulationRunId={activeSimulationRunId}
                    />
                );
            case 'profile':
                return <ProfileTab onBack={() => setCurrentView('dashboard')} />;
            default:
                return (
                    <PlayerDashboardTab
                        player={player}
                        sessions={sessions}
                        pitchSessions={pitchSessions}
                        goals={goals}
                        assignedDrills={assignedDrills}
                        assignedSimulations={assignedSimulations}
                        onStartHitting={() => {
                            setLogMode('hitting');
                            setCurrentView('log_session');
                        }}
                        onStartPitching={() => {
                            setLogMode('pitching');
                            setCurrentView('pitching_session_flow');
                        }}
                        onViewProfile={() => setCurrentView('profile')}
                        onStartProgram={(program) => handleStartSimulation(program)}
                        onStartDrill={(drill) => {
                            setDrillToLog(drill);
                            setLogMode('hitting');
                            setCurrentView('log_session');
                        }}
                    />
                );
        }
    };

    return (
        <>
            <Dashboard
                navItems={navItems}
                currentView={currentView}
                setCurrentView={handleSetCurrentView}
                pageTitle={pageTitles[currentView]}
                headerContent={headerContent}
            >
                {renderContent()}
            </Dashboard>
            {isRecordModalOpen && <RecordSessionModal onClose={() => setIsRecordModalOpen(false)} />}
            <Modal
                isOpen={!!sessionToEdit}
                onClose={handleCloseSessionEditor}
                title={sessionToEdit ? `Edit ${sessionToEdit.name}` : 'Edit Session'}
            >
                {sessionToEdit && (
                    <SessionEditForm
                        session={sessionToEdit}
                        onSubmit={handleSaveSessionEdits}
                        onCancel={handleCloseSessionEditor}
                        isSaving={isUpdatingSession}
                        errorMessage={sessionUpdateError}
                    />
                )}
            </Modal>
            <Modal
                isOpen={isManageTeamsOpen}
                onClose={() => {
                    setIsManageTeamsOpen(false);
                    setTeamJoinStatus(null);
                }}
                title="Manage Teams"
            >
                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Your Teams</p>
                        {playerTeams.length > 0 ? (
                            <div className="space-y-3">
                                {playerTeams.map((team) => (
                                    <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 bg-card">
                                        <div>
                                            <p className="font-semibold text-foreground">{team.name}</p>
                                            <p className="text-xs text-muted-foreground">Season {team.seasonYear}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSelectTeam(team.id)}
                                            className={`text-sm font-semibold px-3 py-1 rounded-md transition ${selectedTeamId === team.id ? 'bg-secondary/20 text-secondary' : 'bg-muted hover:bg-muted/70'}`}
                                            disabled={selectedTeamId === team.id}
                                        >
                                            {selectedTeamId === team.id ? 'Viewing' : 'View Team'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">You are not on any teams yet.</p>
                        )}
                    </div>

                    <form onSubmit={handleJoinTeam} className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Join another team</p>
                        <input
                            type="text"
                            value={teamCodeInput}
                            onChange={(e) => setTeamCodeInput(e.target.value)}
                            placeholder="Enter team code"
                            className="w-full bg-background border border-input rounded-md py-2 px-3 text-sm uppercase tracking-[0.25em]"
                        />
                        {teamJoinStatus && (
                            <p className={`text-sm ${teamJoinStatus.type === 'success' ? 'text-success' : 'text-destructive'}`}>{teamJoinStatus.message}</p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                isLoading={isJoiningTeam}
                                className="flex-1"
                                disabled={isJoiningTeam}
                            >
                                {isJoiningTeam ? 'Joining...' : 'Join Team'}
                            </Button>
                            {teamJoinStatus?.type === 'success' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManageTeamsOpen(false);
                                        setTeamJoinStatus(null);
                                        setTeamCodeInput('');
                                    }}
                                    className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-4 rounded-lg text-sm transition"
                                >
                                    Continue to Dashboard
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </Modal>
            <SessionSaveAnimation session={lastSavedSession} onClose={handleCloseAnimation} />
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <SessionDetail
                            session={selectedSession}
                            isCoach={false}
                            onClose={() => setSelectedSession(null)}
                        />
                    </div>
                </div>
            )}
            {selectedProgram && (
                <ProgramDetailsModal
                    program={selectedProgram}
                    isOpen={!!selectedProgram}
                    onClose={() => setSelectedProgram(null)}
                    onStart={() => handleStartSimulation(selectedProgram)}
                />
            )}

            {/* Floating Action Button - Only show on main player tabs */}
            {['dashboard', 'hitting', 'pitching', 'profile'].includes(currentView) && (
                <FloatingActionButton onClick={handleFABClick} />
            )}

            {/* Session Type Bottom Sheet */}
            <SessionTypeBottomSheet
                isOpen={isSessionTypeSheetOpen}
                onClose={() => setIsSessionTypeSheetOpen(false)}
                onSelectHitting={handleStartHittingFromSheet}
                onSelectPitching={handleStartPitchingFromSheet}
            />

            <Modal
                isOpen={Boolean(selectedGoal)}
                onClose={handleCloseGoalDetail}
                title={selectedGoal ? formatGoalName(selectedGoal) : 'Goal Details'}
            >
                {selectedGoal && (
                    <GoalDetail
                        goal={selectedGoal}
                        sessions={sessions}
                        pitchSessions={pitchSessions}
                        drills={allTeamDrills}
                        reflection={goalReflection}
                        onReflectionChange={setGoalReflection}
                        onSaveReflection={handleSaveGoalReflection}
                        isSavingReflection={isSavingReflection}
                        errorMessage={goalDetailError}
                    />
                )}
            </Modal>

            <Modal
                isOpen={isGoalModalOpen}
                onClose={() => {
                    if (isSavingGoal) return;
                    setGoalFormError(null);
                    setIsGoalModalOpen(false);
                }}
                title="Set a New Goal"
            >
                <GoalForm
                    onSave={handleCreateGoal}
                    isSaving={isSavingGoal}
                    errorMessage={goalFormError}
                    context={goalContext}
                />
            </Modal>

            {selectedPitchSession && (
                <PitchSessionDetailModal
                    session={selectedPitchSession}
                    onClose={() => setSelectedPitchSession(null)}
                />
            )}
        </>
    );
};
