import React, { useContext, Suspense, lazy } from 'react';
import { DataContext } from './contexts/DataContext';
import { Login } from './components/Login';
import { Spinner } from './components/Spinner';
import { Onboarding } from './components/Onboarding';
import { UserRole } from './types';

const CoachView = lazy(async () => {
  const module = await import('./components/CoachView');
  return { default: module.CoachView };
});

const PlayerView = lazy(async () => {
  const module = await import('./components/PlayerView');
  return { default: module.PlayerView };
});

export const App: React.FC = () => {
  const context = useContext(DataContext);

  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { currentUser, loading } = context;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.isNew) {
    return <Onboarding />;
  }

  const renderView = () => {
    switch (currentUser.role) {
      case UserRole.Coach:
        return <CoachView />;
      case UserRole.Player:
        return <PlayerView />;
      default:
        // This is a fallback for any unexpected user role.
        return (
          <div className="min-h-screen flex items-center justify-center text-center">
            <div>
              <h2 className="text-xl font-bold">Invalid Role</h2>
              <p className="text-muted-foreground">Your user role is not recognized. Please contact support.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        {renderView()}
      </Suspense>
    </div>
  );
};
