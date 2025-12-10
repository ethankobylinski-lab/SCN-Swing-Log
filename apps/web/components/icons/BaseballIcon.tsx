import React from 'react';

export const BaseballIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M18 12a6 6 0 0 1-6 6 6 6 0 0 1-6-6" />
        <path d="M18 12a6 6 0 0 0-6-6 6 6 0 0 0-6 6" />
        <path d="M6 12h.01" />
        <path d="M18 12h.01" />
    </svg>
);
