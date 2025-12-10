import React, { useState, useEffect, useContext } from 'react';
import { Player, PitchSession } from '../types';
import { PitchTracker } from './PitchTracker/PitchTracker';
import { DataContext } from '../contexts/DataContext';
import { formatDate } from '../utils/helpers';

interface PitchingSessionFlowProps {
    player: Player;
    selectedTeamId?: string;
    activePitchSessionId: string | null;
    setActivePitchSessionId: (id: string | null) => void;
    onCancel: () => void;
    createPitchSession: (
        pitcherId: string,
        teamId: string,
        sessionName: string,
        sessionType: string,
        gameSituationEnabled: boolean,
        pitchGoals: any[]
    ) => Promise<string>;
    activeSimulationRunId?: string | null;
}

/**
 * PitchingSessionFlow
 * 
 * Handles the flow for pitching sessions:
 * 1. Checks for unfinished sessions on mount
 * 2. Prompts user to Resume or Discard if found
 * 3. Creates a new pitch session if none found (or after discard)
 * 4. Shows the PitchTracker component
 */
export const PitchingSessionFlow: React.FC<PitchingSessionFlowProps> = ({
    player,
    selectedTeamId,
    activePitchSessionId,
    setActivePitchSessionId,
    onCancel,
    createPitchSession,
    activeSimulationRunId
}) => {
    const { getAllPitchSessionsForPlayer, discardPitchSession } = useContext(DataContext)!;

    const [isCreating, setIsCreating] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unfinishedSession, setUnfinishedSession] = useState<PitchSession | null>(null);

    // Initial check for unfinished sessions
    useEffect(() => {
        const checkUnfinished = async () => {
            // If we already have an active session (e.g. started from simulation), skip check
            if (activePitchSessionId) {
                setIsChecking(false);
                return;
            }

            if (!selectedTeamId) {
                setIsChecking(false);
                return;
            }

            try {
                const sessions = await getAllPitchSessionsForPlayer(player.id, selectedTeamId);
                const inProgress = sessions.find(s => s.status === 'in_progress');

                if (inProgress) {
                    setUnfinishedSession(inProgress);
                } else {
                    // No unfinished session, proceed to create new
                    createNewSession();
                }
            } catch (err) {
                console.error('Error checking sessions:', err);
                // On error, try to create new anyway
                createNewSession();
            } finally {
                setIsChecking(false);
            }
        };

        checkUnfinished();
    }, [player.id, selectedTeamId, activePitchSessionId]);

    const createNewSession = () => {
        if (!selectedTeamId || isCreating) return;

        setIsCreating(true);
        createPitchSession(
            player.id,
            selectedTeamId,
            'Bullpen Session',
            'mix',
            false,
            []
        )
            .then((sessionId) => {
                setActivePitchSessionId(sessionId);
                setError(null);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to create session');
                console.error('Error creating pitch session:', err);
            })
            .finally(() => {
                setIsCreating(false);
            });
    };

    const handleResume = () => {
        if (unfinishedSession) {
            setActivePitchSessionId(unfinishedSession.id);
        }
    };

    const handleDiscard = async () => {
        if (!unfinishedSession) return;

        if (!window.confirm('Are you sure you want to discard this unfinished session? This cannot be undone.')) {
            return;
        }

        try {
            await discardPitchSession(unfinishedSession.id);
            setUnfinishedSession(null);
            createNewSession();
        } catch (err) {
            setError('Failed to discard session');
        }
    };

    const handleNavigateBack = () => {
        // Clean up session ID when navigating back
        setActivePitchSessionId(null);
        onCancel();
    };

    if (!selectedTeamId) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Please join a team before logging pitching sessions.</p>
                <button
                    onClick={onCancel}
                    className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (isChecking || isCreating) {
        return (
            <div className="p-8 text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground">
                        {isChecking ? 'Checking for unfinished sessions...' : 'Starting pitch tracker...'}
                    </p>
                </div>
            </div>
        );
    }

    if (unfinishedSession && !activePitchSessionId) {
        return (
            <div className="p-6 max-w-md mx-auto space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-amber-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-bold text-foreground">Unfinished Session Found</h3>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            You have an unfinished bullpen session from <strong>{formatDate(unfinishedSession.date)}</strong>.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {unfinishedSession.totalPitches} pitches logged so far.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={handleResume}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
                        >
                            Resume Session
                        </button>
                        <button
                            onClick={handleDiscard}
                            className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
                        >
                            Discard & Start New
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-2 text-muted-foreground hover:text-foreground text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-destructive">{error}</p>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!activePitchSessionId) {
        return (
            <div className="p-8 text-center">
                <div className="animate-pulse">
                    <p className="text-muted-foreground">Preparing session...</p>
                </div>
            </div>
        );
    }

    // Show the pitch tracker
    return (
        <PitchTracker
            sessionId={activePitchSessionId}
            onNavigateBack={handleNavigateBack}
            simulationRunId={activeSimulationRunId || undefined}
        />
    );
};
