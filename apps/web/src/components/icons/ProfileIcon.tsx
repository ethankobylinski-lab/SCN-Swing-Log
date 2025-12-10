import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const ProfileIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
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
        <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" />
        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
    </svg>
);

export default ProfileIcon;
