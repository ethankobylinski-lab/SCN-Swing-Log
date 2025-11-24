import React, { useEffect, useState } from 'react';
import { Session } from '../types';
import { formatDate, calculateExecutionPercentage } from '../utils/helpers';

interface SessionDetailProps {
  session: Session;
  isCoach: boolean;
  onClose: () => void;
  onSaveCoachFeedback?: (feedback: string) => Promise<void> | void;
  isSavingCoachFeedback?: boolean;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  isCoach,
  onClose,
  onSaveCoachFeedback,
  isSavingCoachFeedback,
}) => {
  const [feedback, setFeedback] = useState(session.coachFeedback ?? '');
  const [isSavingInternal, setIsSavingInternal] = useState(false);

  useEffect(() => {
    setFeedback(session.coachFeedback ?? '');
  }, [session.id, session.coachFeedback]);

  const saveInProgress =
    typeof isSavingCoachFeedback === 'boolean' ? isSavingCoachFeedback : isSavingInternal;

  const handleSaveFeedback = async () => {
    if (!onSaveCoachFeedback || saveInProgress) {
      return;
    }
    if (isSavingCoachFeedback === undefined) {
      setIsSavingInternal(true);
    }
    try {
      await onSaveCoachFeedback(feedback.trim());
    } finally {
      if (isSavingCoachFeedback === undefined) {
        setIsSavingInternal(false);
      }
    }
  };

  const formatList = (items?: string[]) =>
    items && items.length > 0 ? items.join(', ') : '—';

  const executionPct = calculateExecutionPercentage(session.sets);

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Session</p>
          <h2 className="text-2xl font-bold text-foreground">{session.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {formatDate(session.date)} • {(session.type ?? 'hitting').toUpperCase()}
            </p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {executionPct}% Execution
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close session detail"
        >
          &times;
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Sets Logged</h3>
        {session.sets.length > 0 ? (
          <div className="space-y-3">
            {session.sets.map((set) => (
              <div
                key={set.setNumber}
                className="border border-border rounded-lg p-4 bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">Set {set.setNumber}</p>
                  {typeof set.grade === 'number' && (
                    <span className="text-xs font-semibold bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                      Grade {set.grade}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Reps</p>
                    <p className="font-semibold">{set.repsAttempted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Executed</p>
                    <p className="font-semibold">{set.repsExecuted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Hard Hits</p>
                    <p className="font-semibold">{set.hardHits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Strikeouts</p>
                    <p className="font-semibold">{set.strikeouts}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Drill Focus</p>
                    <p className="font-semibold">{set.drillLabel || set.drillType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Count</p>
                    <p className="font-semibold">{set.countSituation || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Outs</p>
                    <p className="font-semibold">
                      {typeof set.outs === 'number' ? set.outs : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Base Runners</p>
                    <p className="font-semibold">{formatList(set.baseRunners)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Target Zones</p>
                    <p className="font-semibold">{formatList(set.targetZones)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Pitch Types</p>
                    <p className="font-semibold">{formatList(set.pitchTypes)}</p>
                  </div>
                </div>
                {set.notes && (
                  <p className="text-sm text-muted-foreground border-t border-border pt-2">
                    Notes: {set.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sets logged for this session.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Coach Feedback</h3>
          {session.coachFeedback && (
            <span className="text-xs text-muted-foreground">
              Last updated {session.updatedAt ? formatDate(session.updatedAt) : formatDate(session.date)}
            </span>
          )}
        </div>
        {isCoach && onSaveCoachFeedback ? (
          <div className="space-y-3">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={4}
              className="w-full border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
              placeholder="Share actionable feedback the player can see next time they review this session."
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-md border border-border"
                disabled={saveInProgress}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={saveInProgress}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-secondary text-secondary-foreground disabled:opacity-60"
              >
                {saveInProgress ? 'Saving…' : 'Save Feedback'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-border rounded-lg bg-muted/20">
            {session.coachFeedback ? (
              <p className="text-sm text-foreground whitespace-pre-line">{session.coachFeedback}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No coach feedback yet.</p>
            )}
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
