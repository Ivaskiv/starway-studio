declare module '@ai/prompts/salesPsychologist.claude.prompt.js' {
  export const CLAUDE_SYSTEM_PROMPT: string
}

declare module '@ai/prompts/salesPsychologist.gpt.prompt.js' {
  export const GPT_SYSTEM_PROMPT: string
}

declare module '@ai/prompts/salesPsychologist.gemini.prompt.js' {
  export const GEMINI_SYSTEM_PROMPT: string
}

declare module '@ai/types/salesAssistant.types.js' {
  export type ModelProvider = 'claude' | 'gpt' | 'gemini'

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

  export function resolveModel(ct: ContentType): ModelProvider

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
}
