import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import type { ContentTypeKey } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import type { DnaPipelineInput, DnaPipelineRoute } from '@/core/dna/contracts/dna.contracts.js'

const DEFAULT_PROVIDER_ORDER: ModelProvider[] = ['gpt', 'gemini', 'claude']

function providersFor(contentType: ContentTypeKey): ModelProvider[] {
  if (contentType === 'reels' || contentType === 'stories') return ['gpt', 'claude', 'gemini']
  if (contentType === 'warmup' || contentType === 'storytelling') return ['claude', 'gpt', 'gemini']
  if (contentType === 'landing' || contentType === 'sales') return ['claude', 'gpt', 'gemini']
  return DEFAULT_PROVIDER_ORDER
}

export function resolveDnaPipelineRoute(input: DnaPipelineInput): DnaPipelineRoute {
  if (input.transcript && input.contentType === 'reels') {
    return {
      pipelineId: 'voice_reels',
      agents: ['voice', 'reels', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['gemini'],
    }
  }

  if (input.contentType === 'warmup' || input.contentType === 'storytelling' || input.contentType === 'webinar') {
    return {
      pipelineId: 'launch',
      agents: ['warmup', 'storytelling', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['gpt', 'gemini'],
    }
  }

  if (input.contentType === 'landing') {
    return {
      pipelineId: 'landing',
      agents: ['landing', 'cta'],
      providerOrder: providersFor(input.contentType),
      fallbackProviders: ['gpt', 'gemini'],
    }
  }

  return {
    pipelineId: 'default',
    agents: ['sales', 'cta'],
    providerOrder: providersFor(input.contentType),
    fallbackProviders: ['gemini'],
  }
}
