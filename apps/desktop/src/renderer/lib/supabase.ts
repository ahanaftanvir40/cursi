import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Cursi] Missing Supabase env vars. Make sure apps/desktop/.env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    { supabaseUrl, supabaseAnonKey },
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // Persist session in localStorage so login survives window toggles
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseClient = typeof supabase;
