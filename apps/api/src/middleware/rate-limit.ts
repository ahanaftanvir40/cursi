import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    // Per-user rate limiting when authenticated
    keyGenerator: (request) => {
      return request.userId || request.ip;
    },
    errorResponseBuilder: () => ({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    }),
  });

  // Tighter limit on the chat endpoint
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url === '/v1/chat' && routeOptions.method === 'POST') {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      };
    }
  });
};

export default fp(rateLimitPlugin, { name: 'rate-limit' });
