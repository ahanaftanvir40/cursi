import React, { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type AuthMode = 'signin' | 'signup';

export function LoginPage(): React.ReactElement {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Check your email for a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // authStore listener fires automatically — App will route to ChatPage
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-panel">
      {/* Drag region */}
      <div className="drag-region h-8 shrink-0" />

      {/* Content */}
      <div className="flex flex-col flex-1 items-center justify-center px-8 pb-8 gap-6">
        {/* Logo / wordmark */}
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="w-12 h-12 rounded-2xl bg-cursi-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold tracking-tight">C</span>
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Cursi</h1>
          <p className="text-xs text-white/40">AI for your entire desktop</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3 no-drag">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoFocus
            className="
              w-full rounded-xl bg-white/8 border border-white/10
              px-3.5 py-2.5 text-sm text-white placeholder-white/30
              focus:outline-none focus:ring-1 focus:ring-cursi-500/60
              transition-all duration-150
            "
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="
              w-full rounded-xl bg-white/8 border border-white/10
              px-3.5 py-2.5 text-sm text-white placeholder-white/30
              focus:outline-none focus:ring-1 focus:ring-cursi-500/60
              transition-all duration-150
            "
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          {info && (
            <p className="text-xs text-green-400 text-center">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              w-full rounded-xl bg-cursi-500 hover:bg-cursi-400
              disabled:opacity-50 disabled:cursor-not-allowed
              py-2.5 text-sm font-semibold text-white
              transition-colors duration-150
              flex items-center justify-center gap-2
            "
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {/* Mode toggle */}
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
          className="no-drag text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
