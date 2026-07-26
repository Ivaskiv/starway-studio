import type { AgentConfiguration } from './agent-registry/types.js'

export const MENTOR_AGENT_ID = 'mentor_agent' as const
export const MENTOR_AGENT_PROMPT_ID = 'mentor-agent-prompt'
export const MENTOR_RESPONSE_ARTIFACT_TYPE = 'mentor_response_artifact'
export const MENTOR_AGENT_CAPABILITY = 'mentoring'

export interface MentorTaskInput {
  userMessage: string
  userContext: {
    profile: Record<string, unknown>
    subscription: Record<string, unknown>
    progress: Record<string, unknown>
  }
  conversationContext: {
    history: string[]
    journal: string[]
  }
  goals: string[]
  wheel: Record<string, unknown>
}

export interface MentorResponseArtifactPayload {
  response: string
  suggestions: string[]
  followUp: string
  provider: string
  model: string
  tokensUsed: number
}

export const MENTOR_AGENT_CONFIGURATION: AgentConfiguration = {
  id: MENTOR_AGENT_ID,
  capability: MENTOR_AGENT_CAPABILITY,
  prompt: MENTOR_AGENT_PROMPT_ID,
  artifactType: MENTOR_RESPONSE_ARTIFACT_TYPE,
}
