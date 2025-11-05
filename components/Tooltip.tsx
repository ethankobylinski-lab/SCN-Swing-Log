import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative group cursor-pointer">
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 left-1/2 -translate-x-1/2 border border-border">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-popover"></div>
      </div>
    </div>
  );
};