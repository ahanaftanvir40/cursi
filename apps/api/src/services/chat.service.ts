import type { AIContext, LLMMessage } from '@cursi/shared';
import { getLLMProvider } from './llm/llm.service.js';
import {
  createConversation,
  saveMessage,
  getConversation,
  touchConversation,
} from './conversation.service.js';

export interface ChatParams {
  userId: string;
  message: string;
  conversationId?: string;
  context?: AIContext;
}

export interface ChatResult {
  conversationId: string;
  userMessageId: string;
  stream: AsyncIterable<string>;
  onComplete: (fullContent: string) => Promise<{ assistantMessageId: string }>;
}

export async function startChat(params: ChatParams): Promise<ChatResult> {
  const { userId, message, context } = params;

  // Resolve or create conversation
  let conversationId = params.conversationId;
  let history: LLMMessage[] = [];

  if (conversationId) {
    const conv = await getConversation(conversationId, userId);
    if (!conv) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }
    history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
  } else {
    // Auto-title from first 60 chars of the message
    const title = message.slice(0, 60) + (message.length > 60 ? '…' : '');
    const conv = await createConversation(userId, title);
    conversationId = conv.id;
  }

  // Build system prompt + context injection
  const systemPrompt = buildSystemPrompt(context);
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];

  // Persist user message
  const userMsg = await saveMessage({
    conversationId,
    role: 'user',
    content: message,
  });

  const provider = getLLMProvider();
  const stream = provider.streamChat(llmMessages);

  const onComplete = async (fullContent: string) => {
    const assistantMsg = await saveMessage({
      conversationId: conversationId!,
      role: 'assistant',
      content: fullContent,
      model: process.env['OPENAI_MODEL'] ?? 'gpt-4o',
    });
    await touchConversation(conversationId!);
    return { assistantMessageId: assistantMsg.id };
  };

  return {
    conversationId,
    userMessageId: userMsg.id,
    stream,
    onComplete,
  };
}

function buildSystemPrompt(context?: AIContext): string {
  const lines = [
    'You are Cursi, a helpful AI assistant embedded in the user\'s desktop.',
    'Be concise, clear, and direct. Avoid unnecessary preamble.',
  ];

  if (!context || context.type === 'none') {
    return lines.join('\n');
  }

  lines.push('');
  lines.push('## Context from the user\'s desktop');

  if (context.selectedText) {
    lines.push(`Selected text:\n\`\`\`\n${context.selectedText}\n\`\`\``);
  }

  if (context.clipboardText && !context.selectedText) {
    lines.push(`Clipboard:\n\`\`\`\n${context.clipboardText}\n\`\`\``);
  }

  if (context.activeApplication) {
    lines.push(
      `Active app: ${context.activeApplication.name} (${context.activeApplication.bundleId})`,
    );
  }

  if (context.currentUrl) {
    lines.push(`Current URL: ${context.currentUrl}`);
  }

  return lines.join('\n');
}
