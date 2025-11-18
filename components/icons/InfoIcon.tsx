import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const InfoIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01" />
        <path d="M10 12h2v6" />
    </svg>
);

export default InfoIcon;
