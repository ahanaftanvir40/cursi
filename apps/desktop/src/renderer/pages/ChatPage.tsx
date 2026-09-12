import React, { useState, useEffect, useRef } from 'react';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { ContextBadge } from '../components/ContextBadge';
import { useChat } from '../hooks/useChat';
import { usePanelResize } from '../hooks/usePanelResize';
import type { AIContext } from '@cursi/shared';

interface ChatPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

export function ChatPage({ onNavigate }: ChatPageProps): React.ReactElement {
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, context, sendMessage, setContext, reset } = useChat();
  const rootRef = useRef<HTMLDivElement>(null);

  // Resize the BrowserWindow to fit content
  usePanelResize(rootRef);

  // Shortcut trigger: only reset when NEW context arrives (different clipboard)
  // Re-opening with no context = resume previous session
  useEffect(() => {
    if (!window.desktop?.onShortcutTriggered) return;
    const cleanup = window.desktop.onShortcutTriggered((ctx: AIContext) => {
      if (ctx.type !== 'none') {
        // New context → fresh session
        reset();
        setContext(ctx);
      }
      // No context → just re-show, keep existing session
    });
    return cleanup;
  }, [reset, setContext]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    void sendMessage(trimmed, context ?? undefined);
    setContext(null);
  };

  const hasContext = !!context && context.type !== 'none';
  const hasMessages = messages.length > 0;

  return (
    <div
      ref={rootRef}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'rgba(22, 22, 26, 0.97)', boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08)' }}
    >
      {/* Title bar — 28px drag region, only shown when there's content */}
      {(hasContext || hasMessages) && (
        <>
          <div className="drag-region flex items-center justify-between px-3 shrink-0" style={{ height: 28 }}>
            <span className="text-[10px] font-medium text-white/25 tracking-wide select-none uppercase">Cursi</span>
            <div className="flex items-center gap-0.5 no-drag">
              {hasMessages && (
                <button
                  onClick={reset}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/55 hover:bg-white/6 transition-all"
                  title="New chat"
                >
                  <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                    <path d="M5 1v8M1 5h8"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => onNavigate('/settings')}
                className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/55 hover:bg-white/6 transition-all"
                title="Settings"
              >
                <svg viewBox="0 0 10 10" className="w-2 h-2 fill-current" aria-hidden>
                  <path d="M5 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-4 2.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="h-px bg-white/5 shrink-0" />
        </>
      )}

      {/* Context strip */}
      {hasContext && (
        <ContextBadge context={context} onDismiss={() => setContext(null)} />
      )}

      {/* Messages — only rendered when there are messages */}
      {hasMessages && (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      {/* Suggestions — shown when context loaded but no messages yet */}
      {hasContext && !hasMessages && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {['Summarise', 'Fix grammar', 'Explain simply', 'Translate'].map((s) => (
            <button
              key={s}
              onClick={() => window.dispatchEvent(new CustomEvent('cursi:suggestion', { detail: s }))}
              className="px-2 py-0.5 rounded-full text-[11px] text-white/40 border border-white/10 hover:border-cursi-500/50 hover:text-white/70 hover:bg-cursi-500/8 transition-all duration-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="px-3 pb-1 text-[11px] text-red-400/70">{error}</p>
      )}

      {/* Input — always visible, no separator when it's the only thing */}
      {(hasContext || hasMessages) && <div className="h-px bg-white/5 shrink-0" />}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
        hasContext={hasContext}
      />
    </div>
  );
}
