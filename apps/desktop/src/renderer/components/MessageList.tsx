import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../stores/chatStore';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return <></>;

  return (
    <div className="overflow-y-auto px-3 py-2 space-y-1.5" style={{ maxHeight: 220 }}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-1 px-1 py-1">
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce [animation-delay:100ms]" />
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce [animation-delay:200ms]" />
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
          max-w-[86%] rounded-xl px-3 py-1.5 text-[13px] leading-snug selectable
          ${isUser
            ? 'bg-cursi-500 text-white'
            : 'text-white/75'
          }
        `}
      >
        <MessageContent content={message.content} />
        {message.streaming && (
          <span className="inline-block w-0.5 h-3 ml-0.5 bg-cursi-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }): React.ReactElement {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre key={i} className="mt-1.5 mb-0.5 rounded-lg bg-black/30 p-2 text-[11px] overflow-x-auto font-mono">
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="mx-0.5 rounded bg-black/25 px-1 py-px text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return (
          <span key={i}>
            {part.split('\n').map((line, j) => (
              <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
}
