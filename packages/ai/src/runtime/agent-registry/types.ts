import type { ContextSourceKind } from '../context-loader/types.js'
import type { AgentDefinition } from '../agent-runner/types.js'
import type { AgentId, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'

export interface AgentConfiguration {
  id: AgentId
  capability: string
  prompt: string
  temperature?: number
  contextSources?: ContextSourceKind[]
  artifactType: string
  routingMetadata?: Record<string, unknown>
  allowedStatuses?: ExecutionStateSnapshot['status'][]
  requiredCompletedAgentIds?: AgentId[]
}

export interface IAgentRegistry {
  getAgentById(agentId: AgentId): AgentDefinition
  getAllAgents(): AgentDefinition[]
  hasAgent(agentId: AgentId): boolean
}

export interface AgentRegistryDependencies {
  agents: AgentConfiguration[]
  logger?: IRuntimeLogger
}
