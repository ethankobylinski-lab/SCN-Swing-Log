import React from 'react';
import { PlusIcon } from './icons/PlusIcon';

interface FloatingActionButtonProps {
    onClick: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-20 right-6 z-40 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group active:scale-95"
            aria-label="Start new session"
        >
            <PlusIcon className="w-7 h-7 fill-current group-hover:scale-110 transition-transform" />
        </button>
    );
};
