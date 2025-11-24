import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string, duration?: number) => void;
    hideToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, duration: number = 5000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toast: Toast = { id, type, message, duration };

        setToasts((prev) => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                hideToast(id);
            }, duration);
        }
    }, [hideToast]);

    const success = useCallback((message: string, duration?: number) => {
        showToast('success', message, duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast('error', message, duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast('info', message, duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast('warning', message, duration);
    }, [showToast]);

    const value: ToastContextType = {
        toasts,
        showToast,
        hideToast,
        success,
        error,
        info,
        warning,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onClose={hideToast} />
        </ToastContext.Provider>
    );
};

// Toast Container Component
interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxWidth: '400px',
            }}
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};

// Individual Toast Component
interface ToastItemProps {
    toast: Toast;
    onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
    const getToastStyles = (type: ToastType) => {
        const baseStyles = {
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '0.95rem',
            minWidth: '300px',
            willChange: 'transform, opacity',
        };

        const typeStyles = {
            success: {
                backgroundColor: '#4CAF50',
                color: 'white',
            },
            error: {
                backgroundColor: '#f44336',
                color: 'white',
            },
            warning: {
                backgroundColor: '#ff9800',
                color: 'white',
            },
            info: {
                backgroundColor: '#2196F3',
                color: 'white',
            },
        };

        return { ...baseStyles, ...typeStyles[type] };
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
        }
    };

    return (
        <div style={getToastStyles(toast.type)} className="animate-fadeSlideUp">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{getIcon(toast.type)}</span>
                <span>{toast.message}</span>
            </div>
            <button
                onClick={() => onClose(toast.id)}
                style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    transition: 'background 0.2s ease',
                }}
                aria-label="Close"
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            >
                ×
            </button>
        </div>
    );
};
