
import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('coach@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const context = useContext(DataContext);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!context) return;
    try {
      await context.login(email, password);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-base-200 rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-secondary">Baseball Hitting Tracker</h1>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <p className="text-center text-red-400">{error}</p>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-base-300 bg-base-100 placeholder-gray-500 text-gray-200 rounded-t-md focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                placeholder="Email address"
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
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-base-300 bg-base-100 placeholder-gray-500 text-gray-200 rounded-b-md focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:ring-offset-base-100">
              Sign in
            </button>
          </div>
          <p className="text-xs text-center text-gray-400">Hint: Use coach@example.com or player1@example.com with password `password`.</p>
        </form>
      </div>
    </div>
  );
};
