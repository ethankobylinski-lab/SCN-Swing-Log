import { useState, useEffect, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { computePitchRestStatus, getMostRecentPitchingSession, PitchRestStatus } from '../utils/pitchRestHelpers';

/**
 * React hook to fetch and compute pitching rest status for a player.
 * 
 * Fetches:
 * - Most recent pitching session for the player
 * - Coach's rest_hours_per_pitch setting (falls back to 1.0)
 * 
 * Returns the computed rest status with loading state.
 * 
 * @param playerId - ID of the player to check rest status for
 * @returns Object containing restStatus and loading state
 */
export function usePitchRestStatus(playerId: string) {
    const dataContext = useContext(DataContext);
    const [restStatus, setRestStatus] = useState<PitchRestStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!dataContext) {
            setLoading(false);
            return;
        }

        const fetchAndCompute = async () => {
            setLoading(true);

            try {
                // Fetch pitching sessions for the player from database
                const pitchingSessions = await dataContext.getAllPitchSessionsForPlayer(playerId);

                // TODO: Fetch coach setting for rest_hours_per_pitch from team settings
                // For now, default to 1.0
                const restHoursPerPitch = 1.0;

                // Compute rest status
                const now = new Date();
                const status = computePitchRestStatus(pitchingSessions, now, restHoursPerPitch);

                setRestStatus(status);
            } catch (error) {
                console.error('Error computing pitch rest status:', error);
                // Return a default "no data" status on error
                setRestStatus(computePitchRestStatus([], new Date(), 1.0));
            } finally {
                setLoading(false);
            }
        };

        fetchAndCompute();

        // Refresh every minute to keep "days since" current
        const intervalId = setInterval(fetchAndCompute, 60000);

        return () => clearInterval(intervalId);
    }, [playerId, dataContext]);

    return { restStatus, loading };
}
