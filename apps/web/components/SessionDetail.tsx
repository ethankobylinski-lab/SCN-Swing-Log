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
                className="border border-border/60 rounded-xl p-5 bg-card shadow-sm hover:shadow-md transition-shadow space-y-4 relative overflow-hidden"
              >
                {/* Set Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-md text-sm">
                      Set {set.setNumber}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {set.drillLabel || set.drillType || 'General Drill'}
                    </span>
                  </div>
                  {typeof set.grade === 'number' && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${set.grade >= 8 ? 'bg-green-100 text-green-700' :
                        set.grade >= 6 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      Grade {set.grade}/10
                    </span>
                  )}
                </div>

                {/* Main Stats Row */}
                <div className="grid grid-cols-4 gap-4 py-2">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Reps</p>
                    <p className="text-xl font-black text-foreground">{set.repsAttempted}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Executed</p>
                    <p className="text-xl font-black text-primary">{set.repsExecuted}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Hard Hits</p>
                    <p className="text-xl font-black text-secondary">{set.hardHits}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Strikeouts</p>
                    <p className="text-xl font-black text-destructive">{set.strikeouts}</p>
                  </div>
                </div>

                {/* Context Details Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm bg-muted/20 rounded-lg p-3 border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs font-medium">Count</span>
                    <span className="font-semibold text-foreground">{set.countSituation || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs font-medium">Outs</span>
                    <span className="font-semibold text-foreground">{typeof set.outs === 'number' ? set.outs : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs font-medium">Runners</span>
                    <span className="font-semibold text-foreground">{formatList(set.baseRunners)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs font-medium">Pitch Types</span>
                    <span className="font-semibold text-foreground truncate max-w-[120px] text-right" title={formatList(set.pitchTypes)}>{formatList(set.pitchTypes)}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center pt-1 border-t border-border/20 mt-1">
                    <span className="text-muted-foreground text-xs font-medium">Target Zones</span>
                    <span className="font-semibold text-foreground">{formatList(set.targetZones)}</span>
                  </div>
                </div>

                {set.notes && (
                  <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3 text-sm">
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-foreground/80 italic">{set.notes}</p>
                  </div>
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
