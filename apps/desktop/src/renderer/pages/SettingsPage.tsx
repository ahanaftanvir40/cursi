import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_SHORTCUT } from '@cursi/shared';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Theme } from '../stores/settingsStore';
import { usePanelResize } from '../hooks/usePanelResize';

interface SettingsPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

const THEMES: { id: Theme; label: string; desc: string; accent: string }[] = [
  {
    id: 'stealth',
    label: 'Stealth',
    desc: 'Pure black, no distractions',
    accent: '#8b5cf6',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    desc: 'Dark with emerald accents',
    accent: '#34d399',
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative mt-0.5 rounded-full shrink-0 transition-colors duration-200 focus:outline-none"
      style={{
        height: 18,
        width: 32,
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
      }}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-3.5' : 'translate-x-0'}`}
        style={{ width: 14, height: 14 }}
      />
    </button>
  );
}

export function SettingsPage({ onNavigate }: SettingsPageProps): React.ReactElement {
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [launchAtLogin, setLaunchAtLoginState] = useState(false);
  const { user, signOut } = useAuthStore();
  const { freshSessionOnInvoke, setFreshSessionOnInvoke, theme, setTheme } = useSettingsStore();
  const rootRef = useRef<HTMLDivElement>(null);
  usePanelResize(rootRef);

  useEffect(() => {
    window.desktop?.getLaunchAtLogin().then(setLaunchAtLoginState).catch(() => {});
  }, []);

  const handleLaunchAtLogin = (v: boolean) => {
    setLaunchAtLoginState(v);
    window.desktop?.setLaunchAtLogin(v).catch(() => {});
  };

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
      className="cursi-panel flex flex-col rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div
        className="drag-region flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border)' }}
      >
        <button
          onClick={() => onNavigate('/chat')}
          className="no-drag w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-all text-sm"
          aria-label="Back"
        >
          ←
        </button>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</span>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* Theme */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Theme
          </h2>
          <div className="flex gap-2">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="flex-1 flex flex-col items-start gap-1.5 rounded-xl px-3 py-2.5 transition-all duration-150"
                  style={{
                    background: active ? `${t.accent}18` : 'var(--input-bg)',
                    border: `1px solid ${active ? t.accent + '55' : 'var(--border)'}`,
                  }}
                >
                  {/* Colour dot */}
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: t.accent, boxShadow: active ? `0 0 6px ${t.accent}99` : 'none' }}
                  />
                  <span className="text-[12px] font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {t.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Shortcut */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Global Shortcut
          </h2>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-1"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                caretColor: 'var(--accent)',
              }}
            />
            <button
              onClick={handleSaveShortcut}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-[13px] font-medium text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {status === 'success' && (
            <p className="mt-1.5 text-[11px] text-green-400">Shortcut updated ✓</p>
          )}
          {status === 'error' && (
            <p className="mt-1.5 text-[11px] text-red-400">
              Could not register — it may be taken by another app.
            </p>
          )}
          <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Electron accelerator format, e.g. <code className="font-mono">CommandOrControl+Shift+Space</code>
          </p>
        </section>

        {/* System */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            System
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <Toggle checked={launchAtLogin} onChange={handleLaunchAtLogin} />
            <div>
              <p className="text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>Launch at login</p>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Automatically start Cursi when you log in.
              </p>
            </div>
          </label>
        </section>

        {/* Session */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Session
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <Toggle checked={freshSessionOnInvoke} onChange={setFreshSessionOnInvoke} />
            <div>
              <p className="text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>Fresh session on every invoke</p>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Always start a new chat when the shortcut is pressed.
              </p>
            </div>
          </label>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Account
          </h2>
          {user && (
            <p className="text-[11px] mb-3 truncate" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
          )}
          <button
            onClick={() => void signOut()}
            className="px-3 py-2 rounded-xl text-[13px] transition-all"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
