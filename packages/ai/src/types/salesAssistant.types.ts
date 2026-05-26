import { AiCostTelemetry } from "../providers/pricing.js"

export enum ContentType {
  WARMUP_1DAY    = 'WARMUP_1DAY',
  WARMUP_3DAYS   = 'WARMUP_3DAYS',
  WARMUP_WEEK    = 'WARMUP_WEEK',
  WARMUP_LAUNCH  = 'WARMUP_LAUNCH',
  REELS_SCENARIO = 'REELS_SCENARIO',
  WEBINAR_SALES  = 'WEBINAR_SALES',
  LIVE_STRUCTURE = 'LIVE_STRUCTURE',
  BLOG_IDEAS     = 'BLOG_IDEAS',
  CONTENT_AUDIT  = 'CONTENT_AUDIT',
  CUSTOM         = 'CUSTOM',
  STORIES_CHECK  = 'STORIES_CHECK',
}

export type ModelProvider = 'claude' | 'gpt' | 'gemini'

export type CostTier = 'low' | 'medium' | 'high'

export interface GenerationUsage {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  actualCostUsd: number | null
  costTier: CostTier
  cacheHit?: boolean
}

export function resolveModel(_ct: ContentType): ModelProvider {
  return 'gpt'
}

export type GenerateRequest = {
  contentType: string
  selectedProtocol: string
  selectedOutputs: string[]
  userContext: string
  userRequest: string
  provider?: ModelProvider          
  providers?: ModelProvider[]       
  enabledModels?: ModelProvider[]   
}
export interface GenerationResult {
  id:          string
  content:     string
  modelUsed:   ModelProvider
  contentType: ContentType
  protocol:    string
  tokensUsed:  number
  usage?:      GenerationUsage
  validationWarning?: string
  createdAt:   string
  multiModelResults?: ModelGenerationResult[]
}

export type ModelGenerationResult = {
  modelKey: ModelProvider
  content: string | null
  usage: AiCostTelemetry | null
  error: {
    status: number
    code: string
    message: string        // людське повідомлення для UI
    isFatal: boolean       // true = ключ відсутній, false = quota/rate
  } | null
  durationMs: number
}

export type MultiModelGenerationResponse = {
  results: ModelGenerationResult[]
  totalDurationMs: number
  requestId: string
}
export interface AiAssistantProfile {
  id: string
  systemAnchor?: string
  supportedProtocols?: Record<string, unknown>
  supportedOutputs?: string[]
}

export interface AiAssistantWorkspace {
  id: string
  isActive: boolean
  usedTokensThisMonth: number
  maxTokensPerMonth: number
  activeProfile: AiAssistantProfile | null
}

export interface UpdateWorkspaceRequest {
  activeProfileId?: string
  isActive?: boolean
}
