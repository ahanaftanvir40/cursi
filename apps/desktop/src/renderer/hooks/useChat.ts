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
      store.addUserMessage(message);
      const assistantId = store.startAssistantMessage();

      try {
        const body = JSON.stringify({
          message,
          conversationId: store.conversationId ?? undefined,
          context: context ?? store.context ?? undefined,
        });

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${API_URL}/v1/chat`, {
          method: 'POST',
          headers,
          body,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          // Parse SSE lines: "data: {...}\n\n"
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              continue;
            }

            const type = event['type'];
            if (type === 'delta') {
              store.appendToLastMessage(event['delta'] as string);
            } else if (type === 'done') {
              if (event['conversationId'] && !store.conversationId) {
                store.setConversationId(event['conversationId'] as string);
              }
              store.finalizeLastMessage(assistantId);
            } else if (type === 'error') {
              throw new Error(event['error'] as string ?? 'Streaming error');
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        store.setError(msg);
        store.finalizeLastMessage(assistantId);
      } finally {
        store.setStreaming(false);
      }
    },
    [store],
  );

  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    error: store.error,
    context: store.context,
    sendMessage,
    setContext: store.setContext,
    reset: store.reset,
  };
}
