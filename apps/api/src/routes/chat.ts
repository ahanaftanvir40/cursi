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

    const chatParams: import('../services/chat.service.js').ChatParams = { userId, message };
    if (conversationId !== undefined) chatParams.conversationId = conversationId;
    if (context !== undefined) chatParams.context = context;

    let result;
    try {
      result = await startChat(chatParams);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      return reply.code(statusCode).send({ error: message, statusCode });
    }

    // Server-Sent Events streaming response
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Conversation-Id', result.conversationId);
    reply.raw.flushHeaders();

    let fullContent = '';

    const sendEvent = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const delta of result.stream) {
        fullContent += delta;
        sendEvent({ type: 'delta', delta, conversationId: result.conversationId });
      }

      const { assistantMessageId } = await result.onComplete(fullContent);

      sendEvent({
        type: 'done',
        conversationId: result.conversationId,
        userMessageId: result.userMessageId,
        messageId: assistantMessageId,
      });
    } catch (err) {
      fastify.log.error(err, '[chat] Streaming error');
      sendEvent({ type: 'error', error: 'Streaming failed' });
    } finally {
      reply.raw.end();
    }
  });
};
