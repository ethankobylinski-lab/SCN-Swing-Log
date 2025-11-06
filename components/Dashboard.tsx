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
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === item.view
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
}

const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ teams, activeTeamId, setActiveTeamId }) => {
  return (
    <div className="px-4 mb-4">
      <label htmlFor="team-switcher" className="sr-only">
        Select Team
      </label>
      <select
        id="team-switcher"
        value={activeTeamId}
        onChange={(e) => setActiveTeamId(e.target.value)}
        className="w-full bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
};

interface DashboardProps {
  children: React.ReactNode;
  navItems: { name: string; icon: React.ReactNode; view: string }[];
  currentView: string;
  setCurrentView: (view: string) => void;
  pageTitle: string;
  headerContent?: React.ReactNode;
  teams?: Team[];
  activeTeamId?: string;
  setActiveTeamId?: (teamId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  children,
  navItems,
  currentView,
  setCurrentView,
  pageTitle,
  headerContent,
  teams,
  activeTeamId,
  setActiveTeamId,
}) => {
  const { currentUser, logout } = useContext(DataContext)!;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SideContent = () => (
    <>
      <div className="flex items-center justify-center h-16 flex-shrink-0 px-4">
        <h1 className="text-xl font-bold text-foreground">⚾ SCN HitJournal</h1>
      </div>
      <div className="mt-5 flex-1 flex flex-col">
        {teams && activeTeamId && setActiveTeamId && (
          <TeamSwitcher teams={teams} activeTeamId={activeTeamId} setActiveTeamId={setActiveTeamId} />
        )}
        <SidebarNav navItems={navItems} currentView={currentView} setCurrentView={setCurrentView} />
      </div>
      <div className="flex-shrink-0 flex border-t border-border p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">{currentUser?.name}</p>
              <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{currentUser?.role}</p>
            </div>
            <button
              onClick={logout}
              className="ml-auto p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogoutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-background border-r border-border">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-label="Close sidebar"
            >
              <span className="sr-only">Close sidebar</span>
              <span className="text-white text-2xl">&times;</span>
            </button>
          </div>
          <SideContent />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-background border-r border-border pt-5 overflow-y-auto">
          <SideContent />
        </div>
      </div>

      <div className="md:pl-64 flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="border-r border-border px-4 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
            aria-label="Open sidebar"
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
            <div className="flex items-center gap-4">{headerContent}</div>
          </div>
        </header>

        <main className="flex-1">
          <div className="py-8">
            <div className="container">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
