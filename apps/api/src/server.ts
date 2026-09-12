import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './middleware/auth.js';
import rateLimitPlugin from './middleware/rate-limit.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';
import { userRoutes } from './routes/users.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const isDev = process.env['NODE_ENV'] !== 'production';

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

// ─── Plugins ──────────────────────────────────────────────────────────────────

await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'app://cursi',
    ];
    // Allow requests with no origin (e.g. Electron, curl, mobile)
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
    } else if (isDev) {
      // In dev, allow any localhost origin
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await fastify.register(rateLimitPlugin);
await fastify.register(authPlugin);

// ─── Routes ───────────────────────────────────────────────────────────────────

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await fastify.register(chatRoutes);
await fastify.register(conversationRoutes);
await fastify.register(userRoutes);

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Cursi API listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

await start();
