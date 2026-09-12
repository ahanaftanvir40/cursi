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
    ?? (hasContext ? 'What do you want to do?' : 'Ask anything…');

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    if (hasContext) setTimeout(() => textareaRef.current?.focus(), 60);
  }, [hasContext]);

  useEffect(() => {
    const handler = (e: Event) => {
      onChange((e as CustomEvent<string>).detail);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };
    window.addEventListener('cursi:suggestion', handler);
    return () => window.removeEventListener('cursi:suggestion', handler);
  }, [onChange]);

  // Auto-resize — cap at 3 lines (~72px)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSend = !isStreaming && value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 px-2.5 py-2 no-drag shrink-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={effectivePlaceholder}
        rows={1}
        disabled={isStreaming}
        className="
          flex-1 resize-none bg-transparent
          text-[13px] text-white/85 placeholder-white/22
          focus:outline-none
          disabled:opacity-40
          max-h-[72px] overflow-y-auto selectable leading-snug py-1
        "
      />
      <button
        onClick={onSubmit}
        disabled={!canSend}
        aria-label="Send"
        className={`
          shrink-0 flex items-center justify-center
          w-7 h-7 rounded-full mb-0.5
          transition-all duration-150
          ${canSend
            ? 'bg-cursi-500 hover:bg-cursi-400 text-white'
            : 'bg-white/8 text-white/25 cursor-not-allowed'
          }
        `}
      >
        {isStreaming ? (
          <span className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 8.5V1.5M1.5 5 5 1.5 8.5 5"/>
          </svg>
        )}
      </button>
    </div>
  );
}
