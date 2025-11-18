import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { filled?: boolean };

export const NoteIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', filled = false, ...props }) => (
    <svg
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M6 3h9l5 5v13a.999.999 0 0 1-1 1H6a1 1 0 0 1-1-1V4c0-.552.448-1 1-1Z" />
        <path d="M15 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
    </svg>
);

export default NoteIcon;
