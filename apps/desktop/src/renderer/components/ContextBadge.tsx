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
    <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 p-2.5">
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cursi-400">
          {label}
        </span>
        {context.activeApplication && (
          <span className="ml-1.5 text-[10px] text-white/30">
            · {context.activeApplication.name}
          </span>
        )}
        <p className="mt-0.5 text-xs text-white/60 selectable truncate leading-relaxed">
          {preview}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="no-drag shrink-0 mt-0.5 text-white/30 hover:text-white/70 transition-colors text-sm leading-none"
        aria-label="Dismiss context"
      >
        ×
      </button>
    </div>
  );
}
