import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './middleware/auth.js';
import rateLimitPlugin from './middleware/rate-limit.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';
import { userRoutes } from './routes/users.js';

const isDev = process.env['NODE_ENV'] !== 'production';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
      ...(isDev && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
    },
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const allowed = [
        'http://localhost:5173',
        'http://localhost:3000',
        'app://cursi',
        'file://',
        'https://cursi-api-4cfo.vercel.app',
      ];

      if (allowed.some((a) => origin.startsWith(a))) return cb(null, true);
      if (isDev) return cb(null, true);

      cb(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await fastify.register(rateLimitPlugin);
  await fastify.register(authPlugin);

  // ─── Routes ───────────────────────────────────────────────────────────────

  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await fastify.register(chatRoutes);
  await fastify.register(conversationRoutes);
  await fastify.register(userRoutes);

  return fastify;
}

// ─── Vercel entry point ───────────────────────────────────────────────────────
// Vercel imports this file and calls the default export as a Node.js handler.

import type { IncomingMessage, ServerResponse } from 'http';

let _app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function getApp() {
  if (!_app) {
    _app = await buildApp();
    await _app.ready();
  }
  return _app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit('request', req, res);
}

// ─── Local dev: start listening ───────────────────────────────────────────────

if (process.env['VERCEL'] !== '1') {
  const PORT = Number(process.env['PORT'] ?? 3001);

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Cursi API listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
