
import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { Team } from '../types';

interface SidebarNavProps {
  navItems: { name: string; icon: React.ReactNode; view: string }[];
  currentView: string;
  setCurrentView: (view: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ navItems, currentView, setCurrentView }) => {
    return (
        <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => (
            <a
                key={item.name}
                href="#"
                onClick={(e) => {
                e.preventDefault();
                setCurrentView(item.view);
                }}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                currentView === item.view
                    ? 'bg-secondary text-white'
                    : 'text-gray-300 hover:bg-base-300 hover:text-white'
                }`}
            >
                {item.icon}
                <span className="ml-3">{item.name}</span>
            </a>
            ))}
        </nav>
    );
};


interface TeamSwitcherProps {
  teams: Team[];
  activeTeamId: string;
  setActiveTeamId: (teamId: string) => void;
  onCreateTeam?: () => void;
}

const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ teams, activeTeamId, setActiveTeamId, onCreateTeam }) => {
  return (
    <div className="px-2 mb-4 space-y-2">
      <select
        value={activeTeamId}
        onChange={(e) => setActiveTeamId(e.target.value)}
        className="w-full bg-base-300 border border-base-300 text-white text-sm rounded-lg focus:ring-secondary focus:border-secondary block p-2.5"
      >
        {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
      {onCreateTeam && (
        <button
          type="button"
          onClick={onCreateTeam}
          className="w-full text-sm font-semibold bg-secondary/20 hover:bg-secondary/30 text-secondary py-2 rounded-lg transition-colors"
        >
          + Create Team
        </button>
      )}
    </div>
  );
};

interface DashboardProps {
    children: React.ReactNode;
    navItems: { name: string; icon: React.ReactNode; view: string }[];
    currentView: string;
    setCurrentView: (view: string) => void;
    teams?: Team[];
    activeTeamId?: string;
    setActiveTeamId?: (teamId: string) => void;
    onRequestCreateTeam?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ children, navItems, currentView, setCurrentView, teams, activeTeamId, setActiveTeamId, onRequestCreateTeam }) => {
  const { currentUser, logout } = useContext(DataContext)!;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SideContent = () => (
    <>
      <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-base-300">
        <h1 className="text-xl font-bold text-white">⚾ Hitting Tracker</h1>
      </div>
      <div className="mt-5 flex-1 flex flex-col">
          {teams && activeTeamId && setActiveTeamId && (
              <TeamSwitcher teams={teams} activeTeamId={activeTeamId} setActiveTeamId={setActiveTeamId} onCreateTeam={onRequestCreateTeam} />
          )}
          <SidebarNav navItems={navItems} currentView={currentView} setCurrentView={setCurrentView} />
      </div>
      <div className="flex-shrink-0 flex bg-base-300 p-4">
        <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
            <div className="ml-3">
                <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                <p className="text-xs font-medium text-gray-400 group-hover:text-gray-300">{currentUser?.role}</p>
            </div>
            <button onClick={logout} className="ml-auto p-2 rounded-full text-gray-400 hover:bg-base-100 hover:text-white">
                <LogoutIcon className="w-5 h-5" />
            </button>
            </div>
        </div>
      </div>
    </>
  );

  return (
    <div>
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-base-200">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                        <span className="sr-only">Close sidebar</span>
                        <span className="text-white text-2xl">&times;</span>
                    </button>
                </div>
                <SideContent />
            </div>
        </div>
    
        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
            <div className="flex flex-col flex-grow bg-base-200 pt-5 overflow-y-auto">
                <SideContent />
            </div>
        </div>
    
        <div className="md:pl-64 flex flex-col flex-1">
            <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-base-100">
                <button onClick={() => setSidebarOpen(true)} className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                    <span className="sr-only">Open sidebar</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
            <main className="flex-1">
                <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                    {children}
                </div>
                </div>
            </main>
        </div>
    </div>
  );
};
