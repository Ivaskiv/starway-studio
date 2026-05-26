import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import type { ContentTypeKey } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import type {
  DnaAgentContract,
  DnaAgentInput,
  DnaAgentResult,
  DnaArtifact,
  DnaArtifactType,
} from '@/core/dna/contracts/dna.contracts.js'
import { buildDnaPrompt, buildMentorPromptForDna } from '@/core/dna/runtime/dna.prompt-registry.js'
import { executeWithProviderFallback } from '@/core/dna/providers/dna.providers.js'
import { getDnaPreset } from '@/core/dna/presets/dna.presets.js'

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    return { value: parsed }
  } catch {
    return { text: raw }
  }
}

function signalsFromPreset(presetId: DnaAgentInput['presetId']) {
  const preset = getDnaPreset(presetId)
  return {
    pressure: preset.pressureLevel,
    pacing: preset.pacing,
    ctaIntensity: preset.pressureLevel,
    emotionalDensity: preset.pressureLevel,
  } as const
}

async function buildArtifactFromProvider(params: {
  agentId: string
  artifactType: DnaArtifactType
  provider: ModelProvider
  input: DnaAgentInput
  promptBuilder: (input: DnaAgentInput['input'], presetId: DnaAgentInput['presetId']) => { system: string; user: string; version: string; id: string }
}): Promise<DnaAgentResult> {
  const prompt = params.promptBuilder(params.input.input, params.input.presetId)
  const providerResult = await executeWithProviderFallback({
    providers: [params.provider, ...params.input.stageContext.route.fallbackProviders],
    promptSystem: prompt.system,
    promptUser: prompt.user,
    input: params.input.input,
  })

  const artifact: DnaArtifact = {
    type: params.artifactType,
    metadata: {
      createdAt: new Date().toISOString(),
      pipelineRunId: params.input.stageContext.runId,
      agentId: params.agentId,
      contentType: params.input.input.contentType,
      channel: 'web',
    },
    dnaSignals: signalsFromPreset(params.input.presetId),
    preset: params.input.presetId,
    provider: providerResult.provider,
    promptVersion: `${prompt.id}:${prompt.version}`,
    sourceInput: params.input.input,
    payload: safeJsonParse(providerResult.content),
    rawText: providerResult.content,
  }

  return {
    agentId: params.agentId,
    artifact,
    usage: providerResult.usage,
  }
}

function createContentAgent(agentId: string, supportedTypes: ContentTypeKey[]): DnaAgentContract {
  return {
    id: agentId,
    supportedTypes,
    inputSchema: 'DnaPipelineInput',
    outputSchema: 'DnaArtifact<Record<string,unknown>>',
    execute: async (input) => {
      return buildArtifactFromProvider({
        agentId,
        artifactType: input.input.contentType,
        provider: input.provider,
        input,
        promptBuilder: (rawInput, presetId) => {
          const built = buildDnaPrompt(rawInput, presetId)
          return { ...built, version: built.version, id: built.id }
        },
      })
    },
  }
}

function createCtaAgent(): DnaAgentContract {
  return {
    id: 'cta',
    supportedTypes: ['reels', 'warmup', 'storytelling', 'landing', 'sales', 'post', 'blog', 'email', 'telegram_msg', 'stories', 'webinar', 'audit'],
    inputSchema: 'DnaPipelineInput',
    outputSchema: 'DnaArtifact<cta>',
    execute: async (input) => {
      const result = await buildArtifactFromProvider({
        agentId: 'cta',
        artifactType: 'cta',
        provider: input.provider,
        input,
        promptBuilder: (rawInput, presetId) => {
          const built = buildDnaPrompt(rawInput, presetId)
          return {
            id: `${built.id}/cta`,
            version: built.version,
            system: `${built.system}\n\nФокусуйся на сильному CTA.`,
            user: `${built.user}\n\nДодай блок CTA: {"cta":"...","reason":"..."}`,
          }
        },
      })
      return result
    },
  }
}

function createMentorAgent(): DnaAgentContract {
  return {
    id: 'mentor',
    supportedTypes: ['post', 'warmup', 'sales'],
    inputSchema: 'DnaPipelineInput',
    outputSchema: 'DnaArtifact<mentor>',
    execute: async (input) => {
      return buildArtifactFromProvider({
        agentId: 'mentor',
        artifactType: 'story',
        provider: input.provider,
        input,
        promptBuilder: (rawInput, presetId) => {
          const built = buildMentorPromptForDna(rawInput, presetId)
          return { ...built, version: built.version, id: built.id }
        },
      })
    },
  }
}

function createVoiceAgent(): DnaAgentContract {
  return {
    id: 'voice',
    supportedTypes: ['reels', 'stories', 'telegram_msg'],
    inputSchema: 'DnaPipelineInput',
    outputSchema: 'DnaArtifact<voice>',
    execute: async (input) => {
      const transcript = input.input.transcript?.trim() ?? input.input.userRequest
      const payload = {
        transcript,
        normalizedIntent: input.input.contentType,
        summary: transcript.slice(0, 400),
      }
      return {
        agentId: 'voice',
        artifact: {
          type: 'hook',
          metadata: {
            createdAt: new Date().toISOString(),
            pipelineRunId: input.stageContext.runId,
            agentId: 'voice',
            contentType: input.input.contentType,
            channel: 'web',
          },
          dnaSignals: signalsFromPreset(input.presetId),
          preset: input.presetId,
          provider: input.provider,
          promptVersion: 'voice:v1',
          sourceInput: input.input,
          payload,
          rawText: JSON.stringify(payload),
        },
        usage: null,
      }
    },
  }
}

const REGISTRY: Record<string, DnaAgentContract> = {
  reels: createContentAgent('reels', ['reels']),
  warmup: createContentAgent('warmup', ['warmup']),
  storytelling: createContentAgent('storytelling', ['storytelling']),
  landing: createContentAgent('landing', ['landing']),
  sales: createContentAgent('sales', ['sales', 'post', 'email', 'blog', 'telegram_msg', 'stories', 'webinar', 'audit']),
  cta: createCtaAgent(),
  voice: createVoiceAgent(),
  mentor: createMentorAgent(),
}

export function listDnaAgents(): DnaAgentContract[] {
  return Object.values(REGISTRY)
}

export function getDnaAgent(agentId: string): DnaAgentContract {
  const agent = REGISTRY[agentId]
  if (!agent) throw new Error(`DNA_AGENT_NOT_FOUND:${agentId}`)
  return agent
}
