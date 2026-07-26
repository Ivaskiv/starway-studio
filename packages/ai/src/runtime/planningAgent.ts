import type { AgentConfiguration } from './agent-registry/types.js'

export const PLANNING_AGENT_ID = 'planning_agent' as const
export const PLANNING_AGENT_PROMPT_ID = 'planning-agent-prompt'
export const PLAN_ARTIFACT_TYPE = 'plan_artifact'
export const PLANNING_AGENT_CAPABILITY = 'planning'

export interface PlanningTaskInput {
  goal: string
  constraints: string[]
  history?: string[]
  context?: string
}

export interface PlanArtifactPayload {
  steps: string[]
  assumptions: string[]
  risks: string[]
  provider: string
  model: string
}

export const PLANNING_AGENT_CONFIGURATION: AgentConfiguration = {
  id: PLANNING_AGENT_ID,
  capability: PLANNING_AGENT_CAPABILITY,
  prompt: PLANNING_AGENT_PROMPT_ID,
  artifactType: PLAN_ARTIFACT_TYPE,
}
