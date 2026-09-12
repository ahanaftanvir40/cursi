import React, { useState, useEffect } from 'react';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { ContextBadge } from '../components/ContextBadge';
import { useChat } from '../hooks/useChat';
import type { AIContext } from '@cursi/shared';

interface ChatPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

export function ChatPage({ onNavigate }: ChatPageProps): React.ReactElement {
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, context, sendMessage, setContext, reset } = useChat();

  // Listen for shortcut trigger — context arrives from main process
  useEffect(() => {
    const cleanup = window.desktop.onShortcutTriggered((ctx: AIContext) => {
      if (ctx.type !== 'none') {
        setContext(ctx);
      }
    });
    return cleanup;
  }, [setContext]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    void sendMessage(trimmed, context ?? undefined);
    // Clear context after first message (it's consumed)
    setContext(null);
  };

  return (
    <div className="flex flex-col h-screen bg-black/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-panel">
      {/* Title bar / drag region */}
      <div className="drag-region flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80 tracking-tight">Cursi</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => onNavigate('/settings')}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
            aria-label="Settings"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z" />
            </svg>
          </button>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="New conversation"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden>
                <path d="M8 2a.75.75 0 0 1 .75.75V7.25h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5H2.75a.75.75 0 0 1 0-1.5h4.5V2.75A.75.75 0 0 1 8 2Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Context badge */}
      {context && context.type !== 'none' && (
        <div className="pt-2">
          <ContextBadge context={context} onDismiss={() => setContext(null)} />
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
      />
    </div>
  );
}
