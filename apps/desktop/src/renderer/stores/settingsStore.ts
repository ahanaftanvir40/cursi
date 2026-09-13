import { create } from 'zustand';

const STORAGE_KEY = 'cursi:settings';

export type Theme = 'stealth' | 'aurora';

interface PersistedSettings {
  freshSessionOnInvoke: boolean;
  theme: Theme;
}

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedSettings;
  } catch {
    // ignore
  }
  return { freshSessionOnInvoke: false, theme: 'stealth' };
}

function save(s: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface SettingsState extends PersistedSettings {
  setFreshSessionOnInvoke: (v: boolean) => void;
  setTheme: (t: Theme) => void;
}

const initial = load();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  freshSessionOnInvoke: initial.freshSessionOnInvoke,
  theme: initial.theme,

  setFreshSessionOnInvoke: (v) => {
    set({ freshSessionOnInvoke: v });
    save({ freshSessionOnInvoke: v, theme: get().theme });
  },
  setTheme: (t) => {
    set({ theme: t });
    save({ freshSessionOnInvoke: get().freshSessionOnInvoke, theme: t });
  },
}));
