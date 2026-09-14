import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { AIContext } from '@cursi/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Log on module load so we can see this in the very first renderer console output
console.log('[useChat] API_URL =', API_URL, '| VITE_API_URL env =', import.meta.env.VITE_API_URL ?? '(not set)');

/** Stringify any unknown error into a human-readable message with full detail */
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  const parts: string[] = [err.message];

  // fetch() wraps the real network error in err.cause
  if (err.cause instanceof Error) {
    parts.push(`Cause: ${err.cause.message}`);
    if (err.cause.cause instanceof Error) {
      parts.push(`Root: ${err.cause.cause.message}`);
    }
  } else if (err.cause !== undefined) {
    parts.push(`Cause: ${String(err.cause)}`);
  }

  // Chromium sets err.name to things like "TypeError" but also exposes
  // net::ERR_* codes on the underlying DOMException in some versions
  if (err.name && err.name !== 'Error') {
    parts.unshift(`[${err.name}]`);
  }

  return parts.join(' — ');
}

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

        console.log(`[useChat] POST ${API_URL}/v1/chat`, {
          platform: navigator.platform,
          hasAuth: !!session?.access_token,
          isFirstMessage,
        });

        const response = await fetch(`${API_URL}/v1/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            conversationId: store.conversationId ?? undefined,
            context: activeContext,
          }),
        });

        console.log(`[useChat] Response: HTTP ${response.status}`);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(errBody.error ?? `HTTP ${response.status}`);
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
      } catch (err: unknown) {
        // Log the full error object — Electron forwards renderer console to main process terminal
        console.error('[useChat] fetch failed:', err);
        console.error('[useChat] err.cause:', (err as { cause?: unknown }).cause);
        console.error('[useChat] full error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)));

        const msg = describeError(err);
        console.error('[useChat] displayed error:', msg);
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
