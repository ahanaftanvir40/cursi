import React, { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { usePanelResize } from '../hooks/usePanelResize';
import cursiIcon from '../assets/cursi-icon.png';

type Step = 'enter-email' | 'check-email';

export function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('enter-email');
  const rootRef = useRef<HTMLDivElement>(null);
  usePanelResize(rootRef);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Redirect back into the app via the custom protocol
          emailRedirectTo: 'cursi://auth/callback',
          // Creates the account if it doesn't exist
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStep('check-email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: 'cursi://auth/callback', shouldCreateUser: true },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="cursi-panel flex flex-col rounded-2xl overflow-hidden"
    >
      {/* Drag region */}
      <div className="drag-region h-6 shrink-0" />

      {/* Logo */}
      <div className="flex flex-col items-center gap-2 px-6 pt-2 pb-5 select-none">
        <img
          src={cursiIcon}
          alt="Cursi"
          className="w-14 h-14 rounded-2xl"
          draggable={false}
        />
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {step === 'enter-email' ? 'Sign in to Cursi' : 'Check your email'}
          </h1>
          <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
            {step === 'enter-email'
              ? 'Enter your email — we\'ll send a magic link'
              : `We sent a link to ${email}`}
          </p>
        </div>
      </div>

      <div className="h-px mx-5 shrink-0" style={{ background: 'var(--border)' }} />

      {step === 'enter-email' ? (
        /* ── Email input step ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pt-4 pb-5 no-drag">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              caretColor: 'var(--accent)',
            }}
          />

          {error && (
            <p className="text-[11px] text-red-400/80 text-center leading-snug">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: loading || !email.trim() ? 'rgba(139,92,246,0.5)' : 'var(--accent)',
              boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
              cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              : (
                <>
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden>
                    <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5l-6 3.75L2 4.5V4zm0 1.5V12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5l-6 3.75L2 5.5z"/>
                  </svg>
                  Send magic link
                </>
              )
            }
          </button>

          <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No password needed. Works for new &amp; existing accounts.
          </p>
        </form>
      ) : (
        /* ── Check email step ── */
        <div className="flex flex-col items-center gap-4 px-5 pt-5 pb-6 no-drag">
          {/* Animated envelope */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              Click the link in your email to sign in.
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              The link opens Cursi automatically. Check spam if you don't see it.
            </p>
          </div>

          {error && (
            <p className="text-[11px] text-red-400/80 text-center leading-snug">{error}</p>
          )}

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full rounded-xl py-2 text-[12px] font-medium transition-all flex items-center justify-center"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {loading
                ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : 'Resend link'
              }
            </button>

            <button
              onClick={() => { setStep('enter-email'); setError(null); }}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Use a different email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
