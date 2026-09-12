/// <reference types="vite/client" />

import type { DesktopApi } from '../preload/index';

declare global {
  interface Window {
    desktop: DesktopApi;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
