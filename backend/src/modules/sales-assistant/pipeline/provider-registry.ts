import type { ProviderRegistryItem } from '@/modules/sales-assistant/pipeline/provider-lifecycle.types.js'

export const PROVIDER_REGISTRY: Record<'gpt' | 'claude' | 'gemini' | 'runway', ProviderRegistryItem> = {
  gpt: {
    provider: 'gpt',
    enabled: process.env.OPENAI_API_KEY ? true : false,
    capabilities: ['text', 'image'],
    cooldownMs: 30_000,
  },
  claude: {
    provider: 'claude',
    enabled: process.env.ANTHROPIC_API_KEY ? true : false,
    capabilities: ['text', 'long_form_text'],
    cooldownMs: 30_000,
  },
  gemini: {
    provider: 'gemini',
    enabled: process.env.GEMINI_API_KEY ? true : false,
    capabilities: ['text', 'limited_generation'],
    cooldownMs: 20_000,
  },
  runway: {
    provider: 'runway',
    enabled: process.env.RUNWAY_API_KEY ? true : false,
    capabilities: ['video'],
    cooldownMs: 60_000,
  },
}
