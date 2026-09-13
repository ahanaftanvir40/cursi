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
  const [contextExpanded, setContextExpanded] = useState(false);
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
      className="cursi-panel flex flex-col rounded-xl overflow-hidden"
    >
      {/* ── Top bar: always visible ── */}
      <div className="drag-region flex items-center justify-between px-3 shrink-0" style={{ height: 28 }}>
        {/* Left: always show app name */}
        <span
          className="text-[11px] font-semibold select-none uppercase"
          style={{ color: 'var(--accent)', letterSpacing: '0.15em', opacity: 0.85 }}
        >Cursi</span>
        {/* Right: actions */}
        <div className="flex items-center gap-0.5 no-drag">
          {(hasMessages || hasInitialContext) && (
            <button
              onClick={reset}
              className="w-5 h-5 flex items-center justify-center rounded transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="New chat"
            >
              <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M5 1v8M1 5h8"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => onNavigate('/settings')}
            className="w-5 h-5 flex items-center justify-center rounded transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Settings"
          >
            <svg viewBox="0 0 10 10" className="w-2 h-2 fill-current" aria-hidden>
              <path d="M5 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-4 2.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Context row: shown below header when context is active ── */}
      {hasInitialContext && initialContext && (() => {
        const ctxText = initialContext.clipboardText ?? initialContext.selectedText ?? '';
        const isLong = ctxText.length > 55;
        return (
          <div
            className="shrink-0 cursor-pointer select-none"
            style={{ borderTop: '0.5px solid var(--border)' }}
            onClick={() => isLong && setContextExpanded((v) => !v)}
          >
            <div className="flex items-start gap-2 px-3 py-1.5">
              {/* Clipboard icon */}
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 shrink-0 mt-0.5 fill-current" style={{ color: 'var(--accent)', opacity: 0.7 }} aria-hidden>
                <path d="M4 1.5A1.5 1.5 0 0 1 5.5 0h1A1.5 1.5 0 0 1 8 1.5H9.5A1.5 1.5 0 0 1 11 3v7.5A1.5 1.5 0 0 1 9.5 12h-7A1.5 1.5 0 0 1 1 10.5V3A1.5 1.5 0 0 1 2.5 1.5H4zm1.5-1a.5.5 0 0 0-.5.5v.5h2V1a.5.5 0 0 0-.5-.5h-1z"/>
              </svg>
              <div className="flex-1 min-w-0">
                {!contextExpanded && (
                  <span className="block text-[12px] truncate font-mono leading-snug" style={{ color: 'var(--context-text)' }}>
                    {isLong ? ctxText.slice(0, 55) + '…' : ctxText}
                  </span>
                )}
                {contextExpanded && (
                  <span
                    className="block text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words"
                    style={{ maxHeight: 88, overflowY: 'auto', color: 'var(--context-text-expanded)' }}
                  >
                    {ctxText}
                  </span>
                )}
                {isLong && (
                  <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                    {contextExpanded ? 'click to collapse' : 'click to expand'}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setInitialContext(null); setContext(null); setContextExpanded(false); }}
                className="no-drag shrink-0 transition-colors leading-none text-[10px] mt-0.5"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                aria-label="Clear context"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })()}

      {/* Separator only when there's content below */}
      {(hasInitialContext || hasMessages) && <div className="h-px shrink-0" style={{ background: 'var(--border)' }} />}

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
                if (s.autoSubmit) {
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('cursi:submit'));
                  }, 30);
                } else {
                  window.dispatchEvent(new CustomEvent('cursi:suggestion', { detail: s.prompt }));
                }
              }}
              className="px-2.5 py-1 rounded-full text-[12px] transition-all duration-100"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--text-muted)',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-muted)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom dock ── */}
      {(hasInitialContext || hasMessages) && <div className="h-px shrink-0" style={{ background: 'var(--border)' }} />}

      {/* Active context badge — shown above input when clipboard changed mid-session */}
      {hasNewContext && context && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0"
          style={{ background: 'var(--accent-dim)', borderTop: '1px solid var(--border)' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>Using</span>
          <span className="flex-1 min-w-0 text-[12px] truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
            {(context.clipboardText ?? '').length > 50
              ? (context.clipboardText ?? '').slice(0, 50) + '…'
              : (context.clipboardText ?? '')}
          </span>
          <button
            onClick={() => setContext(initialContext)}
            className="no-drag transition-colors text-[10px] leading-none shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
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
