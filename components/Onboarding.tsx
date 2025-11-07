import React, { useState, useContext, useEffect } from 'react';
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
  const [step, setStep] = useState<'profile' | 'team' | 'code'>('profile');
  const [teamName, setTeamName] = useState('');
  const [teamYear, setTeamYear] = useState(new Date().getFullYear());
  const [teamColor, setTeamColor] = useState('#1d4ed8');
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const context = useContext(DataContext);
  const colorOptions = ['#1d4ed8', '#2563eb', '#16a34a', '#dc2626', '#f97316', '#7c3aed', '#0f172a'];

  useEffect(() => {
    if (!context?.currentUser) return;
    if (context.currentUser.name && !name) {
      setName(context.currentUser.name);
    }
    if (context.currentUser.role && role !== context.currentUser.role) {
      setRole(context.currentUser.role);
    }
    if (context.currentUser.isNew && context.currentUser.role === UserRole.Coach && step === 'profile' && context.currentUser.name) {
      setStep('team');
    }
  }, [context?.currentUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
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
        if (role === UserRole.Coach) {
            setStep('team');
        }
    } catch (err) {
        setError((err as Error).message);
    }
    setLoading(false);
  };

  const handleProfileChange = (field: keyof PlayerProfile, value: string | number) => {
      setPlayerProfile(prev => ({...prev, [field]: value }));
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!context?.currentUser) {
        setError("Something went wrong. Please refresh and try again.");
        return;
    }
    if (!teamName || !teamYear || !teamColor) {
        setError("Please complete all team fields.");
        return;
    }
    setLoading(true);
    try {
        const teamId = await context.createTeam({
            name: teamName,
            seasonYear: teamYear,
            primaryColor: teamColor,
        }, context.currentUser.id);

        if (!teamId) {
            throw new Error("We couldn't create your team. Please try again.");
        }

        const code = await context.getJoinCodeForTeam(teamId);
        if (code) {
            setTeamCode(code);
        }
        setStep('code');
    } catch (err) {
        setError((err as Error).message || "Unable to create your team. Please try again.");
    }
    setLoading(false);
  };

  const handleFinish = async () => {
    if (!context) return;
    setError('');
    setLoading(true);
    try {
        await context.completeOnboarding();
    } catch (err) {
        setError((err as Error).message);
    }
    setLoading(false);
  };

  const renderProfileStep = () => (
    <form className="space-y-6" onSubmit={handleProfileSubmit}>
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
          {loading ? 'Saving...' : role === UserRole.Coach ? 'Save & Create Team' : 'Complete Profile'}
        </button>
      </div>
    </form>
  );

  const renderTeamStep = () => (
    <form className="space-y-6" onSubmit={handleTeamSubmit}>
      {error && <p className="text-center text-destructive">{error}</p>}
      <div>
        <h2 className="text-2xl font-semibold text-foreground text-center">Create Your Team</h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Set up your team details so players can join.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Team Name</label>
        <input
          type="text"
          required
          className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"
          placeholder="e.g. SCN Eagles"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Season Year</label>
        <input
          type="number"
          required
          className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm"
          value={teamYear}
          min={2000}
          max={2100}
          onChange={(e) => setTeamYear(parseInt(e.target.value))}
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-foreground mb-2">Primary Team Color</span>
        <div className="flex flex-wrap gap-3">
          {colorOptions.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => setTeamColor(color)}
              className={`h-10 w-10 rounded-full border-2 transition-shadow ${teamColor === color ? 'border-secondary shadow-glow-primary' : 'border-border'}`}
              style={{ backgroundColor: color }}
            >
              <span className="sr-only">Select color {color}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
      >
        {loading ? 'Creating team...' : 'Create Team'}
      </button>
    </form>
  );

  const renderCodeStep = () => (
    <div className="space-y-6 text-center">
      {error && <p className="text-center text-destructive">{error}</p>}
      <h2 className="text-2xl font-semibold text-foreground">Team Ready!</h2>
      <p className="text-muted-foreground">
        Share this code with your players so they can join your team.
      </p>
      {teamCode ? (
        <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-dashed border-secondary px-6 py-4 bg-secondary/10">
          <span className="text-sm uppercase tracking-widest text-muted-foreground">Team Code</span>
          <span className="text-3xl font-bold text-secondary-foreground">{teamCode}</span>
        </div>
      ) : (
        <p className="text-sm text-destructive">We couldn't generate a join code. You can do this later from the dashboard.</p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleFinish}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
      >
        {loading ? 'Finishing...' : 'Go to Dashboard'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-foreground">Welcome!</h1>
          <p className="text-center text-muted-foreground mt-2">
            {step === 'profile' && 'Let’s set up your profile.'}
            {step === 'team' && 'Almost there—create your team to finish setup.'}
            {step === 'code' && 'Team created! Share the invite code and jump in.'}
          </p>
        </div>
        {step === 'profile' && renderProfileStep()}
        {step === 'team' && renderTeamStep()}
        {step === 'code' && renderCodeStep()}
      </div>
    </div>
  );
};
