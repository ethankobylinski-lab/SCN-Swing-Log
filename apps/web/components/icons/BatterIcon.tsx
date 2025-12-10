import React from 'react';

interface BatterIconProps {
    side: 'L' | 'R';
    className?: string;
}

export const BatterIcon: React.FC<BatterIconProps> = ({ side, className = '' }) => {
    // Orientation Logic:
    // Right-Handed Batter (R): Stands on LEFT. Faces RIGHT.
    // Left-Handed Batter (L): Stands on RIGHT. Faces LEFT.

    // Default drawing faces RIGHT.
    // Mirror for 'L'.
    const transform = side === 'L' ? 'scale(-1, 1)' : undefined;

    return (
        <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ transform, filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))' }}
        >
            <defs>
                {/* Main Helmet Gradient (Glossy Blue/Black/Grey style) */}
                <linearGradient id="helmetGradient" x1="100" y1="50" x2="400" y2="450" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4b5563" /> {/* Dark Grey highlight */}
                    <stop offset="40%" stopColor="#1f2937" /> {/* Dark Blue/Grey base */}
                    <stop offset="100%" stopColor="#111827" /> {/* Almost Black shadow */}
                </linearGradient>

                {/* Highlight Gradient for Shine */}
                <radialGradient id="helmetShine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 150) rotate(90) scale(150)">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Main Helmet Shell */}
            <path
                d="M256 64C150 64 64 150 64 256v112c0 26.5 21.5 48 48 48h32c10 0 18-8 18-18v-10c0-10-8-18-18-18h-16v-96c0-70 50-128 120-128h16c70 0 120 58 120 128v96h-16c-10 0-18 8-18 18v10c0 10 8 18 18 18h32c26.5 0 48-21.5 48-48V256c0-106-86-192-192-192z"
                fill="url(#helmetGradient)"
            />

            {/* Solid Dome Background (fills the gap) */}
            <path d="M256 64c-106 0-192 86-192 192v112h32v-16h-16v-96c0-88.4 71.6-160 160-160h16c88.4 0 160 71.6 160 160v96h-16v16h32V256c0-106-86-192-192-192z" fill="#1f2937" />
            <circle cx="256" cy="256" r="190" fill="url(#helmetGradient)" />

            {/* Visor / Bill */}
            <path
                d="M440 240h-40c-10 0-20 5-26 14l-10 14c-4 6-10 10-18 10h-20c-11 0-20-9-20-20s9-20 20-20h94c11 0 20 9 20 20v2c0 11-9 20-20 20z"
                fill="#000000"
                opacity="0.8"
            />
            <path d="M446 256h-40c-15 0-28 10-32 24l-5 18h77c15 0 28-10 32-24l-5-18h-27z" fill="#111827" />

            {/* Ear Flap (3D looking) */}
            <path
                d="M160 240c0-22 18-40 40-40h10c11 0 20 9 20 20v120c0 11-9 20-20 20h-10c-22 0-40-18-40-40V240z"
                fill="url(#helmetGradient)"
                stroke="#374151"
                strokeWidth="4"
            />

            {/* Ear Hole */}
            <circle cx="195" cy="280" r="12" fill="#111827" stroke="#4b5563" strokeWidth="2" />

            {/* Shine / Highlight on Dome */}
            <ellipse cx="220" cy="150" rx="80" ry="40" fill="url(#helmetShine)" transform="rotate(-20 220 150)" />

            {/* Top Vent Detail */}
            <path d="M230 80h52c5 0 10 5 10 10s-5 10-10 10h-52c-5 0-10-5-10-10s5-10 10-10z" fill="#374151" opacity="0.5" />
        </svg>
    );
};
