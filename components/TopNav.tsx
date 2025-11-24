import React from 'react';

/**
 * TopNav - Horizontal navigation for Coach view
 * Desktop-style horizontal menu across the top of the page
 */

interface TopNavProps {
    navItems: { name: string; icon: React.ReactNode; view: string }[];
    currentView: string;
    setCurrentView: (view: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ navItems, currentView, setCurrentView }) => {
    return (
        <nav className="border-b border-border bg-card">
            <div className="container">
                <div className="flex items-center gap-1 py-2 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = currentView === item.view;
                        return (
                            <button
                                key={item.name}
                                onClick={() => setCurrentView(item.view)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                            >
                                <span className="flex-shrink-0">
                                    {React.isValidElement(item.icon)
                                        ? React.cloneElement(item.icon as React.ReactElement, {
                                            className: `w-4 h-4 ${isActive ? 'fill-current' : ''}`,
                                        })
                                        : item.icon}
                                </span>
                                <span>{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
