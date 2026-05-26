import type { AgentType, AgentTone, GenerationMode, PresetType, ProtocolMode, SharedContext } from '@/modules/sales-assistant/agents/agents.registry.js'
import type { AccessTier, GatingDecision } from '@/modules/sales-assistant/pipeline/feature-access.service.js'

export type GenerationJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
export type ProviderFailureClass =
  | 'BALANCE_EXHAUSTED'
  | 'RATE_LIMIT'
  | 'INVALID_API_KEY'
  | 'TEMPORARY_UNAVAILABLE'
  | 'TIMEOUT'
  | 'FEATURE_NOT_SUPPORTED'
  | 'PROVIDER_DOWN'

export type GenerationContentType =
  | 'blog'
  | 'reels'
  | 'story'
  | 'telegram'
  | 'banner'
  | 'landing'
  | 'warmup'
  | 'cta'
  | 'email'

export type GenerationJob = {
  id: string
  sessionId: string
  userId: string
  agent: AgentType
  contentType: GenerationContentType
  status: GenerationJobStatus
  attempt: number
  maxAttempts: number
  timeoutMs: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  result?: string
  normalized?: unknown
  error?: string
  failureClass?: ProviderFailureClass
  provider?: 'claude' | 'gpt' | 'gemini'
  fallbackProvider?: 'claude' | 'gpt' | 'gemini'
  degraded?: boolean
  blockedPremium?: boolean
  paused?: boolean
}

export type ProviderStatus = {
  provider: 'claude' | 'gpt' | 'gemini'
  available: boolean
  status:
    | 'ok'
    | 'degraded'
    | ProviderFailureClass
    | 'ACTIVE'
    | 'DEGRADED'
    | 'RATE_LIMITED'
    | 'OUT_OF_CREDITS'
    | 'UNAVAILABLE'
    | 'DISABLED'
  message?: string
}

export type GenerationSession = {
  id: string
  userId: string
  status: GenerationJobStatus
  createdAt: string
  updatedAt: string
  protocol: ProtocolMode
  tone: AgentTone
  generationMode: GenerationMode
  preset?: PresetType
  sharedContext: SharedContext
  totalJobs: number
  completedJobs: number
  failedJobs: number
}

export type GenerationPipelineInput = {
  userId: string
  selectedAgents: AgentType[]
  selectedPreset?: PresetType
  sharedContext: SharedContext
  protocol?: ProtocolMode
  tone?: AgentTone
  generationMode?: GenerationMode
  accessTier?: AccessTier
}

export type GenerationPipelinePreflight = GatingDecision
