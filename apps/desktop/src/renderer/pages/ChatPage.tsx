import React, { useState, useEffect, useRef } from 'react';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { ContextBadge } from '../components/ContextBadge';
import { useChat } from '../hooks/useChat';
import { usePanelResize } from '../hooks/usePanelResize';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { AIContext } from '@cursi/shared';

interface ChatPageProps {
  onNavigate: (route: '/chat' | '/settings') => void;
}

interface Suggestion {
  label: string;
  prompt: string;
  /** If true, immediately submits instead of just filling the input */
  autoSubmit: boolean;
}

const SUGGESTIONS: Suggestion[] = [
  {
    label: 'Summarise',
    prompt: 'Summarise this.',
    autoSubmit: true,
  },
  {
    label: 'Fix grammar',
    prompt: 'Fix the grammar in this.',
    autoSubmit: true,
  },
  {
    label: 'Explain simply',
    prompt: 'Explain this in simple terms.',
    autoSubmit: true,
  },
  {
    label: 'Translate',
    prompt: 'Translate this to English.',
    autoSubmit: false, // user may want to change the target language
  },
  {
    label: 'Write reply',
    prompt: 'Write a short reply to this message in a natural, human tone. Rules: no em dashes (—), no bullet points, no greetings like "Hi" or "Hey", no sign-offs. Write it as a single block of plain conversational text, like a real person typing in Slack. Output only the reply text, nothing else.',
    autoSubmit: true,
  },
  {
    label: 'Make professional',
    prompt: 'Rewrite the following as a short, professional Slack message. Rules: no em dashes (—), no bullet points, no "Dear" or email-style greetings, no sign-offs or signatures. Keep it concise, direct, and human — like a message from a confident professional, not a formal email. Output only the rewritten message text, nothing else.',
    autoSubmit: true,
  },
];

export function ChatPage({ onNavigate }: ChatPageProps): React.ReactElement {
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, initialContext, context, sendMessage, setInitialContext, setContext, reset } = useChat();
  const { freshSessionOnInvoke } = useSettingsStore();
  // Ref so cursi:submit event handler always sees the latest input + context
  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the latest context so the shortcut handler never captures a stale closure
  const contextRef = useRef(context);
  useEffect(() => { contextRef.current = context; }, [context]);

  // Keep refs to stable callbacks so the listener is registered only once
  const resetRef = useRef(reset);
  const setContextRef = useRef(setContext);
  const setInitialContextRef = useRef(setInitialContext);
  const freshSessionRef = useRef(freshSessionOnInvoke);
  useEffect(() => { resetRef.current = reset; }, [reset]);
  useEffect(() => { setContextRef.current = setContext; }, [setContext]);
  useEffect(() => { setInitialContextRef.current = setInitialContext; }, [setInitialContext]);
  useEffect(() => { freshSessionRef.current = freshSessionOnInvoke; }, [freshSessionOnInvoke]);

  // Resize the BrowserWindow to fit content
  usePanelResize(rootRef);

  // Stable ref to the submit action so cursi:submit handler doesn't need re-registration
  const handleSubmitRef = useRef<() => void>(() => { /* no-op until wired */ });

  // Register shortcut listener ONCE — reads latest values via refs
  useEffect(() => {
    if (!window.desktop?.onShortcutTriggered) return;
    const cleanup = window.desktop.onShortcutTriggered((ctx: AIContext) => {
      const currentText = contextRef.current?.type === 'clipboard'
        ? contextRef.current.clipboardText
        : null;
      const incomingText = ctx.type === 'clipboard' ? ctx.clipboardText : null;

      const msgCount = useChatStore.getState().messages.length;
      console.log('[ChatPage] shortcut fired', {
        incomingType: ctx.type,
        incomingText: incomingText?.slice(0, 40),
        currentText: currentText?.slice(0, 40),
        willReset: !!(incomingText && incomingText !== currentText),
        currentMsgCount: msgCount,
      });

      if (ctx.type === 'none') return;

      // If "fresh session on every invoke" is enabled → always reset
      if (freshSessionRef.current) {
        console.log('[ChatPage] freshSessionOnInvoke=true → resetting');
        resetRef.current();
        setInitialContextRef.current(ctx);
        setContextRef.current(ctx);
        return;
      }

      const hasInitial = !!useChatStore.getState().initialContext;
      if (incomingText && incomingText !== currentText) {
        if (!hasInitial) {
          // Very first context this session → pin it at the top AND set as current
          console.log('[ChatPage] FIRST context → set initial + current');
          setInitialContextRef.current(ctx);
          setContextRef.current(ctx);
        } else {
          // New clipboard while session active → update current context only (keep initial pinned)
          console.log('[ChatPage] NEW context → updating current only, keeping session, msgs:', msgCount);
          setContextRef.current(ctx);
        }
      } else {
        console.log('[ChatPage] SAME context → keeping session, msgs:', msgCount);
      }
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — intentional, refs keep values current

  const handleSubmit = () => {
    const trimmed = inputRef.current.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    void sendMessage(trimmed, context ?? undefined);
    // After sending, clear the "new context" badge — it's now part of the thread
    // (initialContext stays pinned at top for session reference)
    if (hasNewContext) setContext(initialContext);
  };
  // Keep ref current so auto-submit suggestions can call it without stale closure
  handleSubmitRef.current = handleSubmit;

  // Wire cursi:submit once — always calls the latest handleSubmit via ref
  useEffect(() => {
    const handler = () => handleSubmitRef.current();
    window.addEventListener('cursi:submit', handler);
    return () => window.removeEventListener('cursi:submit', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasInitialContext = !!initialContext && initialContext.type !== 'none';
  const hasContext = !!context && context.type !== 'none';
  // Show "current context" above input only when it differs from the initial one
  const initialText = initialContext?.type === 'clipboard' ? initialContext.clipboardText : null;
  const currentText2 = context?.type === 'clipboard' ? context.clipboardText : null;
  const hasNewContext = hasContext && currentText2 !== initialText;
  const hasMessages = messages.length > 0;

  return (
    <div
      ref={rootRef}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'rgba(22, 22, 26, 0.97)', boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08)' }}
    >
      {/* ── Top bar: always visible ── */}
      <div className="drag-region flex items-center justify-between px-3 shrink-0" style={{ height: 28 }}>
        {/* Left: initial context pinned here, or app name when empty */}
        {hasInitialContext && initialContext ? (
          <ContextBadge context={initialContext} onDismiss={() => { setInitialContext(null); setContext(null); }} inline />
        ) : (
          <span className="text-[10px] font-medium text-white/25 tracking-wide select-none uppercase">Cursi</span>
        )}
        {/* Right: actions */}
        <div className="flex items-center gap-0.5 no-drag">
          {(hasMessages || hasInitialContext) && (
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
      {/* Separator only when there's content below the header */}
      {(hasInitialContext || hasMessages) && <div className="h-px bg-white/5 shrink-0" />}

      {/* Messages — scrollable area */}
      {hasMessages && (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      {/* Error */}
      {error && (
        <p className="px-3 pt-2 text-[11px] text-red-400/70">{error}</p>
      )}

      {/* Suggestions — only when initial context set and no messages yet */}
      {hasInitialContext && !hasMessages && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setInput(s.prompt);
                // Auto-submit for one-shot actions
                if (s.autoSubmit) {
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('cursi:submit'));
                  }, 30);
                } else {
                  window.dispatchEvent(new CustomEvent('cursi:suggestion', { detail: s.prompt }));
                }
              }}
              className="px-2 py-0.5 rounded-full text-[11px] text-white/40 border border-white/10 hover:border-cursi-500/50 hover:text-white/70 hover:bg-cursi-500/8 transition-all duration-100"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom dock ── */}
      {(hasInitialContext || hasMessages) && <div className="h-px bg-white/5 shrink-0" />}

      {/* Active context badge — shown above input when clipboard changed mid-session */}
      {hasNewContext && context && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cursi-500/8 border-t border-cursi-500/15 shrink-0">
          <span className="text-[9px] font-semibold text-cursi-400/60 uppercase tracking-wider shrink-0">Using</span>
          <span className="flex-1 min-w-0 text-[11px] text-white/55 truncate font-mono">
            {(context.clipboardText ?? '').length > 50
              ? (context.clipboardText ?? '').slice(0, 50) + '…'
              : (context.clipboardText ?? '')}
          </span>
          <button
            onClick={() => setContext(initialContext)}
            className="no-drag text-white/20 hover:text-white/50 transition-colors text-[10px] leading-none shrink-0"
            aria-label="Clear new context"
          >
            ✕
          </button>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
        hasContext={hasInitialContext || hasNewContext}
      />
    </div>
  );
}
