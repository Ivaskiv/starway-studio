import type { AgentConfiguration } from './agent-registry/types.js'

export const EXTRACTION_AGENT_ID = 'extraction_agent' as const
export const EXTRACTION_AGENT_PROMPT_ID = 'extraction-agent-prompt'
export const EXTRACTION_ARTIFACT_TYPE = 'extraction_artifact'
export const EXTRACTION_AGENT_CAPABILITY = 'structured_extraction'

export interface ExtractionTaskInput {
  text: string
  schema: Record<string, unknown>
  rules?: string[]
}

export interface ExtractionArtifactPayload {
  data: Record<string, unknown>
  provider: string
  model: string
  tokensUsed: number
}

export const EXTRACTION_AGENT_CONFIGURATION: AgentConfiguration = {
  id: EXTRACTION_AGENT_ID,
  capability: EXTRACTION_AGENT_CAPABILITY,
  prompt: EXTRACTION_AGENT_PROMPT_ID,
  artifactType: EXTRACTION_ARTIFACT_TYPE,
}
