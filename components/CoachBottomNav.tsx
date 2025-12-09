import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { BaseballIcon } from './icons/BaseballIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';

type CoachTab = 'dashboard' | 'team' | 'hitting' | 'pitching' | 'insights';

interface CoachBottomNavProps {
    activeTab: CoachTab;
    onTabChange: (tab: CoachTab) => void;
}

export const CoachBottomNav: React.FC<CoachBottomNavProps> = ({ activeTab, onTabChange }) => {
    const tabs: { id: CoachTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { id: 'team', label: 'Team', icon: UsersIcon },
        { id: 'hitting', label: 'Hitting', icon: BaseballIcon },
        { id: 'pitching', label: 'Pitching', icon: ChartBarIcon },
        { id: 'insights', label: 'Insights', icon: LightbulbIcon },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-40">
            <div className="grid grid-cols-5 h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
