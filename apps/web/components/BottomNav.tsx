import React from 'react';

interface BottomNavProps {
    navItems: { name: string; icon: React.ReactNode; view: string }[];
    currentView: string;
    setCurrentView: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ navItems, currentView, setCurrentView }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
            <nav className="flex justify-around items-center h-16 px-2 relative">
                {navItems.map((item) => {
                    const isActive = currentView === item.view;
                    const isLogSession = item.name === 'Log';

                    if (isLogSession) {
                        return (
                            <div key={item.name} className="relative -top-6">
                                <button
                                    onClick={() => setCurrentView(item.view)}
                                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground border-4 border-background ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''
                                        }`}
                                >
                                    {React.isValidElement(item.icon)
                                        ? React.cloneElement(item.icon as React.ReactElement, {
                                            className: 'w-6 h-6 fill-current',
                                        })
                                        : item.icon}
                                </button>
                                <span className="text-[10px] font-medium text-center block mt-1">{item.name}</span>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.name}
                            onClick={() => setCurrentView(item.view)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                {/* Clone element to pass props if needed, or just render. 
                    Assuming icons are ReactNodes that can accept className if they were components, 
                    but here they are already instantiated nodes in the prop. 
                    We'll wrap them in a div to control size/color context if possible, 
                    but usually the icon component itself handles 'currentColor'.
                */}
                                {React.isValidElement(item.icon)
                                    ? React.cloneElement(item.icon as React.ReactElement, {
                                        className: `w-6 h-6 ${isActive ? 'fill-current' : ''}`
                                    })
                                    : item.icon}
                            </div>
                            {/* Optional: Hide labels for a cleaner look, or keep them small */}
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
