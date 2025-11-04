
import React, { useContext } from 'react';
import { DataContext } from './contexts/DataContext';
import { Login } from './components/Login';
import { CoachView } from './components/CoachView';
import { PlayerView } from './components/PlayerView';
import { Spinner } from './components/Spinner';
import { UserRole } from './types';

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

  return (
    <div className="min-h-screen bg-base-100">
      {currentUser.role === UserRole.Coach && <CoachView />}
      {currentUser.role === UserRole.Player && <PlayerView />}
    </div>
  );
};
