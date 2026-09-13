import { OpenAI } from 'openai';
import type { LLMProvider, LLMMessage, LLMOptions } from '@cursi/shared';

/**
 * Free models on OpenRouter in preference order (September 2026).
 * `openrouter/free` auto-routes to the best available free model.
 * Specific models are tried as fallbacks if the router itself is rate-limited.
 *
 * NOTE: Free model availability changes — check https://openrouter.ai/models?q=free
 * if you hit consistent 429s and need to update this list.
 */
const FREE_MODEL_CHAIN = [
  'openrouter/free',                      // auto-router: picks best free model available
  'google/gemma-4-31b-it:free',           // 262K context, strong general model
  'google/gemma-4-26b-a4b-it:free',       // 131K context, MoE variant
  'nvidia/nemotron-3-ultra-550b-a55b:free', // 1M context, large reasoning model
  'nvidia/nemotron-3-super-120b-a12b:free', // 262K context, fast general model
];

export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  /** Env-specified model — used when caller doesn't override via LLMOptions */
  private readonly defaultModel: string;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey,
      // Point to OpenRouter — fully OpenAI-SDK compatible
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://cursi.app',
        'X-Title': 'Cursi',
      },
    });

    this.defaultModel = process.env['OPENAI_MODEL'] ?? 'openrouter/free';
  }

  /**
   * Try models in order. On 429 (rate limit), fall through to the next.
   * If caller passes options.model, only that model is tried (no fallback).
   */
  async chat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<string> {
    // If caller explicitly picks a model, respect it — no fallback chain
    const modelsToTry = options?.model
      ? [options.model]
      : [this.defaultModel, ...FREE_MODEL_CHAIN.filter((m) => m !== this.defaultModel)];

    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        console.log(`[llm] Trying model: ${model}`);
        const completion = await this.client.chat.completions.create({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          stream: false,
        });

        const content = completion.choices[0]?.message?.content ?? '';
        console.log(`[llm] Success with model: ${model}`);
        return content;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          console.warn(`[llm] ${model} rate-limited (429), trying next model...`);
          lastError = err;
          continue;
        }
        // Any other error (400, 401, 500…) — don't retry, surface immediately
        throw err;
      }
    }

    // All models exhausted
    throw Object.assign(
      new Error('All free models are rate-limited. Please try again later.'),
      { statusCode: 429, cause: lastError },
    );
  }

  // Keep streamChat in sync — same fallback pattern
  async *streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<string> {
    const modelsToTry = options?.model
      ? [options.model]
      : [this.defaultModel, ...FREE_MODEL_CHAIN.filter((m) => m !== this.defaultModel)];

    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        console.log(`[llm] Streaming with model: ${model}`);
        const stream = await this.client.chat.completions.create({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) yield delta;
        }
        return; // success — stop trying other models
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          console.warn(`[llm] ${model} rate-limited (429), trying next model...`);
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw Object.assign(
      new Error('All free models are rate-limited. Please try again later.'),
      { statusCode: 429, cause: lastError },
    );
  }
}
