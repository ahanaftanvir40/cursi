import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../stores/chatStore';
import type { AIContext } from '@cursi/shared';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  context?: AIContext | null;
}

export function MessageList({ messages, isStreaming, context }: MessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    const hasContext = context && context.type !== 'none';
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20 select-none px-6">
        <div className="text-3xl">✦</div>
        {hasContext ? (
          <>
            <p className="text-sm text-white/40 text-center">Context loaded — what do you want to do with it?</p>
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              {[
                'Summarise this',
                'Explain in simple terms',
                'Fix grammar & spelling',
                'Translate to Spanish',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="text-left text-xs text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg px-3 py-1.5 transition-all border border-transparent hover:border-white/10"
                  onClick={() => {
                    // Dispatch a custom event that ChatPage listens to
                    window.dispatchEvent(new CustomEvent('cursi:suggestion', { detail: suggestion }));
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm">Ask anything</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-1.5 pl-1">
          <span className="inline-block w-1 h-1 rounded-full bg-cursi-400 animate-bounce [animation-delay:0ms]" />
          <span className="inline-block w-1 h-1 rounded-full bg-cursi-400 animate-bounce [animation-delay:150ms]" />
          <span className="inline-block w-1 h-1 rounded-full bg-cursi-400 animate-bounce [animation-delay:300ms]" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }): React.ReactElement {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed selectable
          ${isUser
            ? 'bg-cursi-500 text-white rounded-br-sm'
            : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/5'
          }
        `}
      >
        <MessageContent content={message.content} />
        {message.streaming && (
          <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-cursi-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

/** Very basic renderer — just preserves newlines and inline code. */
function MessageContent({ content }: { content: string }): React.ReactElement {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre key={i} className="mt-2 mb-1 rounded-lg bg-black/30 p-2.5 text-xs overflow-x-auto font-mono">
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="mx-0.5 rounded bg-black/30 px-1 py-0.5 text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return (
          <span key={i}>
            {part.split('\n').map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
}
