import type { AgentConfiguration } from './agent-registry/types.js'

export const ECHO_AGENT_ID = 'echo_agent' as const
export const ECHO_AGENT_PROMPT_ID = 'echo-agent-prompt'
export const ECHO_AGENT_ARTIFACT_TYPE = 'echo_artifact'
export const ECHO_AGENT_CAPABILITY = 'general_chat'

export interface EchoTaskInput {
  message: string
}

export interface EchoArtifactPayload {
  message: string
}

export const ECHO_AGENT_CONFIGURATION: AgentConfiguration = {
  id: ECHO_AGENT_ID,
  capability: ECHO_AGENT_CAPABILITY,
  prompt: ECHO_AGENT_PROMPT_ID,
  artifactType: ECHO_AGENT_ARTIFACT_TYPE,
}
