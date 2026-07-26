import type { AgentConfiguration } from './agent-registry/types.js'

export const CLASSIFICATION_AGENT_ID = 'classification_agent' as const
export const CLASSIFICATION_AGENT_PROMPT_ID = 'classification-agent-prompt'
export const CLASSIFICATION_ARTIFACT_TYPE = 'classification_artifact'
export const CLASSIFICATION_AGENT_CAPABILITY = 'classification'

export interface ClassificationTaskInput {
  text: string
  categories: string[]
  instructions?: string
}

export interface ClassificationArtifactPayload {
  category: string
  confidence: number
  provider: string
  model: string
  tokensUsed: number
}

export const CLASSIFICATION_AGENT_CONFIGURATION: AgentConfiguration = {
  id: CLASSIFICATION_AGENT_ID,
  capability: CLASSIFICATION_AGENT_CAPABILITY,
  prompt: CLASSIFICATION_AGENT_PROMPT_ID,
  artifactType: CLASSIFICATION_ARTIFACT_TYPE,
}
