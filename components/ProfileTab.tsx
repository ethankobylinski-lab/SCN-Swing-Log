import React, { useContext } from 'react';
import { DataContext } from '../contexts/DataContext';

export const ProfileTab: React.FC = () => {
  const context = useContext(DataContext);
  const currentUser = context?.currentUser;

  if (!currentUser) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading your profile…
      </div>
    );
  }

  const displayName = currentUser.name?.trim() || 'Unnamed Player';

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
      <div className="bg-card border border-border rounded-xl p-4 space-y-2 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="text-lg font-semibold text-foreground">{displayName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="text-lg font-semibold text-foreground">{currentUser.role}</p>
        </div>
        {currentUser.email && (
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-lg font-semibold text-foreground">{currentUser.email}</p>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Profile editing is coming soon. For now, contact your coach if you need to update your information.
      </p>
    </div>
  );
};
