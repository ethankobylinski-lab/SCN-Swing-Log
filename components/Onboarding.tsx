import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { UserRole, PlayerProfile } from '../types';

export const Onboarding: React.FC = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Player);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>({
    gradYear: new Date().getFullYear() + 4,
    bats: 'R',
    throws: 'R',
    position: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const context = useContext(DataContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!context || !name || !role) {
        setError("Please fill out all required fields.");
        return;
    }
    setLoading(true);
    try {
        await context.createUserProfile({
            name,
            role,
            playerProfile: role === UserRole.Player ? playerProfile : undefined
        });
        // The DataContext will update the currentUser and App.tsx will re-render
    } catch (err) {
        setError((err as Error).message);
    }
    setLoading(false);
  };

  const handleProfileChange = (field: keyof PlayerProfile, value: string | number) => {
      setPlayerProfile(prev => ({...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-foreground">Welcome!</h1>
          <p className="text-center text-muted-foreground mt-2">Let's set up your profile.</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-center text-destructive">{error}</p>}
          
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-foreground">Full Name</label>
            <input
              id="full-name"
              type="text"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground">I am a...</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole(UserRole.Player)} className={`py-3 px-4 rounded-lg font-semibold transition-colors ${role === UserRole.Player ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Player</button>
              <button type="button" onClick={() => setRole(UserRole.Coach)} className={`py-3 px-4 rounded-lg font-semibold transition-colors ${role === UserRole.Coach ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Coach</button>
            </div>
          </div>

          {role === UserRole.Player && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
                <h3 className="font-semibold text-foreground">Player Details</h3>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-muted-foreground">Grad Year</label>
                        <input type="number" value={playerProfile.gradYear} onChange={e => handleProfileChange('gradYear', parseInt(e.target.value))} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"/>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-muted-foreground">Position</label>
                        <input type="text" value={playerProfile.position} onChange={e => handleProfileChange('position', e.target.value)} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"/>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-muted-foreground">Bats</label>
                        <select value={playerProfile.bats} onChange={e => handleProfileChange('bats', e.target.value)} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm">
                            <option>R</option><option>L</option><option>S</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground">Throws</label>
                        <select value={playerProfile.throws} onChange={e => handleProfileChange('throws', e.target.value)} className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm">
                            <option>R</option><option>L</option>
                        </select>
                    </div>
                </div>
            </div>
          )}

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50">
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};