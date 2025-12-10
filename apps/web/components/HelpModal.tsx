import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { X, HelpCircle, RotateCcw } from 'lucide-react';
import { OrientationTour } from './OrientationTour';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [showTour, setShowTour] = useState(false);
    const context = useContext(DataContext);

    if (!isOpen) return null;

    const handleReplayTour = () => {
        setShowTour(true);
    };

    const handleTourComplete = () => {
        setShowTour(false);
        onClose();
    };

    const quickTips = [
        {
            title: 'Logging Sessions',
            tip: 'Tap the + button at the bottom to quickly start logging a hitting or pitching session.'
        },
        {
            title: 'Viewing Analytics',
            tip: 'Check the Analytics tab to see your performance trends and identify areas for improvement.'
        },
        {
            title: 'Setting Goals',
            tip: 'Set personal goals to stay motivated and track your progress toward specific targets.'
        },
        {
            title: 'Joining a Team',
            tip: 'Ask your coach for a team code to join your team and share your progress.'
        }
    ];

    if (showTour) {
        return (
            <OrientationTour
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-lg w-full animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold text-foreground">Help & Support</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close help"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Replay Tour Button */}
                    <div>
                        <button
                            onClick={handleReplayTour}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                            <RotateCcw size={20} />
                            Replay Welcome Tour
                        </button>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                            Review the basics of HitJournal
                        </p>
                    </div>

                    {/* Quick Tips */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Tips</h3>
                        <div className="space-y-4">
                            {quickTips.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-muted rounded-lg border border-border"
                                >
                                    <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground">{item.tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional Resources */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Need More Help?</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            If you have questions or need assistance, reach out to your coach or contact support.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
