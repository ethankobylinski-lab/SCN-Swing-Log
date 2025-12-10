import React from 'react';

/**
 * Loading skeleton component for consistent loading states across the app
 */

interface LoadingSkeletonProps {
    variant?: 'card' | 'text' | 'stat' | 'chart' | 'list';
    count?: number;
    className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    variant = 'card',
    count = 1,
    className = ''
}) => {
    const shimmerClass = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent';

    const renderSkeleton = () => {
        switch (variant) {
            case 'card':
                return (
                    <div className={`animate-pulse bg-gray-200 rounded-lg p-4 ${shimmerClass} ${className}`}>
                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </div>
                );

            case 'text':
                return (
                    <div className={`animate-pulse ${className}`}>
                        <div className={`h-4 bg-gray-200 rounded w-full ${shimmerClass}`}></div>
                    </div>
                );

            case 'stat':
                return (
                    <div className={`animate-pulse bg-gray-200 rounded-lg p-6 ${shimmerClass} ${className}`}>
                        <div className="h-8 bg-gray-300 rounded w-1/3 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
                    </div>
                );

            case 'chart':
                return (
                    <div className={`animate-pulse bg-gray-200 rounded-lg p-6 ${shimmerClass} ${className}`}>
                        <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
                        <div className="flex items-end justify-between h-48 gap-2">
                            {[...Array(7)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-gray-300 rounded-t w-full"
                                    style={{ height: `${Math.random() * 60 + 40}%` }}
                                ></div>
                            ))}
                        </div>
                    </div>
                );

            case 'list':
                return (
                    <div className={`animate-pulse space-y-3 ${className}`}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`bg-gray-200 rounded-lg p-4 ${shimmerClass}`}>
                                <div className="h-5 bg-gray-300 rounded w-2/3 mb-2"></div>
                                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {[...Array(count)].map((_, index) => (
                <div key={index} className={count > 1 ? 'mb-4' : ''}>
                    {renderSkeleton()}
                </div>
            ))}
        </>
    );
};

// Specific skeleton components for common use cases
export const SessionCardSkeleton: React.FC = () => (
    <LoadingSkeleton variant="card" />
);

export const StatCardSkeleton: React.FC = () => (
    <LoadingSkeleton variant="stat" />
);

export const ChartSkeleton: React.FC = () => (
    <LoadingSkeleton variant="chart" />
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <LoadingSkeleton variant="list" count={count} />
);
