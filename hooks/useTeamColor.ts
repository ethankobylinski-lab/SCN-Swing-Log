import { useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { UserRole } from '../types';

const DEFAULT_TEAM_COLOR = '#1d4ed8'; // Blue primary

interface TeamColorResult {
    primaryColor: string;
    accentColor: string;
    lightAccent: string;
    darkAccent: string;
    textColor: string;
    borderColor: string;
}

/**
 * Custom hook to get team color for the current context.
 * For coaches: returns the selected team's color
 * For players: returns their team's color
 * Falls back to default blue if no team color is set
 */
export const useTeamColor = (): TeamColorResult => {
    const data = useContext(DataContext);
    const currentUser = data?.currentUser;

    const teamColor = useMemo(() => {
        if (!data || !currentUser) {
            return DEFAULT_TEAM_COLOR;
        }

        // For coaches, try to get color from their first team
        if (currentUser.role === UserRole.Coach) {
            const teams = data.getTeamsForCoach(currentUser.id);
            if (teams.length > 0 && teams[0].primaryColor) {
                return teams[0].primaryColor;
            }
        }

        // For players, get color from their team
        if (currentUser.role === UserRole.Player) {
            const teams = data.getTeamsForPlayer(currentUser.id);
            if (teams.length > 0 && teams[0].primaryColor) {
                return teams[0].primaryColor;
            }
        }

        return DEFAULT_TEAM_COLOR;
    }, [data, currentUser]);

    // Helper to convert hex to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    };

    const colorVariants = useMemo(() => {
        const rgb = hexToRgb(teamColor);
        if (!rgb) {
            return {
                primaryColor: teamColor,
                accentColor: teamColor,
                lightAccent: `${teamColor}20`,
                darkAccent: teamColor,
                textColor: teamColor,
                borderColor: `${teamColor}40`,
            };
        }

        return {
            primaryColor: teamColor,
            accentColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            lightAccent: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
            darkAccent: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
            textColor: teamColor,
            borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
        };
    }, [teamColor]);

    return colorVariants;
};
