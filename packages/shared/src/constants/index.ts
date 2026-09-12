// ─── Global shortcut ──────────────────────────────────────────────────────────

export const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+Space';

// ─── API ──────────────────────────────────────────────────────────────────────

export const API_VERSION = 'v1';

export const API_ROUTES = {
  chat: `/${API_VERSION}/chat`,
  conversations: `/${API_VERSION}/conversations`,
  conversationById: (id: string) => `/${API_VERSION}/conversations/${id}`,
  usersMe: `/${API_VERSION}/users/me`,
} as const;

// ─── Window ───────────────────────────────────────────────────────────────────

export const AI_PANEL = {
  width: 400,
  height: 52,      // starts as input-bar only; grows dynamically
  minWidth: 400,
  minHeight: 52,
  maxHeight: 380,  // never taller than this
} as const;

// ─── LLM defaults ─────────────────────────────────────────────────────────────

export const LLM_DEFAULTS = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
} as const;

// ─── IPC channels ─────────────────────────────────────────────────────────────

export const IPC = {
  SHORTCUT_TRIGGERED: 'shortcut:triggered',
  HIDE_WINDOW: 'window:hide',
  SHOW_WINDOW: 'window:show',
  GET_CONTEXT: 'context:get',
  CONTEXT_RESULT: 'context:result',
  UPDATE_SHORTCUT: 'shortcut:update',
  RESIZE_PANEL: 'panel:resize',
} as const;
