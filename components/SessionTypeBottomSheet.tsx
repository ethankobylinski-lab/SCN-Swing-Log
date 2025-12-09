import React from 'react';

interface SessionTypeBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectHitting: () => void;
    onSelectPitching: () => void;
}

export const SessionTypeBottomSheet: React.FC<SessionTypeBottomSheetProps> = ({
    isOpen,
    onClose,
    onSelectHitting,
    onSelectPitching,
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl animate-slide-up pb-safe">
                <div className="p-6 space-y-4">
                    {/* Handle bar */}
                    <div className="flex justify-center">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground">Start a Session</h3>
                        <p className="text-sm text-muted-foreground mt-1">What are you working on today?</p>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                        {/* Hitting Session Button */}
                        <button
                            onClick={() => {
                                onSelectHitting();
                                onClose();
                            }}
                            className="flex items-center gap-4 p-4 bg-background hover:bg-accent border-2 border-border hover:border-primary rounded-xl transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="text-2xl">⚾️</span>
                            </div>
                            <div className="flex-1 text-left">
                                <h4 className="font-bold text-foreground text-lg">Start Hitting Session</h4>
                                <p className="text-sm text-muted-foreground">Log swings, drills, and mechanics</p>
                            </div>
                            <svg
                                className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Pitching Session Button */}
                        <button
                            onClick={() => {
                                onSelectPitching();
                                onClose();
                            }}
                            className="flex items-center gap-4 p-4 bg-background hover:bg-accent border-2 border-border hover:border-secondary rounded-xl transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div className="flex-1 text-left">
                                <h4 className="font-bold text-foreground text-lg">Start Pitching Session</h4>
                                <p className="text-sm text-muted-foreground">Track bullpen, flat ground, and more</p>
                            </div>
                            <svg
                                className="w-6 h-6 text-muted-foreground group-hover:text-secondary transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Cancel Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-muted-foreground hover:text-foreground font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};
