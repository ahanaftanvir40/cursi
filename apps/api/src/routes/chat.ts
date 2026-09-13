import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { chatRequestSchema } from '@cursi/shared';
import { startChat } from '../services/chat.service.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/v1/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: parsed.error.flatten(),
        statusCode: 400,
      });
    }

    const { message } = parsed.data;
    const context = parsed.data.context as import('@cursi/shared').AIContext | undefined;
    const conversationId = parsed.data.conversationId;
    const userId = request.userId;
    const userEmail = request.userEmail;

    const chatParams: import('../services/chat.service.js').ChatParams = { userId, userEmail, message };
    if (conversationId !== undefined) chatParams.conversationId = conversationId;
    if (context !== undefined) chatParams.context = context;

    try {
      const result = await startChat(chatParams);
      return reply.code(200).send({
        reply: result.reply,
        conversationId: result.conversationId,
        userMessageId: result.userMessageId,
        messageId: result.assistantMessageId,
      });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      fastify.log.error({ err, statusCode }, '[chat] startChat failed');
      return reply.code(statusCode).send({ error: message, statusCode });
    }
  });
};
