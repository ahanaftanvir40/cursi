import type { AIContext, LLMMessage } from '@cursi/shared';
import { getLLMProvider } from './llm/llm.service.js';
import {
  createConversation,
  saveMessage,
  getConversation,
  touchConversation,
  upsertUser,
} from './conversation.service.js';

export interface ChatParams {
  userId: string;
  userEmail?: string;
  message: string;
  conversationId?: string;
  context?: AIContext;
}

export interface ChatResult {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  reply: string;
}

export async function startChat(params: ChatParams): Promise<ChatResult> {
  const { userId, userEmail, message, context } = params;

  // Ensure user row exists in public.users (FK requirement)
  await upsertUser(userId, userEmail ?? '');

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

  // Get full response (no streaming)
  const provider = getLLMProvider();
  const reply = await provider.chat(llmMessages);

  // Persist assistant message
  const assistantMsg = await saveMessage({
    conversationId,
    role: 'assistant',
    content: reply,
    model: process.env['OPENAI_MODEL'] ?? 'gpt-4o',
  });

  await touchConversation(conversationId);

  return {
    conversationId,
    userMessageId: userMsg.id,
    assistantMessageId: assistantMsg.id,
    reply,
  };
}

function buildSystemPrompt(context?: AIContext): string {
  const lines = [
    "You are Cursi, a helpful AI assistant embedded in the user's desktop.",
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
