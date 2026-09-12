import { create } from 'zustand';

const STORAGE_KEY = 'cursi:settings';

interface PersistedSettings {
  freshSessionOnInvoke: boolean;
}

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedSettings;
  } catch {
    // ignore
  }
  return { freshSessionOnInvoke: false };
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
}

const initial = load();

export const useSettingsStore = create<SettingsState>((set) => ({
  freshSessionOnInvoke: initial.freshSessionOnInvoke,

  setFreshSessionOnInvoke: (v) => {
    set({ freshSessionOnInvoke: v });
    save({ freshSessionOnInvoke: v });
  },
}));
