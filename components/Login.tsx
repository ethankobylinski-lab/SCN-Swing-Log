import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [authMode, setAuthMode] = useState<'signUp' | 'signIn'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const context = useContext(DataContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!context) {
      setError('Authentication is unavailable. Please refresh and try again.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'signUp') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await context.emailSignUp(email, password);
      } else {
        await context.emailSignIn(email, password);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  const toggleAuthMode = () => {
      setAuthMode(prev => prev === 'signUp' ? 'signIn' : 'signUp');
      setError('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
  }

  const handleDevLogin = (role: UserRole) => {
    if (context && context.setDevUser) {
        context.setDevUser(role);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">
              {authMode === 'signUp' ? 'Create Your Account' : 'Welcome Back!'}
            </h1>
            <button
              type="button"
              onClick={toggleAuthMode}
              className="text-sm font-medium text-secondary hover:text-secondary/80 underline-offset-4 hover:underline"
            >
              {authMode === 'signUp' ? 'Back to Sign In' : 'Create Account'}
            </button>
          </div>
          <p className="text-muted-foreground">
            {authMode === 'signUp'
              ? 'Enter your details below to get started.'
              : 'Sign in with the email and password you used when creating your account.'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-center text-destructive">{error}</p>}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'}
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authMode === 'signUp' && (
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm password</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-background disabled:opacity-50"
          >
            {loading
              ? authMode === 'signUp'
                ? 'Creating...'
                : 'Signing in...'
              : authMode === 'signUp'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        
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


      </div>
    </div>
  );
};
