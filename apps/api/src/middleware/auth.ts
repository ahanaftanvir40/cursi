import fp from 'fastify-plugin';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const jwtSecret = process.env['SUPABASE_JWT_SECRET'];

  if (!supabaseUrl || !jwtSecret) {
    throw new Error('SUPABASE_URL and SUPABASE_JWT_SECRET are required');
  }

  // Supabase exposes a JWKS endpoint for JWT verification
  const JWKS = createRemoteJWKSet(
    new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
  );

  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('userEmail', '');

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Health check routes are public
    if (request.url === '/health' || request.url === '/') {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header', statusCode: 401 });
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      request.userId = payload['sub'] as string;
      request.userEmail = (payload['email'] as string | undefined) ?? '';
    } catch {
      return reply.code(401).send({ error: 'Invalid or expired token', statusCode: 401 });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
