import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/users/me
  fastify.get('/v1/users/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId));

    if (!user) {
      // Upsert user on first access (Supabase Auth users may not yet be in our table)
      const [newUser] = await db
        .insert(users)
        .values({ id: request.userId, email: request.userEmail })
        .onConflictDoNothing()
        .returning();

      return reply.send(newUser ?? { id: request.userId, email: request.userEmail });
    }

    return reply.send(user);
  });
};
