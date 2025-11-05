import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../contexts/DataContext';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Assuming auth is exported from firebaseConfig
import { UserRole } from '../types';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

export const Login: React.FC = () => {
  const [authMode, setAuthMode] = useState<'signUp' | 'signIn'>('signUp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'enterPhone' | 'enterCode'>('enterPhone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const context = useContext(DataContext);

  useEffect(() => {
    // To prevent re-initializing on every render, we attach the verifier to the window object.
    if (!window.recaptchaVerifier) {
      // Use an explicit container for the reCAPTCHA verifier for more reliability
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, this callback is handled by the signInWithPhoneNumber call.
        }
      });
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!context) return;
    try {
      const confirmationResult = await context.sendVerificationCode(phoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setStep('enterCode');
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!context || !window.confirmationResult) return;
    try {
        await context.verifyCodeAndSignIn(window.confirmationResult, verificationCode);
    } catch (err) {
        setError((err as Error).message);
    }
    setLoading(false);
  };
  
  const toggleAuthMode = () => {
      setAuthMode(prev => prev === 'signUp' ? 'signIn' : 'signUp');
      setError('');
      setStep('enterPhone');
      setPhoneNumber('');
      setVerificationCode('');
  }

  const handleDevLogin = (role: UserRole) => {
    if (context && context.setDevUser) {
        context.setDevUser(role);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-lg shadow-lg">
        <div id="recaptcha-container"></div>
        <div>
          <h1 className="text-3xl font-bold text-center text-foreground">
            {authMode === 'signUp' ? 'Create Your Account' : 'Welcome Back!'}
          </h1>
           <p className="text-center text-muted-foreground mt-2">
            {authMode === 'signUp' ? 'Get started by entering your phone number.' : 'Sign in to continue.'}
          </p>
        </div>

        {step === 'enterPhone' && (
          <form className="mt-8 space-y-6" onSubmit={handleSendCode}>
            {error && <p className="text-center text-destructive">{error}</p>}
            <div>
              <label htmlFor="phone-number" className="sr-only">Phone Number</label>
              <input
                id="phone-number"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Phone Number (e.g. +15551234567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        )}

        {step === 'enterCode' && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <h2 className="text-xl font-semibold text-center text-foreground">Enter Verification Code</h2>
            {error && <p className="text-center text-destructive">{error}</p>}
             <p className="text-center text-sm text-muted-foreground">A code has been sent to {phoneNumber}</p>
            <div>
              <label htmlFor="verification-code" className="sr-only">Verification Code</label>
              <input
                id="verification-code"
                name="code"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
                placeholder="6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
            <div>
              <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50">
                 {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
            <button type="button" onClick={() => { setStep('enterPhone'); setError(''); }} className="text-xs text-center text-muted-foreground hover:underline w-full">Use a different phone number</button>
          </form>
        )}
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">
              For Development
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleDevLogin(UserRole.Coach)} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-accent-foreground bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-background">
            Continue as Coach
          </button>
           <button onClick={() => handleDevLogin(UserRole.Player)} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background">
            Continue as Player
          </button>
        </div>


        <div className="text-center">
            <button onClick={toggleAuthMode} className="text-sm text-muted-foreground hover:text-secondary underline">
                {authMode === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
        </div>
      </div>
    </div>
  );
};