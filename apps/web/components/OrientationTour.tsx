import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrientationTourProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const OrientationTour: React.FC<OrientationTourProps> = ({ onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const context = useContext(DataContext);

    const steps = [
        {
            title: 'Welcome to HitJournal!',
            description: 'Your personal baseball training companion. Track your progress, analyze your performance, and reach your goals.',
            illustration: '⚾',
            content: [
                'Log hitting and pitching sessions',
                'Track your stats and progress over time',
                'Set and achieve personal goals',
                'Get insights from detailed analytics'
            ]
        },
        {
            title: 'Log Your Sessions',
            description: 'Easily record your training sessions with detailed metrics.',
            illustration: '📝',
            content: [
                'Tap the + button to start logging',
                'Choose between hitting or pitching',
                'Track reps, execution, and quality',
                'Add notes and reflections'
            ]
        },
        {
            title: 'Track Your Progress',
            description: 'View your performance over time with powerful analytics.',
            illustration: '📊',
            content: [
                'See your stats in the Analytics tab',
                'Review past sessions in History',
                'Monitor trends and improvements',
                'Identify areas to focus on'
            ]
        },
        {
            title: 'You\'re All Set!',
            description: 'Ready to start your training journey? Let\'s go!',
            illustration: '🚀',
            content: [
                'Join your team using a coach\'s code',
                'Start logging your first session',
                'Set your first goal',
                'Check out the Help section anytime'
            ]
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            await context?.completeOrientationTour();
            await context?.updateOrientationProgress({ welcomeTourCompleted: true });
            onComplete();
        } catch (error) {
            console.error('Error completing orientation:', error);
            onComplete(); // Still proceed even if update fails
        }
    };

    const handleSkip = async () => {
        try {
            await context?.completeOrientationTour();
            onSkip();
        } catch (error) {
            console.error('Error skipping orientation:', error);
            onSkip(); // Still proceed even if update fails
        }
    };

    const currentStepData = steps[currentStep];
    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center  p-4 z-50 animate-fadeIn">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{currentStepData.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Step {currentStep + 1} of {steps.length}
                        </p>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Skip tour"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Illustration */}
                    <div className="text-6xl mb-6 animate-bounce">{currentStepData.illustration}</div>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6">{currentStepData.description}</p>

                    {/* Content list */}
                    <ul className="space-y-3 text-left mb-8">
                        {currentStepData.content.map((item, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-3 text-foreground animate-fadeInUp"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <span className="text-primary mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer with navigation */}
                <div className="p-6 border-t border-border flex justify-between items-center">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Previous
                    </button>

                    <div className="flex gap-2">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentStep
                                        ? 'bg-primary w-4'
                                        : index < currentStep
                                            ? 'bg-primary/50'
                                            : 'bg-muted'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                    >
                        {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                        {currentStep < steps.length - 1 && <ChevronRight size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
