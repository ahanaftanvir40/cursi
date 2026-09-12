import React from 'react';
import type { AIContext } from '@cursi/shared';

interface ContextBadgeProps {
  context: AIContext;
  onDismiss: () => void;
}

export function ContextBadge({ context, onDismiss }: ContextBadgeProps): React.ReactElement | null {
  if (context.type === 'none') return null;

  const text = context.selectedText ?? context.clipboardText ?? '';
  if (!text) return null;

  const label = context.type === 'selected_text' ? 'Selected text' : 'Clipboard';
  const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;

  return (
    <div className="mx-3 mb-1 rounded-xl bg-cursi-500/10 border border-cursi-500/30 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          {/* Clipboard icon */}
          <svg viewBox="0 0 14 14" className="w-3 h-3 fill-cursi-400" aria-hidden>
            <path d="M4.5 1A1.5 1.5 0 0 0 3 2.5H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1A1.5 1.5 0 0 0 9.5 1h-5ZM5 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z"/>
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cursi-400">
            {label}
          </span>
          {context.activeApplication && (
            <span className="text-[10px] text-white/25">· {context.activeApplication.name}</span>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="no-drag text-white/25 hover:text-white/60 transition-colors text-base leading-none px-1"
          aria-label="Dismiss context"
        >
          ×
        </button>
      </div>
      {/* Content */}
      <p className="px-3 pb-2.5 text-xs text-white/70 selectable leading-relaxed line-clamp-3">
        {preview}
      </p>
    </div>
  );
}
