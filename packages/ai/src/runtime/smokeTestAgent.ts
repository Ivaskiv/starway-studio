import type { AgentConfiguration } from './agent-registry/types.js'

export const SMOKE_TEST_AGENT_ID = 'smoke_test' as const
export const SMOKE_TEST_PROMPT_ID = 'smoke-test-prompt'
export const SMOKE_TEST_ARTIFACT_TYPE = 'smoke_test_artifact'
export const SMOKE_TEST_CAPABILITY = 'smoke_test'

export type SmokeTestTaskInput = Record<string, never>

export interface SmokeTestArtifactPayload {
  result: 'OK'
}

export const SMOKE_TEST_AGENT_CONFIGURATION: AgentConfiguration = {
  id: SMOKE_TEST_AGENT_ID,
  capability: SMOKE_TEST_CAPABILITY,
  prompt: SMOKE_TEST_PROMPT_ID,
  artifactType: SMOKE_TEST_ARTIFACT_TYPE,
}
