import type { LLMProvider } from '@cursi/shared';
import { OpenAIProvider } from './openai.js';

// Registry pattern — swap providers without touching chat.service
type ProviderName = 'openai';

const providers = {
  openai: (): LLMProvider => new OpenAIProvider(),
} satisfies Record<ProviderName, () => LLMProvider>;

let _instance: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (_instance) return _instance;

  const rawName = process.env['LLM_PROVIDER'] ?? 'openai';

  if (!(rawName in providers)) {
    throw new Error(`Unknown LLM provider: "${rawName}". Valid providers: ${Object.keys(providers).join(', ')}`);
  }

  const providerName = rawName as ProviderName;
  _instance = providers[providerName]();
  return _instance;
}
