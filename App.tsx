import React, { useContext, Suspense, lazy, useState } from 'react';
import { DataContext } from './contexts/DataContext';
import { Login } from './components/Login';
import { Spinner } from './components/Spinner';
import { Onboarding } from './components/Onboarding';
import { OrientationTour } from './components/OrientationTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserRole } from './types';

const CoachView = lazy(async () => {
  const module = await import('./components/CoachView');
  return { default: module.CoachView };
});

const PlayerView = lazy(async () => {
  const module = await import('./components/PlayerView');
  return { default: module.PlayerView };
});

const BackgroundDecor: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className="absolute top-[-15%] right-[-10%] w-[55vw] max-w-[620px] text-primary/10"
    >
      <path
        d="M420 40L600 220L420 400"
        stroke="currentColor"
        strokeWidth="140"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
    <svg
      aria-hidden="true"
      viewBox="0 0 700 700"
      className="absolute bottom-[-20%] left-[-15%] w-[65vw] max-w-[760px] text-foreground/5"
    >
      <path
        d="M50 500C50 250 250 50 500 50C610 50 700 140 700 250"
        stroke="currentColor"
        strokeWidth="180"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </div>
);

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

  // Show orientation tour for players who haven't completed it
  if (currentUser.role === UserRole.Player && !currentUser.orientationCompleted) {
    return (
      <OrientationTour
        onComplete={() => {
          // The tour itself handles marking as complete
        }}
        onSkip={() => {
          // The tour itself handles this
        }}
      />
    );
  }

  const renderView = () => {
    switch (currentUser.role) {
      case UserRole.Coach:
        return (
          <ErrorBoundary
            fallback={
              <div className="min-h-screen flex items-center justify-center text-center p-4">
                <div>
                  <h2 className="text-xl font-bold text-red-600">Coach View Error</h2>
                  <p className="text-muted-foreground mt-2">
                    The coach view encountered an error. Try refreshing the page.
                  </p>
                </div>
              </div>
            }
          >
            <CoachView />
          </ErrorBoundary>
        );
      case UserRole.Player:
        return (
          <ErrorBoundary
            fallback={
              <div className="min-h-screen flex items-center justify-center text-center p-4">
                <div>
                  <h2 className="text-xl font-bold text-red-600">Player View Error</h2>
                  <p className="text-muted-foreground mt-2">
                    The player view encountered an error. Try refreshing the page.
                  </p>
                </div>
              </div>
            }
          >
            <PlayerView />
          </ErrorBoundary>
        );
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
    <div className="relative min-h-screen bg-background overflow-hidden">
      <BackgroundDecor />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <main className="relative z-10 min-h-screen">
          {renderView()}
        </main>
      </Suspense>
    </div>
  );
};
