// Zone descriptions for pitcher's perspective
export const getZoneDescription = (zoneId: string): string => {
    const descriptions: Record<string, string> = {
        // Top row
        'Z11': 'High & Inside (to righty)',
        'Z12': 'High & Middle',
        'Z13': 'High & Away (to righty)',

        // Middle row
        'Z21': 'Middle-Inside (to righty)',
        'Z22': 'Down the Middle',
        'Z23': 'Middle-Away (to righty)',

        // Bottom row
        'Z31': 'Low & Inside (to righty)',
        'Z32': 'Low & Middle',
        'Z33': 'Low & Away (to righty)',
    };

    return descriptions[zoneId] || zoneId;
};

export const getShortZoneLabel = (zoneId: string): string => {
    const labels: Record<string, string> = {
        'Z11': 'High-In',
        'Z12': 'High-Mid',
        'Z13': 'High-Away',
        'Z21': 'Mid-In',
        'Z22': 'Middle',
        'Z23': 'Mid-Away',
        'Z31': 'Low-In',
        'Z32': 'Low-Mid',
        'Z33': 'Low-Away',
    };

    return labels[zoneId] || zoneId;
};
