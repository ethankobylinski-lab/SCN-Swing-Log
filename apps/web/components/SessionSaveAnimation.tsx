import React, { useState, useEffect, useMemo } from 'react';
import { Session } from '../types';
import { calculateExecutionPercentage, calculateHardHitPercentage } from '../utils/helpers';

interface SessionSaveAnimationProps {
  session: Session | null;
  onClose: () => void;
}

const useCountUp = (endValue: number, duration: number = 1500) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (endValue === 0) return;
    let startTime: number | null = null;
    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const currentVal = Math.floor(endValue * percentage);
      setCount(currentVal);
      if (progress < duration) {
        requestAnimationFrame(animateCount);
      } else {
        setCount(endValue);
      }
    };
    const frameId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(frameId);
  }, [endValue, duration]);
  
  return count;
};

const AnimatedProgressBar: React.FC<{ label: string; value: number; colorClass: string }> = ({ label, value, colorClass }) => {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        // Timeout ensures the transition is visible on mount
        const timer = setTimeout(() => setWidth(value), 100);
        return () => clearTimeout(timer);
    }, [value]);

    const displayValue = useCountUp(value);

    return (
        <div>
            <div className="flex justify-between items-baseline text-lg font-medium text-foreground">
                <span className="font-bold">{label}</span>
                <span className="text-sm text-muted-foreground">{displayValue}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-full bg-muted rounded-full h-3">
                    <div className={`${colorClass} h-3 rounded-full transition-all ease-out duration-1000`} style={{ width: `${width}%` }}></div>
                </div>
            </div>
        </div>
    );
};


export const SessionSaveAnimation: React.FC<SessionSaveAnimationProps> = ({ session, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (session) {
      setShow(true);
    }
  }, [session]);
  
  const stats = useMemo(() => {
    if (!session) return { exec: 0, hardHit: 0, reps: 0 };
    const allSets = session.sets;
    return {
        exec: calculateExecutionPercentage(allSets),
        hardHit: calculateHardHitPercentage(allSets),
        reps: allSets.reduce((sum, set) => sum + set.repsAttempted, 0)
    };
  }, [session]);

  const animatedReps = useCountUp(stats.reps);

  if (!session) return null;

  return (
    <div className={`fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center transition-all duration-500 ease-out ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-black text-primary">Session Complete!</h1>
            <p className="text-muted-foreground mt-2">Great work. Here's your summary for:</p>
            <h2 className="text-xl font-bold text-foreground mt-1">{session.name}</h2>

            <div className="my-8 space-y-6">
                <div className="text-center">
                    <p className="text-lg font-medium text-muted-foreground">Total Reps</p>
                    <p className="text-6xl font-bold text-secondary">{animatedReps}</p>
                </div>
                <AnimatedProgressBar label="Execution %" value={stats.exec} colorClass="bg-primary" />
                <AnimatedProgressBar label="Hard Hit %" value={stats.hardHit} colorClass="bg-accent" />
            </div>

            <button
                onClick={onClose}
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-3 px-6 rounded-lg text-lg transition-transform hover:scale-105"
            >
                Done
            </button>
        </div>
    </div>
  );
};
