import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;

  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

/**
 * Parse a cursi://auth/callback URL and extract the Supabase session tokens.
 * Supabase puts tokens in the hash fragment: #access_token=...&refresh_token=...
 */
async function handleDeepLinkUrl(url: string): Promise<void> {
  try {
    console.log('[authStore] Handling deep link:', url);

    // Extract the hash fragment from cursi://auth/callback#access_token=...
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      console.warn('[authStore] Deep link has no hash fragment:', url);
      return;
    }

    const hash = url.slice(hashIndex + 1);
    const params = new URLSearchParams(hash);

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      // Set the session directly — Supabase will persist it and fire onAuthStateChange
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error('[authStore] Failed to set session from deep link:', error.message);
      } else {
        console.log('[authStore] Session set successfully from deep link');
      }
    } else {
      // Could be a PKCE flow — let Supabase handle it via the full URL
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) {
        console.error('[authStore] exchangeCodeForSession failed:', error.message);
      }
    }
  } catch (err) {
    console.error('[authStore] Deep link handling error:', err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  initialize: async () => {
    // Hydrate from persisted session
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
      initialized: true,
    });

    // Listen for auth state changes (login, logout, token refresh, magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[authStore] Auth state changed:', _event, !!session);
      set({ session, user: session?.user ?? null, loading: false });
    });

    // Listen for deep links from the main process (magic link callback)
    let deepLinkCleanup: (() => void) | undefined;
    if (window.desktop?.onDeepLink) {
      deepLinkCleanup = window.desktop.onDeepLink((url: string) => {
        void handleDeepLinkUrl(url);
      });
    }

    return () => {
      subscription.unsubscribe();
      deepLinkCleanup?.();
    };
  },
}));
