import React, { ButtonHTMLAttributes } from 'react';

/**
 * Standardized Button component with consistent styling and variants
 * Replaces generic "Submit" buttons with descriptive, accessible buttons
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'accent' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    showSuccessPulse?: boolean; // Triggers success animation
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    className = '',
    disabled,
    showSuccessPulse = false,
    ...props
}) => {
    const [pulseKey, setPulseKey] = React.useState(0);

    // Trigger pulse animation when showSuccessPulse changes to true
    React.useEffect(() => {
        if (showSuccessPulse) {
            setPulseKey(prev => prev + 1);
        }
    }, [showSuccessPulse]);

    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active-press will-animate';

    const variantStyles: Record<ButtonVariant, string> = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        accent: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
        link: 'bg-transparent text-blue-600 hover:underline focus:ring-0 p-0 h-auto'
    };

    const sizeStyles: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    // Apply success pulse animation by using a key trick
    const pulseClass = showSuccessPulse ? 'animate-successPulse' : '';

    return (
        <button
            key={pulseKey} // Restart animation on key change
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${pulseClass} ${className}`}
            disabled={disabled || isLoading}
            style={{
                // Prevent width shift during loading by preserving min-width
                minWidth: isLoading ? 'max-content' : undefined,
            }}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center animate-fadeIn">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </span>
            ) : (
                <span className="flex items-center animate-fadeIn">
                    {leftIcon && <span className="mr-2">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="ml-2">{rightIcon}</span>}
                </span>
            )}
        </button>
    );
};

// Preset button components for common actions
export const SaveButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="primary" {...props}>Save</Button>
);

export const CancelButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="secondary" {...props}>Cancel</Button>
);

export const DeleteButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="danger" {...props}>Delete</Button>
);

export const CreateButton: React.FC<Omit<ButtonProps, 'children'> & { label: string }> = ({ label, ...props }) => (
    <Button variant="primary" {...props}>Create {label}</Button>
);

export const SaveSessionButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="success" {...props}>Save Session</Button>
);

export const LogPitchButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="primary" size="lg" {...props}>Log Pitch</Button>
);

export const EndSessionButton: React.FC<Omit<ButtonProps, 'children'>> = (props) => (
    <Button variant="primary" {...props}>End Session</Button>
);
