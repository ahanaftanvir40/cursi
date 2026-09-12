import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { conversations, messages } from '../db/schema.js';
import type { Conversation, Message } from '@cursi/shared';

export async function createConversation(
  userId: string,
  title = 'New conversation',
): Promise<Conversation> {
  const [row] = await db
    .insert(conversations)
    .values({ userId, title })
    .returning();

  if (!row) throw new Error('Failed to create conversation');

  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getConversation(
  id: string,
  userId: string,
): Promise<(Conversation & { messages: Message[] }) | null> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conv || conv.userId !== userId) return null;

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const mappedMessages: Message[] = msgs.map((m) => {
    const msg: Message = {
      id: m.id,
      conversationId: m.conversationId,
      role: m.role as Message['role'],
      content: m.content,
      createdAt: m.createdAt,
    };
    if (m.model !== null) msg.model = m.model;
    return msg;
  });

  return {
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messages: mappedMessages,
  };
}

export async function deleteConversation(id: string, userId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!existing || existing.id !== id) return false;

  await db
    .delete(conversations)
    .where(eq(conversations.userId, userId));

  return true;
}

export async function saveMessage(params: {
  conversationId: string;
  role: Message['role'];
  content: string;
  model?: string;
}): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values(params)
    .returning();

  if (!row) throw new Error('Failed to save message');

  const saved: Message = {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as Message['role'],
    content: row.content,
    createdAt: row.createdAt,
  };
  if (row.model !== null) saved.model = row.model;
  return saved;
}

export async function touchConversation(id: string): Promise<void> {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));
}
