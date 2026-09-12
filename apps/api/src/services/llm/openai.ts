import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMOptions } from '@cursi/shared';

export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({ apiKey });
    this.defaultModel = process.env['OPENAI_MODEL'] ?? 'gpt-4o';
  }

  async *streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
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
      if (delta) {
        yield delta;
      }
    }
  }
}
