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
  width: 680,
  height: 520,
  minWidth: 480,
  minHeight: 360,
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
} as const;
