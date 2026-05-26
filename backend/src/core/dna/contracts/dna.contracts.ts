import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import type { ContentTypeKey, PromptTone } from '@/modules/sales-assistant/prompts/contentType.prompts.js'

export const DNA_PRESET_IDS = ['SHUM', 'ZASTRYAG', 'BATL', 'TAKTYKA'] as const
export type DnaPresetId = typeof DNA_PRESET_IDS[number]

export const DNA_PIPELINE_STAGES = ['PLAN', 'EXECUTE', 'VALIDATE', 'FORMAT', 'STORE', 'QUEUE', 'DISTRIBUTE'] as const
export type DnaPipelineStage = typeof DNA_PIPELINE_STAGES[number]

export const DNA_GENERATION_STATUSES = ['queued', 'waiting', 'running', 'retrying', 'completed', 'failed', 'cancelled', 'stalled'] as const
export type DnaGenerationLifecycleStatus = typeof DNA_GENERATION_STATUSES[number]

export type DnaSignalLevel = 'low' | 'medium' | 'high'

export type DnaArtifactType =
  | ContentTypeKey
  | 'cta'
  | 'story'
  | 'quote'
  | 'hook'

export type DnaRuntimeChannel = 'web' | 'telegram' | 'miniapp' | 'admin'

export type DnaRuntimeUserContext = {
  userId: string
  workspaceId?: string | null
  role?: string | null
  locale?: string | null
  telegramChatId?: string | null
}

export type DnaPipelineInput = {
  contentType: ContentTypeKey
  userContext: string
  userRequest: string
  selectedProtocol: string
  tone?: PromptTone
  selectedOutputs?: string[]
  transcript?: string | null
}

export type DnaAgentInput = {
  input: DnaPipelineInput
  presetId: DnaPresetId
  provider: ModelProvider
  stageContext: DnaStageContext
  agentHints?: Record<string, unknown>
}

export type DnaArtifactMetadata = {
  createdAt: string
  pipelineRunId: string
  agentId: string
  contentType: ContentTypeKey
  channel: DnaRuntimeChannel
}

export type DnaArtifactSignals = {
  pressure: DnaSignalLevel
  pacing: DnaSignalLevel
  ctaIntensity: DnaSignalLevel
  emotionalDensity: DnaSignalLevel
}

export type DnaArtifact = {
  type: DnaArtifactType
  metadata: DnaArtifactMetadata
  dnaSignals: DnaArtifactSignals
  preset: DnaPresetId
  provider: ModelProvider
  promptVersion: string
  sourceInput: DnaPipelineInput
  payload: Record<string, unknown>
  rawText: string
}

export type DnaAgentResult = {
  agentId: string
  artifact: DnaArtifact
  usage?: {
    provider: string
    model?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCostUsd?: number | null
    actualCostUsd?: number | null
  } | null
}

export type DnaAgentContract = {
  id: string
  supportedTypes: ReadonlyArray<ContentTypeKey>
  inputSchema: string
  outputSchema: string
  execute: (input: DnaAgentInput) => Promise<DnaAgentResult>
}

export type DnaPresetConfig = {
  id: DnaPresetId
  label: string
  toneModifiers: string[]
  psycholinguisticTriggers: string[]
  pacing: DnaSignalLevel
  pressureLevel: DnaSignalLevel
  ctaStyle: 'aggressive' | 'coaching' | 'competitive' | 'execution'
  hookStyle: 'provocative' | 'empathetic' | 'challenge' | 'structured'
}

export type DnaPipelineRoute = {
  pipelineId: 'voice_reels' | 'launch' | 'landing' | 'default'
  agents: string[]
  providerOrder: ModelProvider[]
  fallbackProviders: ModelProvider[]
}

export type DnaStageContext = {
  runId: string
  status: DnaGenerationLifecycleStatus
  stage: DnaPipelineStage
  startedAt: number
  retries: number
  route: DnaPipelineRoute
  telemetry: DnaTelemetryEvent[]
}

export type DnaTelemetryEvent = {
  ts: string
  stage: DnaPipelineStage
  event: string
  provider?: ModelProvider
  latencyMs?: number
  tokens?: number
  retries?: number
  estimatedCostUsd?: number
  details?: Record<string, unknown>
}

export type DnaPipelineRunRequest = {
  type: ContentTypeKey
  input: Omit<DnaPipelineInput, 'contentType'>
  preset: DnaPresetId
  userContext: DnaRuntimeUserContext
  channel: DnaRuntimeChannel
}

export type DnaPipelineRunResult = {
  runId: string
  status: DnaGenerationLifecycleStatus
  stage: DnaPipelineStage
  route: DnaPipelineRoute
  artifacts: DnaArtifact[]
  lifecycle: Array<{ status: DnaGenerationLifecycleStatus; at: string; reason?: string }>
  telemetry: DnaTelemetryEvent[]
}
