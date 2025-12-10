import React, { useContext } from 'react';
import { DataContext } from '../contexts/DataContext';

interface RecordSessionModalProps {
  onClose: () => void;
}

export const RecordSessionModal: React.FC<RecordSessionModalProps> = ({ onClose }) => {
  const { setRecordSessionIntent } = useContext(DataContext)!;

  const handleSelect = (type: 'hitting' | 'pitching') => {
    setRecordSessionIntent({ type, id: Date.now() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-foreground">Record Session</h2>
          <p className="text-sm text-muted-foreground">Choose what type of work you&apos;re logging today.</p>
        </div>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => handleSelect('hitting')}
            className="w-full rounded-xl border border-border bg-muted/60 hover:bg-muted/80 text-left px-4 py-3 transition-colors"
          >
            <p className="text-lg font-semibold text-foreground">Hitting Session</p>
            <p className="text-sm text-muted-foreground">Track reps, hard hits, and situational work.</p>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('pitching')}
            className="w-full rounded-xl border border-border bg-muted/60 hover:bg-muted/80 text-left px-4 py-3 transition-colors"
          >
            <p className="text-lg font-semibold text-foreground">Pitching Session</p>
            <p className="text-sm text-muted-foreground">Log total pitches, strike %, velo, and bullpen notes.</p>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
