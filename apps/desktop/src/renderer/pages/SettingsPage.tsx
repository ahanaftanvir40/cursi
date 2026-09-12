import React, { useRef, useState } from 'react';
import { DEFAULT_SHORTCUT } from '@cursi/shared';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { usePanelResize } from '../hooks/usePanelResize';

interface SettingsPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps): React.ReactElement {
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { user, signOut } = useAuthStore();
  const { freshSessionOnInvoke, setFreshSessionOnInvoke } = useSettingsStore();
  const rootRef = useRef<HTMLDivElement>(null);
  usePanelResize(rootRef);

  const handleSaveShortcut = async () => {
    if (!window.desktop) return;
    setSaving(true);
    setStatus('idle');
    const result = await window.desktop.updateShortcut(shortcut);
    setSaving(false);
    setStatus(result.success ? 'success' : 'error');
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'rgba(22, 22, 26, 0.97)', boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="drag-region flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button
          onClick={() => onNavigate('/chat')}
          className="no-drag p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          aria-label="Back"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-white/80">Settings</span>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Shortcut */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Global Shortcut
          </h2>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              className="
                flex-1 rounded-xl bg-neutral-800 border border-white/10
                px-3 py-2 text-sm text-white placeholder-white/30
                focus:outline-none focus:ring-1 focus:ring-cursi-500/60
              "
            />
            <button
              onClick={handleSaveShortcut}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-cursi-500 hover:bg-cursi-400 disabled:opacity-50 text-sm text-white font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {status === 'success' && (
            <p className="mt-1.5 text-xs text-green-400">Shortcut updated ✓</p>
          )}
          {status === 'error' && (
            <p className="mt-1.5 text-xs text-red-400">
              Could not register that shortcut — it may be taken by another app.
            </p>
          )}
          <p className="mt-2 text-xs text-white/30">
            Use Electron accelerator format, e.g. <code className="font-mono">CommandOrControl+Shift+Space</code>
          </p>
        </section>

        {/* Session behaviour */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Session
          </h2>
          <label className="flex items-start gap-3 cursor-pointer group">
            {/* Toggle switch */}
            <button
              role="switch"
              aria-checked={freshSessionOnInvoke}
              onClick={() => setFreshSessionOnInvoke(!freshSessionOnInvoke)}
              className={`
                relative mt-0.5 w-8 h-4.5 rounded-full shrink-0 transition-colors duration-200 focus:outline-none
                ${freshSessionOnInvoke ? 'bg-cursi-500' : 'bg-white/15'}
              `}
              style={{ height: 18, width: 32 }}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm
                  transition-transform duration-200
                  ${freshSessionOnInvoke ? 'translate-x-3.5' : 'translate-x-0'}
                `}
                style={{ width: 14, height: 14 }}
              />
            </button>
            <div>
              <p className="text-sm text-white/70 leading-snug">Fresh session on every invoke</p>
              <p className="text-xs text-white/35 mt-0.5 leading-snug">
                When on, pressing the shortcut always starts a new chat. When off, your previous conversation is resumed.
              </p>
            </div>
          </label>
        </section>

        {/* About */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            About
          </h2>
          <p className="text-xs text-white/40">Cursi - AI for your entire desktop.</p>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Account
          </h2>
          {user && (
            <p className="text-xs text-white/40 mb-3 truncate">{user.email}</p>
          )}
          <button
            onClick={() => void signOut()}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-sm text-white/60 hover:text-red-400 transition-all"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
