import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { PitchTracker } from './PitchTracker/PitchTracker';

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
}

/**
 * PitchingSessionFlow
 * 
 * Handles the flow for pitching sessions:
 * 1. Creates a pitch session on mount
 * 2. Shows the PitchTracker component
 * 3. Cleans up on unmount or cancel
 */
export const PitchingSessionFlow: React.FC<PitchingSessionFlowProps> = ({
    player,
    selectedTeamId,
    activePitchSessionId,
    setActivePitchSessionId,
    onCancel,
    createPitchSession
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Create session on mount if we don't have one
        if (!activePitchSessionId && selectedTeamId && !isCreating) {
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
        }
    }, [activePitchSessionId, selectedTeamId, player.id, isCreating, createPitchSession, setActivePitchSessionId]);

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

    if (isCreating) {
        return (
            <div className="p-8 text-center">
                <div className="animate-pulse">
                    <p className="text-muted-foreground">Starting pitch tracker...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className=" p-8 text-center space-y-4">
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
        />
    );
};
