import { create } from 'zustand';
import type { AIContext } from '@cursi/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  context: AIContext | null;
  isStreaming: boolean;
  error: string | null;

  setContext: (ctx: AIContext | null) => void;
  addUserMessage: (content: string) => string;
  startAssistantMessage: () => string;
  appendToLastMessage: (delta: string) => void;
  finalizeLastMessage: (id: string) => void;
  setConversationId: (id: string) => void;
  setStreaming: (v: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversationId: null,
  context: null,
  isStreaming: false,
  error: null,

  setContext: (ctx) => set({ context: ctx }),

  addUserMessage: (content) => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { id, role: 'user', content }],
    }));
    return id;
  },

  startAssistantMessage: () => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { id, role: 'assistant', content: '', streaming: true }],
    }));
    return id;
  },

  appendToLastMessage: (delta) => {
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta };
      }
      return { messages: msgs };
    });
  },

  finalizeLastMessage: (id) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, streaming: false } : m,
      ),
    }));
  },

  setConversationId: (id) => set({ conversationId: id }),
  setStreaming: (v) => set({ isStreaming: v }),
  setError: (err) => set({ error: err }),

  reset: () =>
    set({ messages: [], conversationId: null, context: null, isStreaming: false, error: null }),
}));
