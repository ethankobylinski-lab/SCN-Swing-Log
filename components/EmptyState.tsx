import React from 'react';

/**
 * Empty state component for when there's no data to display
 * Provides helpful messaging and clear calls-to-action
 */

interface EmptyStateProps {
    icon?: React.ReactNode | string;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '📊',
    title,
    message,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center py-12 px-4 animate-fadeIn ${className}`}>
            {/* Icon */}
            <div className="text-6xl mb-4 opacity-50">
                {typeof icon === 'string' ? icon : icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {title}
            </h3>

            {/* Message */}
            <p className="text-gray-600 max-w-md mb-6">
                {message}
            </p>

            {/* Actions */}
            {(actionLabel || secondaryActionLabel) && (
                <div className="flex gap-3">
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors active-press"
                        >
                            {actionLabel}
                        </button>
                    )}

                    {secondaryActionLabel && onSecondaryAction && (
                        <button
                            onClick={onSecondaryAction}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors active-press"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Preset empty states for common scenarios
export const NoSessionsEmpty: React.FC<{ onLogSession: () => void }> = ({ onLogSession }) => (
    <EmptyState
        icon="⚾"
        title="No Sessions Yet"
        message="Log your first training session to start tracking your progress and see detailed analytics."
        actionLabel="Log Session"
        onAction={onLogSession}
    />
);

export const NoHistoryEmpty: React.FC<{ onLogSession: () => void }> = ({ onLogSession }) => (
    <EmptyState
        icon="📋"
        title="No Session History"
        message="Your training history will appear here once you log your first session."
        actionLabel="Log First Session"
        onAction={onLogSession}
    />
);

export const NoAnalyticsEmpty: React.FC<{ onLogSession: () => void }> = ({ onLogSession }) => (
    <EmptyState
        icon="📊"
        title="No Analytics Data"
        message="Complete a few training sessions to unlock detailed performance analytics and insights."
        actionLabel="Log Session"
        onAction={onLogSession}
    />
);

export const NoGoalsEmpty: React.FC<{ onCreateGoal: () => void }> = ({ onCreateGoal }) => (
    <EmptyState
        icon="🎯"
        title="No Goals Set"
        message="Set personal goals to track your progress and stay motivated."
        actionLabel="Create Goal"
        onAction={onCreateGoal}
    />
);

export const NoDrillsEmpty: React.FC<{ onCreateDrill: () => void }> = ({ onCreateDrill }) => (
    <EmptyState
        icon="🏋️"
        title="No Drills Created"
        message="Create drill templates to assign to your players and track team progress."
        actionLabel="Create Drill"
        onAction={onCreateDrill}
    />
);

export const NoAssignedDrillsEmpty: React.FC = () => (
    <EmptyState
        icon="🏋️"
        title="No Drills Assigned Yet"
        message="Your coach hasn't assigned you any drills yet. Check back later or log an ad-hoc session in the meantime!"
    />
);

export const NoPlayersEmpty: React.FC = () => (
    <EmptyState
        icon="👥"
        title="No Players on Team"
        message="Share your team join code with players to get started."
    />
);
