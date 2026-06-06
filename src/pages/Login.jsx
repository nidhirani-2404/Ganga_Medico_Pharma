import React, { useState } from 'react';
import { useAuth } from '../App';
import { Stethoscope, Lock, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      login(data.token);
      if (data.user.role === 'billing') {
        navigate('/billing');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid connection or server error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-primary-50 via-white to-primary-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden p-8 animate-in zoom-in-95 duration-200">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/20">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mt-4 leading-none">Ganga Medico</h2>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Chemist Management Portal</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/10 transition-colors flex items-center justify-center"
            disabled={submitting}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Help Center */}
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <div className="inline-block p-3 bg-slate-50 rounded-xl text-left">
            <p className="text-[10px] font-bold text-slate-500 leading-none">Testing Credentials:</p>
            <p className="text-[10px] text-slate-600 mt-1.5 leading-none">
              Username: <code className="font-mono font-bold text-primary-600">admin</code>
            </p>
            <p className="text-[10px] text-slate-600 mt-1 leading-none">
              Password: <code className="font-mono font-bold text-primary-600">admin123</code>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
