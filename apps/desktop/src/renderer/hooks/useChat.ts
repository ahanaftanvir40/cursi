import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { AIContext } from '@cursi/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function useChat() {
  const store = useChatStore();
  const { session } = useAuthStore();

  const sendMessage = useCallback(
    async (message: string, context?: AIContext) => {
      if (store.isStreaming) return;

      store.setError(null);
      store.setStreaming(true);

      // Snapshot active context for inline display in the thread (UI only)
      const snapshotCtx = context ?? store.context;
      const contextSnapshot = snapshotCtx?.type === 'clipboard'
        ? snapshotCtx.clipboardText
        : undefined;
      store.addUserMessage(message, contextSnapshot);
      const assistantId = store.startAssistantMessage();

      try {
        // Only send context on the first message of a new conversation.
        // On follow-ups the backend loads history from DB which already has the context framing.
        const isFirstMessage = !store.conversationId;
        const activeContext = isFirstMessage ? (context ?? store.context ?? undefined) : undefined;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${API_URL}/v1/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            conversationId: store.conversationId ?? undefined,
            context: activeContext,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? `HTTP ${response.status}`);
        }

        const data = await response.json() as {
          reply: string;
          conversationId: string;
          userMessageId: string;
          messageId: string;
        };

        // Set conversationId so follow-up messages continue the same thread
        if (data.conversationId && !store.conversationId) {
          store.setConversationId(data.conversationId);
        }

        store.appendToLastMessage(data.reply);
        store.finalizeLastMessage(assistantId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        store.setError(msg);
        store.finalizeLastMessage(assistantId);
      } finally {
        store.setStreaming(false);
      }
    },
    [store, session],
  );

  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    error: store.error,
    initialContext: store.initialContext,
    context: store.context,
    sendMessage,
    setInitialContext: store.setInitialContext,
    setContext: store.setContext,
    reset: store.reset,
  };
}
