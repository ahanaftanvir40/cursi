import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { createConversationSchema } from '@cursi/shared';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
} from '../services/conversation.service.js';

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/conversations
  fastify.post('/v1/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createConversationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', statusCode: 400 });
    }

    const conv = await createConversation(request.userId, parsed.data.title);
    return reply.code(201).send(conv);
  });

  // GET /v1/conversations
  fastify.get('/v1/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    const convs = await listConversations(request.userId);
    return reply.send({ conversations: convs });
  });

  // GET /v1/conversations/:id
  fastify.get(
    '/v1/conversations/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const conv = await getConversation(request.params.id, request.userId);
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found', statusCode: 404 });
      }
      return reply.send(conv);
    },
  );

  // DELETE /v1/conversations/:id
  fastify.delete(
    '/v1/conversations/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const deleted = await deleteConversation(request.params.id, request.userId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Conversation not found', statusCode: 404 });
      }
      return reply.code(204).send();
    },
  );
};
