import React, { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { usePanelResize } from '../hooks/usePanelResize';
import cursiIcon from '../assets/cursi-icon.png';

type AuthMode = 'signin' | 'signup';

export function LoginPage(): React.ReactElement {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  usePanelResize(rootRef);

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
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(18, 18, 20, 0.98)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.07)',
      }}
    >
      {/* Drag region */}
      <div className="drag-region h-6 shrink-0" />

      {/* Logo section */}
      <div className="flex flex-col items-center gap-2 px-6 pt-2 pb-6 select-none">
        <img
          src={cursiIcon}
          alt="Cursi"
          className="w-16 h-16 rounded-2xl"
          draggable={false}
        />
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-[17px] font-semibold text-white tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-[12px] text-white/35">
            {mode === 'signin' ? 'Sign in to continue to Cursi' : 'Start using Cursi for free'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-5 no-drag">

        <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoFocus
            className="px-3.5 py-2.5 text-[13px] bg-transparent text-white placeholder-white/30 focus:outline-none border-b"
            style={{ borderColor: 'rgba(255,255,255,0.08)', caretColor: '#8b5cf6' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="px-3.5 py-2.5 text-[13px] bg-transparent text-white placeholder-white/30 focus:outline-none"
            style={{ caretColor: '#8b5cf6' }}
          />
        </div>

        {error && (
          <p className="text-[11px] text-red-400/80 text-center px-1 leading-snug">{error}</p>
        )}
        {info && (
          <p className="text-[11px] text-emerald-400/80 text-center px-1 leading-snug">{info}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2 mt-0.5"
          style={{ background: loading ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,1)', boxShadow: '0 2px 12px rgba(139,92,246,0.35)' }}
        >
          {loading
            ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
            : mode === 'signin' ? 'Sign in' : 'Create account'
          }
        </button>
      </form>

      {/* Divider + toggle */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-5">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
          className="no-drag text-[11px] text-white/25 hover:text-white/55 transition-colors shrink-0"
        >
          {mode === 'signin' ? 'New to Cursi? Sign up' : 'Already have an account? Sign in'}
        </button>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}
