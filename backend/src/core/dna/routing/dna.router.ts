import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import type { ContentTypeKey } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import type { DnaPipelineInput, DnaPipelineRoute } from '@/core/dna/contracts/dna.contracts.js'

// OpenAI і Gemini тимчасово вимкнені — тільки Anthropic Claude
// TODO: розкоментувати коли з'явиться прибуток
// const DEFAULT_PROVIDER_ORDER: ModelProvider[] = ['gpt', 'gemini', 'claude']
const DEFAULT_PROVIDER_ORDER: ModelProvider[] = ['claude']

function providersFor(contentType: ContentTypeKey): ModelProvider[] {
  // OpenAI і Gemini тимчасово вимкнені
  // if (contentType === 'reels' || contentType === 'stories') return ['gpt', 'claude', 'gemini']
  // if (contentType === 'warmup' || contentType === 'storytelling') return ['claude', 'gpt', 'gemini']
  // if (contentType === 'landing' || contentType === 'sales') return ['claude', 'gpt', 'gemini']
  if (contentType === 'reels' || contentType === 'stories') return ['claude']
  if (contentType === 'warmup' || contentType === 'storytelling') return ['claude']
  if (contentType === 'landing' || contentType === 'sales') return ['claude']
  return DEFAULT_PROVIDER_ORDER
}

export function resolveDnaPipelineRoute(input: DnaPipelineInput): DnaPipelineRoute {
  if (input.transcript && input.contentType === 'reels') {
    return {
      pipelineId: 'voice_reels',
      agents: ['voice', 'reels', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['claude'],
    }
  }

  if (input.contentType === 'warmup' || input.contentType === 'storytelling' || input.contentType === 'webinar') {
    return {
      pipelineId: 'launch',
      agents: ['warmup', 'storytelling', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['claude'],
    }
  }

  if (input.contentType === 'landing') {
    return {
      pipelineId: 'landing',
      agents: ['landing', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['claude'],
    }
  }

  return {
    pipelineId: 'default',
    agents: ['sales', 'cta'],
    providerOrder: providersFor(input.contentType),
    fallbackProviders: ['claude'],
  }
}
