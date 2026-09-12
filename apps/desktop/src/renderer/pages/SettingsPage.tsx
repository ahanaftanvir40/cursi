import React, { useState } from 'react';
import { DEFAULT_SHORTCUT } from '@cursi/shared';

interface SettingsPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps): React.ReactElement {
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveShortcut = async () => {
    setSaving(true);
    setStatus('idle');
    const result = await window.desktop.updateShortcut(shortcut);
    setSaving(false);
    setStatus(result.success ? 'success' : 'error');
  };

  return (
    <div className="flex flex-col h-screen bg-black/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-panel">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
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
                flex-1 rounded-xl bg-white/8 border border-white/10
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

        {/* About */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            About
          </h2>
          <p className="text-xs text-white/40">Cursi — AI for your entire desktop.</p>
        </section>
      </div>
    </div>
  );
}
