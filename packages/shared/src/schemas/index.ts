import { z } from 'zod';

// ─── Context schema ────────────────────────────────────────────────────────────

export const activeApplicationSchema = z.object({
  name: z.string(),
  bundleId: z.string(),
});

export const aiContextSchema = z.object({
  type: z.enum(['selected_text', 'clipboard', 'screenshot', 'none']),
  selectedText: z.string().max(50_000).optional(),
  clipboardText: z.string().max(50_000).optional(),
  activeApplication: activeApplicationSchema.optional(),
  currentUrl: z.string().url().optional(),
  screenshot: z.string().optional(),
  accessibilityData: z.unknown().optional(),
});

// ─── Chat schemas ──────────────────────────────────────────────────────────────

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(100_000),
  context: aiContextSchema.optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

// ─── Auth schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── Exported types inferred from schemas ──────────────────────────────────────

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AIContextInput = z.infer<typeof aiContextSchema>;
