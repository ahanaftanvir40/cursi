// ─── Core domain types ────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: string | undefined;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

// ─── Context engine types ──────────────────────────────────────────────────────

export type ContextType = 'selected_text' | 'clipboard' | 'screenshot' | 'none';

export interface ActiveApplication {
  name: string;
  bundleId: string;
}

export interface AIContext {
  type: ContextType;
  selectedText?: string;
  clipboardText?: string;
  activeApplication?: ActiveApplication;
  currentUrl?: string;
  /** Base64-encoded PNG — populated only in V2 */
  screenshot?: string;
  accessibilityData?: unknown;
}

// ─── LLM abstraction types ─────────────────────────────────────────────────────

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  chat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<string>;
  streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<string>;
}

// ─── API types ─────────────────────────────────────────────────────────────────

export interface ChatRequest {
  conversationId?: string;
  message: string;
  context?: AIContext;
}

export interface ChatChunk {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}
