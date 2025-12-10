import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { Team, UserRole } from '../types';
import { BottomNav } from './BottomNav';
import { TopNav } from './TopNav';

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
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === item.view
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
  setActiveTeamId: (teamId: string | undefined) => void;
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
  setActiveTeamId?: (teamId: string | undefined) => void;
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

  const isPlayer = currentUser?.role === UserRole.Player;

  const SideContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 gap-2">
        <img src="/dt-logo.jpg" alt="DT Logo" className="h-10 w-10 rounded-lg" />
        <h1 className="text-xl font-bold text-foreground">Diamond Tracker</h1>
      </div>
      <div className="mt-5 flex-1 flex flex-col">
        {teams && activeTeamId && setActiveTeamId && (
          <TeamSwitcher teams={teams} activeTeamId={activeTeamId} setActiveTeamId={setActiveTeamId} />
        )}
        <SidebarNav
          navItems={navItems}
          currentView={currentView}
          setCurrentView={(view) => {
            setCurrentView(view);
            if (onItemClick) onItemClick();
          }}
        />
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

  if (isPlayer) {
    return (
      <div className="relative min-h-screen pb-20"> {/* Added padding-bottom for BottomNav */}
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex flex-1 items-center justify-between px-4">
            {/* Logo for player view since sidebar is gone */}
            <div className="flex items-center gap-2">
              <img src="/dt-logo.jpg" alt="DT Logo" className="h-8 w-8 rounded-lg" />
              <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              {headerContent}
              <button
                onClick={logout}
                className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogoutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="py-4 px-4">
            {children}
          </div>
        </main>

        <BottomNav
          navItems={navItems}
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      </div>
    );
  }

  // Coach view with horizontal top navigation
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <img src="/dt-logo.jpg" alt="DT Logo" className="h-9 w-9 rounded-lg" />
              <h1 className="text-xl font-bold text-foreground hidden sm:block">Diamond Tracker</h1>
            </div>

            {/* Team Switcher and Actions */}
            <div className="flex items-center gap-3">
              {teams && activeTeamId && setActiveTeamId && (
                <select
                  value={activeTeamId}
                  onChange={(e) => setActiveTeamId(e.target.value)}
                  className="bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}

              {headerContent}

              <button
                onClick={logout}
                className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Logout"
              >
                <LogoutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation */}
        <TopNav
          navItems={navItems}
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      </header>

      <main className="flex-1">
        <div className="py-8">
          <div className="container">
            {/* Page Title */}
            <h2 className="text-2xl font-bold text-foreground mb-6">{pageTitle}</h2>

            {children}
          </div>
        </div>
      </main>

      {/* Footer with user info (optional) */}
      <footer className="border-t border-border bg-card/50 py-4 mt-auto">
        <div className="container">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{currentUser?.name}</span>
              <span>·</span>
              <span>{currentUser?.role}</span>
            </div>
            <div className="text-xs">
              © {new Date().getFullYear()} Diamond Tracker
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
