import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Team, UserRole } from '../types';
import { calculateExecutionPercentage, calculateHardHitPercentage, calculateStrikeoutPercentage } from '../utils/helpers';

type InlineStatus = { type: 'success' | 'error'; message: string };
type TeamEditState = { name: string; primaryColor: string | null };

const COLOR_SWATCHES = ['#1d4ed8', '#dc2626', '#16a34a', '#0ea5e9', '#9333ea', '#f97316', '#f59e0b', '#0f172a'];

const ColorChip: React.FC<{ color?: string | null; label?: string }> = ({ color, label }) => {
  if (!color) {
    return <span className="text-sm text-muted-foreground">{label ?? 'Default color'}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
      <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: color }} />
      {color.toUpperCase()}
    </span>
  );
};

export const ProfileTab: React.FC = () => {
  const data = useContext(DataContext);
  const currentUser = data?.currentUser;
  const [nameInput, setNameInput] = useState(currentUser?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<InlineStatus | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamEditState, setTeamEditState] = useState<TeamEditState | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamStatus, setTeamStatus] = useState<InlineStatus | null>(null);

  useEffect(() => {
    setNameInput(currentUser?.name ?? '');
  }, [currentUser?.name]);

  if (!data || !currentUser) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading your profile…
      </div>
    );
  }

  const { updateProfile, updateTeamDetails, getTeamsForCoach, getSessionsForPlayer } = data;
  const isCoach = currentUser.role === UserRole.Coach;
  const coachTeams = useMemo(
    () => (isCoach ? getTeamsForCoach(currentUser.id) : []),
    [getTeamsForCoach, currentUser.id, isCoach]
  );
  const playerSessions = useMemo(
    () => (currentUser.role === UserRole.Player ? getSessionsForPlayer(currentUser.id) : []),
    [currentUser.id, currentUser.role, getSessionsForPlayer]
  );
  const playerSets = useMemo(
    () => (currentUser.role === UserRole.Player ? playerSessions.flatMap((session) => session.sets) : []),
    [currentUser.role, playerSessions]
  );
  const playerStats = useMemo(() => {
    if (currentUser.role !== UserRole.Player) {
      return { exec: 0, hardHit: 0, contact: 0, reps: 0 };
    }
    const exec = calculateExecutionPercentage(playerSets);
    const hardHit = calculateHardHitPercentage(playerSets);
    const strikeoutPercentage = calculateStrikeoutPercentage(playerSets);
    const contact = Math.max(0, 100 - strikeoutPercentage);
    const reps = playerSets.reduce((sum, set) => sum + (set.repsAttempted ?? 0), 0);
    return { exec, hardHit, contact, reps };
  }, [currentUser.role, playerSets]);

  const displayName = currentUser.name?.trim() || (isCoach ? 'Coach' : 'Player');
  const isNameDirty = nameInput.trim() !== (currentUser.name ?? '').trim();

  const beginTeamEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamEditState({ name: team.name, primaryColor: team.primaryColor ?? null });
    setTeamStatus(null);
  };

  const cancelTeamEdit = () => {
    setEditingTeamId(null);
    setTeamEditState(null);
    setTeamStatus(null);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameStatus({ type: 'error', message: 'Please enter your name before saving.' });
      return;
    }
    if (!isNameDirty) {
      setNameStatus({ type: 'error', message: 'Update your name to save changes.' });
      return;
    }
    setSavingName(true);
    setNameStatus(null);
    try {
      await updateProfile({ name: trimmed });
      setNameStatus({ type: 'success', message: 'Name updated successfully.' });
    } catch (error) {
      setNameStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update your name right now.',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!editingTeamId || !teamEditState) {
      return;
    }

    const team = coachTeams.find((t) => t.id === editingTeamId);
    if (!team) {
      return;
    }

    const trimmedName = teamEditState.name.trim();
    const nameChanged = trimmedName !== team.name.trim();
    const colorChanged = teamEditState.primaryColor !== (team.primaryColor ?? null);

    if (!nameChanged && !colorChanged) {
      setTeamStatus({ type: 'error', message: 'No changes to save yet.' });
      return;
    }

    const payload: { name?: string; primaryColor?: string | null } = {};
    if (nameChanged) {
      payload.name = trimmedName;
    }
    if (colorChanged) {
      payload.primaryColor = teamEditState.primaryColor ?? null;
    }

    setTeamSaving(true);
    setTeamStatus(null);
    try {
      await updateTeamDetails(team.id, payload);
      setTeamStatus({ type: 'success', message: 'Team settings saved.' });
      setEditingTeamId(null);
      setTeamEditState(null);
    } catch (error) {
      setTeamStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update this team right now.',
      });
    } finally {
      setTeamSaving(false);
    }
  };

  const renderTeamRow = (team: Team) => {
    const isEditing = editingTeamId === team.id;
    return (
      <div key={team.id} className="border border-border rounded-xl bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-base font-semibold text-foreground">{team.name}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Season {team.seasonYear}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ColorChip color={team.primaryColor} />
            <button
              type="button"
              onClick={() => beginTeamEdit(team)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted/70"
            >
              {isEditing ? 'Editing…' : 'Edit'}
            </button>
          </div>
        </div>
        {isEditing && teamEditState && (
          <div className="border-t border-border px-4 py-4 space-y-4 bg-background/70">
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor={`team-name-${team.id}`}>
                Team name
              </label>
              <input
                id={`team-name-${team.id}`}
                value={teamEditState.name}
                onChange={(e) => setTeamEditState((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Updated team name"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Accent color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((color) => {
                  const selected = teamEditState.primaryColor === color;
                  return (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setTeamEditState((prev) => (prev ? { ...prev, primaryColor: color } : prev))}
                      className={`h-9 w-9 rounded-full border ${selected ? 'ring-2 ring-offset-2 ring-primary border-primary' : 'border-border'
                        }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Use ${color} as team color`}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTeamEditState((prev) => (prev ? { ...prev, primaryColor: null } : prev))}
                  className={`h-9 rounded-full border px-4 text-xs font-semibold ${teamEditState.primaryColor === null
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Default
                </button>
              </div>
            </div>
            {teamStatus && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${teamStatus.type === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
                  }`}
              >
                {teamStatus.message}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelTeamEdit}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground"
                disabled={teamSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeam}
                disabled={teamSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-70"
              >
                {teamSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const profileHeading = isCoach ? 'Coach Profile' : 'Player Profile';
  const profileDescription = isCoach
    ? 'Fine-tune your display info and keep your teams up to date.'
    : 'Review your skill ratings and see everything your coach sees about you.';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{profileHeading}</h2>
        <p className="text-sm text-muted-foreground">
          {profileDescription}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Name</p>
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Role</p>
            <p className="text-lg font-semibold text-foreground">{currentUser.role}</p>
          </div>
          {currentUser.email && (
            <div>
              <p className="text-xs uppercase text-muted-foreground">Email</p>
              <p className="text-lg font-semibold text-foreground">{currentUser.email}</p>
            </div>
          )}
        </div>
        {isCoach ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Display name</p>
                <p className="text-xs text-muted-foreground">Shown on invites, leaderboards, and the dashboard header.</p>
              </div>
            </div>
            <input
              id="coach-display-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Coach name"
            />
            {nameStatus && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${nameStatus.type === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
                  }`}
              >
                {nameStatus.message}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setNameInput(currentUser.name ?? '')}
                disabled={savingName || !isNameDirty}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                disabled={!isNameDirty || savingName}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition disabled:opacity-60"
              >
                {savingName ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-sm text-muted-foreground">
            Need to update your details? Reach out to your coach so they can refresh your profile.
          </div>
        )}
      </div>

      {!isCoach && (
        <section className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Skill Snapshot</h3>
            <p className="text-sm text-muted-foreground">
              Video-game style ratings are built from every session you log so you can see strengths at a glance.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Execution</p>
              <p className="text-3xl font-bold text-foreground mt-1">{playerStats.exec}%</p>
              <p className="text-xs text-muted-foreground mt-1">Quality of reps</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Power</p>
              <p className="text-3xl font-bold text-foreground mt-1">{playerStats.hardHit}%</p>
              <p className="text-xs text-muted-foreground mt-1">Hard-hit rate</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
              <p className="text-3xl font-bold text-foreground mt-1">{playerStats.contact}%</p>
              <p className="text-xs text-muted-foreground mt-1">Balls in play</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Reps</p>
              <p className="text-3xl font-bold text-foreground mt-1">{playerStats.reps.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Lifetime logged</p>
            </div>
          </div>
          {playerSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Log your first session to unlock personalized ratings.
            </p>
          )}
        </section>
      )}

      {isCoach ? (
        <section className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Teams you coach</h3>
              <p className="text-sm text-muted-foreground">
                Rename teams or assign a quick accent color for emails, invites, and roster chips.
              </p>
            </div>
          </div>
          {coachTeams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-8 text-center text-muted-foreground">
              Add or join a team to unlock these settings.
            </div>
          ) : (
            <div className="space-y-4">
              {coachTeams.map((team) => renderTeamRow(team))}
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Player editing controls are limited for now. Coaches can make any roster or team updates as needed.
        </p>
      )}
    </div>
  );
};
