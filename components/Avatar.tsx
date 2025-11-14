import React from 'react';

interface AvatarProps {
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, className = '' }) => {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary text-white font-bold ${className}`}
      role="img"
      aria-label={`Avatar for ${name || 'user'}`}
    >
      {getInitials(name)}
    </div>
  );
};
