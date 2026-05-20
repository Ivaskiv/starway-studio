export enum ContentType {
  WARMUP_1DAY    = 'WARMUP_1DAY',
  WARMUP_3DAYS   = 'WARMUP_3DAYS',
  WARMUP_WEEK    = 'WARMUP_WEEK',
  WARMUP_LAUNCH  = 'WARMUP_LAUNCH',
  REELS_SCENARIO = 'REELS_SCENARIO',
  WEBINAR_SALES  = 'WEBINAR_SALES',
  LIVE_STRUCTURE = 'LIVE_STRUCTURE',
  BLOG_IDEAS     = 'BLOG_IDEAS',
  CUSTOM         = 'CUSTOM',
  STORIES_CHECK  = 'STORIES_CHECK',
}

export type ModelProvider = 'claude' | 'gpt' | 'gemini'

export function resolveModel(ct: ContentType): ModelProvider {
  if (ct === ContentType.STORIES_CHECK) return 'gemini'
  if (ct === ContentType.BLOG_IDEAS || ct === ContentType.CUSTOM) return 'claude'
  return 'gpt'
}

export interface GenerateRequest {
  contentType:      ContentType
  selectedProtocol: string
  selectedOutputs:  string[]
  userContext:      string
  userRequest:      string
}

export interface GenerationResult {
  id:          string
  content:     string
  modelUsed:   ModelProvider
  contentType: ContentType
  protocol:    string
  tokensUsed:  number
  validationWarning?: string
  createdAt:   string
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
