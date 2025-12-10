import React, { useState, useEffect, useContext, useRef } from 'react';
import { DataContext } from '../contexts/DataContext';
import { X } from 'lucide-react';
import { OrientationProgress } from '../types';

interface FeatureTooltipProps {
    id: keyof OrientationProgress;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: React.ReactNode;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
    id,
    title,
    description,
    position = 'bottom',
    children
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const context = useContext(DataContext);
    const hasShown = useRef(false);

    useEffect(() => {
        // Check if this tooltip has already been seen
        const progress = context?.currentUser?.orientationProgress;
        const alreadySeen = progress?.[id];

        if (!alreadySeen && !hasShown.current) {
            // Show tooltip after a brief delay
            const timer = setTimeout(() => {
                setIsVisible(true);
                hasShown.current = true;
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [context?.currentUser?.orientationProgress, id]);

    const handleDismiss = async () => {
        setIsVisible(false);
        try {
            await context?.updateOrientationProgress({ [id]: true });
        } catch (error) {
            console.error('Error updating orientation progress:', error);
        }
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-card border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-card border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-card border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-card border-y-transparent border-l-transparent'
    };

    return (
        <div className="relative inline-block">
            {children}

            {isVisible && (
                <div
                    className={`absolute z-50 ${positionClasses[position]} animate-fadeIn`}
                    style={{ minWidth: '250px', maxWidth: '320px' }}
                >
                    {/* Arrow */}
                    <div
                        className={`absolute w-0 h-0 ${arrowClasses[position]}`}
                        style={{ borderWidth: '8px' }}
                    />

                    {/* Tooltip content */}
                    <div className="bg-card border border-primary shadow-lg rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-sm">{title}</h4>
                            <button
                                onClick={handleDismiss}
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                aria-label="Dismiss tooltip"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{description}</p>
                        <button
                            onClick={handleDismiss}
                            className="w-full px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors font-medium"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
