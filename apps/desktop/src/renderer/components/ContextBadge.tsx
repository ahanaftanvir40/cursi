import React from 'react';
import type { AIContext } from '@cursi/shared';

interface ContextBadgeProps {
  context: AIContext;
  onDismiss: () => void;
  /** When true, renders inline (no background/border-b) for use inside the title bar */
  inline?: boolean;
}

export function ContextBadge({ context, onDismiss, inline = false }: ContextBadgeProps): React.ReactElement | null {
  if (context.type === 'none') return null;
  const text = context.selectedText ?? context.clipboardText ?? '';
  if (!text) return null;

  // Inline (title bar): shorter preview, no background
  const maxLen = inline ? 32 : 60;
  const preview = text.length > maxLen ? text.slice(0, maxLen) + '…' : text;

  if (inline) {
    return (
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cursi-400/70 shrink-0" />
        <p className="text-[11px] text-white/40 truncate leading-none font-mono select-none">
          {preview}
        </p>
        <button
          onClick={onDismiss}
          className="no-drag text-white/15 hover:text-white/40 transition-colors text-[10px] leading-none shrink-0 ml-0.5"
          aria-label="Dismiss context"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/4 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-cursi-400/70 shrink-0" />
      <p className="flex-1 min-w-0 text-[11px] text-white/40 truncate leading-none selectable font-mono">
        {preview}
      </p>
      <button
        onClick={onDismiss}
        className="no-drag text-white/20 hover:text-white/50 transition-colors text-xs leading-none shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
