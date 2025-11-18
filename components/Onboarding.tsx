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
  const [coachTeamAction, setCoachTeamAction] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [teamCodes, setTeamCodes] = useState<{ playerCode: string | null; coachCode: string | null } | null>(null);
  const [copiedCodeType, setCopiedCodeType] = useState<'player' | 'coach' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
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

  useEffect(() => {
    if (!context?.currentUser || !context.currentUser.isNew) {
        return;
    }
    if (context.currentUser.role !== UserRole.Coach) {
        return;
    }

    const hasCoachMembership = (context.currentUser.coachTeamIds?.length ?? 0) > 0 || Boolean(context.activeTeam);
    if (!hasCoachMembership) {
        return;
    }

    context.completeOnboarding()
        .catch((err) => {
            console.warn('Unable to auto-complete coach onboarding. Please finish manually if this persists.', err);
        });
  }, [context?.currentUser?.isNew, context?.currentUser?.role, context?.currentUser?.coachTeamIds?.length, context?.activeTeam?.id]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!context || !name || !role) {
        setError("Please fill out all required fields.");
        return;
    }
    setLoadingLabel('Saving...');
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
    } finally {
        setLoading(false);
        setLoadingLabel(null);
    }
  };

  const handleProfileChange = (field: keyof PlayerProfile, value: string | number) => {
      setPlayerProfile(prev => ({...prev, [field]: value }));
  };
  
  const handleTeamModeChange = (mode: 'create' | 'join') => {
      setCoachTeamAction(mode);
      setError('');
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
    setLoadingLabel('Creating team...');
    setLoading(true);
    try {
        const teamResult = await context.createTeam({
            name: teamName,
            seasonYear: teamYear,
            primaryColor: teamColor,
        });

        if (!teamResult) {
            throw new Error("We couldn't create your team. Please try again.");
        }

        const { teamId, playerCode, coachCode } = teamResult;
        setTeamCodes({ playerCode, coachCode });
        setStep('code');
    } catch (err) {
        setError((err as Error).message || "Unable to create your team. Please try again.");
    } finally {
        setLoading(false);
        setLoadingLabel(null);
    }
  };

  const handleJoinTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!context?.currentUser) {
        setError("Something went wrong. Please refresh and try again.");
        return;
    }
    if (!joinCode.trim()) {
        setError("Enter the invite code the other coach shared.");
        return;
    }
    setLoadingLabel('Joining team...');
    setLoading(true);
    try {
        await context.joinTeamAsCoach(joinCode.trim().toUpperCase());
        setJoinCode('');
        await context.completeOnboarding();
    } catch (err) {
        const message = (err as Error).message || "Unable to join this team. Double-check the code and try again.";
        setError(message);
    } finally {
        setLoading(false);
        setLoadingLabel(null);
    }
  };

  const handleExitOnboarding = () => {
      if (!context?.logout) {
          return;
      }
      setError('');
      context.logout();
  };

  const handleSkipTeamCreation = async () => {
    if (!context) return;
    setError('');
    setLoadingLabel('Continuing...');
    setLoading(true);
    try {
        await context.completeOnboarding();
    } catch (err) {
        setError((err as Error).message || 'Unable to continue without creating a team.');
    } finally {
        setLoading(false);
        setLoadingLabel(null);
    }
  };

  const handleFinish = async () => {
    if (!context) return;
    setError('');
    setLoadingLabel('Finishing...');
    setLoading(true);
    try {
        await context.completeOnboarding();
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setLoading(false);
        setLoadingLabel(null);
    }
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
          {loading ? loadingLabel ?? 'Saving...' : role === UserRole.Coach ? 'Save & Create Team' : 'Complete Profile'}
        </button>
      </div>
    </form>
  );

  const renderTeamStep = () => (
    <div className="space-y-6">
      {error && <p className="text-center text-destructive">{error}</p>}
      <div>
        <h2 className="text-2xl font-semibold text-foreground text-center">
          {coachTeamAction === 'create' ? 'Create Your Team' : 'Join an Existing Team'}
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {coachTeamAction === 'create'
            ? 'Set up your team details so players can join.'
            : 'Enter the invite code from another coach to collaborate on their team.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleTeamModeChange('create')}
          className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
            coachTeamAction === 'create' ? 'bg-secondary text-secondary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Create new team
        </button>
        <button
          type="button"
          onClick={() => handleTeamModeChange('join')}
          className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
            coachTeamAction === 'join' ? 'bg-secondary text-secondary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Join with code
        </button>
      </div>

      {coachTeamAction === 'create' ? (
        <form className="space-y-6" onSubmit={handleTeamSubmit}>
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
                  className={`h-10 w-10 rounded-full border-2 transition-shadow ${
                    teamColor === color ? 'border-secondary shadow-glow-primary' : 'border-border'
                  }`}
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
            {loading ? loadingLabel ?? 'Creating team...' : 'Create Team'}
          </button>
          <button
            type="button"
            onClick={handleSkipTeamCreation}
            disabled={loading}
            className="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Continue without creating a team
          </button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleJoinTeamSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground">Team Code</label>
            <input
              type="text"
              required
              maxLength={10}
              className="mt-1 w-full bg-background border-input rounded-md py-2 px-3 text-sm uppercase tracking-widest text-center font-mono"
              placeholder="ABCDE123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Ask the existing coach for the code from their dashboard.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
          >
            {loading ? loadingLabel ?? 'Joining team...' : 'Join Team as Coach'}
          </button>
        </form>
      )}
    </div>
  );

  const handleCopyTeamCode = (code: string | null, type: 'player' | 'coach') => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeType(type);
    setTimeout(() => setCopiedCodeType(null), 2000);
  };

  const renderCodeCard = (label: string, code: string | null, type: 'player' | 'coach') => (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-card text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        {copiedCodeType === type && <span className="text-xs font-semibold text-success">Copied!</span>}
      </div>
      <span className="text-3xl font-mono tracking-widest text-secondary">{code || '...'}</span>
      <button
        onClick={() => handleCopyTeamCode(code, type)}
        disabled={!code}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold disabled:opacity-50"
      >
        Copy {label}
      </button>
    </div>
  );

  const renderCodeStep = () => (
    <div className="space-y-6 text-center">
      {error && <p className="text-center text-destructive">{error}</p>}
      <h2 className="text-2xl font-semibold text-foreground">Team Ready!</h2>
      <p className="text-muted-foreground">
        Share the player code with your team and the coach code with assistants.
      </p>
      {teamCodes ? (
        <div className="grid gap-4 md:grid-cols-2 text-left">
          {renderCodeCard('Player Code', teamCodes.playerCode, 'player')}
          {renderCodeCard('Coach Code', teamCodes.coachCode, 'coach')}
        </div>
      ) : (
        <p className="text-sm text-destructive">We couldn't generate invite codes. You can refresh or create them from the dashboard later.</p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleFinish}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
      >
        {loading ? loadingLabel ?? 'Finishing...' : 'Go to Dashboard'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative w-full max-w-lg p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        {context?.logout && (
          <button
            type="button"
            onClick={handleExitOnboarding}
            aria-label="Return to sign up"
            className="absolute top-4 right-4 text-xl font-bold leading-none text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-center text-foreground">Welcome!</h1>
        <p className="text-center text-muted-foreground mt-2">
          {step === 'profile' && 'Let’s set up your profile.'}
          {step === 'team' && (coachTeamAction === 'create'
            ? 'Almost there—create your team to finish setup.'
            : 'Enter an existing coach’s invite code to jump into their team.')}
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
