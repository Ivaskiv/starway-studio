import type { AgentConfiguration } from './agent-registry/types.js'

export const SUMMARIZER_AGENT_ID = 'summarizer_agent' as const
export const SUMMARIZER_AGENT_PROMPT_ID = 'summarizer-agent-prompt'
export const SUMMARY_ARTIFACT_TYPE = 'summary_artifact'
export const SUMMARIZER_AGENT_CAPABILITY = 'summarization'

export interface SummarizeTaskInput {
  text: string
  language: string
  maxLength: number
}

export interface SummaryArtifactPayload {
  summary: string
  tokensUsed: number
  model: string
  provider: string
}

export const SUMMARIZER_AGENT_CONFIGURATION: AgentConfiguration = {
  id: SUMMARIZER_AGENT_ID,
  capability: SUMMARIZER_AGENT_CAPABILITY,
  prompt: SUMMARIZER_AGENT_PROMPT_ID,
  artifactType: SUMMARY_ARTIFACT_TYPE,
}
