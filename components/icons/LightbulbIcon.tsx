import React from 'react';

interface LightbulbIconProps {
    className?: string;
}

export const LightbulbIcon: React.FC<LightbulbIconProps> = ({ className = "w-5 h-5" }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
        >
            <path d="M10 2a6 6 0 00-3.815 10.631C7.237 13.5 8 14.443 8 15.5V17a1 1 0 001 1h2a1 1 0 001-1v-1.5c0-1.057.764-2 1.815-2.869A6 6 0 0010 2z" />
            <path d="M8.5 18a.5.5 0 01.5-.5h2a.5.5 0 010 1H9a.5.5 0 01-.5-.5zM7 19a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
        </svg>
    );
};
