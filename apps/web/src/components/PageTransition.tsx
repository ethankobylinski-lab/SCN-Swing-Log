import React, { useState, useEffect } from 'react';

/**
 * PageTransition - Smooth fade + slide transitions for tab/page changes
 * Provides iOS-fluid page transitions with athletic timing
 */

interface PageTransitionProps {
    show: boolean;
    children: React.ReactNode;
    className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ show, children, className = '' }) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready before animating
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        } else {
            setIsAnimating(false);
            // Wait for exit animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 150); // Match fadeSlideDown duration
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={`${isAnimating ? 'animate-fadeSlideUp' : 'animate-fadeSlideDown'} ${className}`}
        >
            {children}
        </div>
    );
};
