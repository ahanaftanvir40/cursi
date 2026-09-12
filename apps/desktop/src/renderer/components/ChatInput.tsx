import React, { useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  placeholder?: string;
  hasContext?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  placeholder,
  hasContext = false,
}: ChatInputProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const effectivePlaceholder = placeholder
    ?? (hasContext ? 'What do you want to do with this?' : 'Ask anything…');

  // Auto-focus when mounted (panel just opened)
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Re-focus when context arrives (shortcut trigger with new context)
  useEffect(() => {
    if (hasContext) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [hasContext]);

  // Listen for quick suggestion clicks from empty state
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      onChange(text);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };
    window.addEventListener('cursi:suggestion', handler);
    return () => window.removeEventListener('cursi:suggestion', handler);
  }, [onChange]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 px-3 pb-3 pt-1 no-drag">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={effectivePlaceholder}
        rows={1}
        disabled={isStreaming}
        className="
          flex-1 resize-none rounded-xl bg-neutral-800 border border-white/10
          px-3.5 py-2.5 text-sm text-white placeholder-white/30
          focus:outline-none focus:ring-1 focus:ring-cursi-500/60
          disabled:opacity-50 transition-all duration-150
          max-h-40 overflow-y-auto selectable
        "
      />
      <button
        onClick={onSubmit}
        disabled={isStreaming || !value.trim()}
        aria-label="Send"
        className="
          shrink-0 flex items-center justify-center
          w-9 h-9 rounded-xl
          bg-cursi-500 hover:bg-cursi-400 disabled:bg-white/10
          text-white text-sm font-semibold
          transition-colors duration-150 disabled:cursor-not-allowed
        "
      >
        {isStreaming ? (
          <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden>
            <path d="M1.5 8L8 1.5M8 1.5L14.5 8M8 1.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </button>
    </div>
  );
}
