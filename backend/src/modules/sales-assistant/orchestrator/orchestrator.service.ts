import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import {
  AGENTS_REGISTRY,
  AgentType,
  type ContentArtifactType,
  type AgentTone,
  type GenerationMode,
  type PresetType,
  type ProtocolMode,
  type SharedContext,
} from '@/modules/sales-assistant/agents/agents.registry.js'
import { buildPrompt } from '@/modules/sales-assistant/agents/prompt.builder.js'
import { callProviderSafe } from '@/modules/sales-assistant/sales-assistant.providers.js'

type GenerateWithAgentsInput = {
  agents: AgentType[]
  preset?: PresetType
  sharedContext: SharedContext
  userId: string
  selectedProtocol?: ProtocolMode
  tone?: AgentTone
  generationMode?: GenerationMode
}

export type AgentGenerationResult = {
  agent: AgentType
  status: 'fulfilled' | 'rejected'
  result: string | null
  error: string | null
  model: 'claude' | 'gpt' | 'gemini'
  durationMs: number
}

export class OrchestratorService {
  private readonly agentToArtifactMap: Record<AgentType, ContentArtifactType> = {
    [AgentType.VOICE]: 'hooks',
    [AgentType.CTA]: 'telegram',
    [AgentType.LANDING]: 'landing',
    [AgentType.REELS]: 'reels',
    [AgentType.STORYTELLING]: 'stories',
    [AgentType.WARMUP]: 'banners',
  }

  async generateWithAgents(
    input: GenerateWithAgentsInput
  ): Promise<AgentGenerationResult[]> {
    const { agents, preset, sharedContext, userId, selectedProtocol, tone, generationMode } =
      input
    const startedAt = Date.now()

    console.log('[orchestrator] Starting generation', {
      userId,
      agentsCount: agents.length,
      agents,
      preset: preset ?? 'none',
      selectedProtocol: selectedProtocol ?? 'raw_truth',
    })

    const settled = await Promise.allSettled(
      agents.map((agent) =>
        this.callAgent({
          agent,
          preset,
          context: sharedContext,
          userId,
          selectedProtocol,
          tone,
          generationMode,
        })
      )
    )
    console.log('[DNA][debug][orchestrator][all_settled]', {
      settledStatuses: settled.map((item) => item.status),
      agents,
    })

    const results: AgentGenerationResult[] = settled.map((item, index) => {
      const agent = agents[index]
      const config = AGENTS_REGISTRY[agent]

      if (item.status === 'fulfilled') {
        return {
          agent,
          status: 'fulfilled',
          result: item.value.content,
          error: null,
          model: config.model,
          durationMs: item.value.durationMs,
        }
      }

      return {
        agent,
        status: 'rejected',
        result: null,
        error:
          item.reason instanceof Error
            ? item.reason.message
            : String(item.reason ?? 'Unknown error'),
        model: config.model,
        durationMs: 0,
      }
    })

    console.log('[orchestrator] Completed', {
      durationMs: Date.now() - startedAt,
      successCount: results.filter((r) => r.status === 'fulfilled').length,
      totalCount: results.length,
    })

    return results
  }

  private async callAgent(input: {
    agent: AgentType
    preset?: PresetType
    context: SharedContext
    userId: string
    selectedProtocol?: ProtocolMode
    tone?: AgentTone
    generationMode?: GenerationMode
  }): Promise<{ content: string; durationMs: number }> {
    const startedAt = Date.now()
    const prompt = buildPrompt({
      agent: input.agent,
      preset: input.preset,
      sharedContext: input.context,
      contentType: this.agentToArtifactMap[input.agent],
      dna: {
        protocol: input.selectedProtocol ?? 'raw_truth',
        tone: input.tone ?? 'clear',
        generationMode: input.generationMode ?? 'BALANCED',
      },
    })
    const strategyTier = resolveModelStrategyTier(input.selectedProtocol ?? 'raw_truth')

    console.log(`[orchestrator][${input.agent}] Building prompt`, {
      model: prompt.config.model,
      strategyTier,
      promptLength: prompt.systemPrompt.length + prompt.userPrompt.length,
      userId: input.userId,
    })

    const provider = this.mapModelToProvider(prompt.config.model)
    const providerResult = await callProviderSafe(
      provider,
      prompt.systemPrompt,
      prompt.userPrompt,
      {
      contentType: input.agent,
      strategyTier,
      }
    )
    console.log(`[DNA][debug][orchestrator][agent_response][${input.agent}]`, {
      provider,
      hasContent: Boolean(providerResult.content),
      contentLength: providerResult.content?.length ?? 0,
      hasError: Boolean(providerResult.error),
      error: providerResult.error ?? null,
    })

    if (!providerResult.content) {
      throw new Error(providerResult.error?.message ?? 'Provider returned empty content')
    }

    const durationMs = Date.now() - startedAt
    console.log(`[orchestrator][${input.agent}] Completed`, {
      model: prompt.config.model,
      durationMs,
    })

    return { content: providerResult.content, durationMs }
  }

  private mapModelToProvider(model: 'claude' | 'gpt' | 'gemini'): ModelProvider {
    if (model === 'claude') return 'claude'
    if (model === 'gemini') return 'gemini'
    return 'gpt'
  }
}
