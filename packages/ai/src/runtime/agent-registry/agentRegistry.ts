import type { ContextSourceKind } from '../context-loader/types.js'
import { DEFAULT_REQUIRED_CONTEXT_SOURCES } from '../context-loader/types.js'
import type { AgentDefinition } from '../agent-runner/types.js'
import type { AgentId, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'
import {
  AgentRegistrationValidationError,
  AgentRegistryLookupError,
} from './errors.js'
import type {
  AgentConfiguration,
  AgentRegistryDependencies,
  IAgentRegistry,
} from './types.js'

const VALID_CONTEXT_SOURCES = new Set<ContextSourceKind>([
  'task',
  'runtime_state',
  'prompt',
  'documentation',
  'artifacts',
  'repository',
])
const VALID_STATUSES = new Set<ExecutionStateSnapshot['status']>([
  'initialized',
  'running',
  'awaiting_approval',
  'blocked',
  'failed',
  'completed',
])

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class AgentRegistry implements IAgentRegistry {
  private readonly logger: IRuntimeLogger
  private readonly agentsById: ReadonlyMap<AgentId, AgentDefinition>

  constructor(deps: AgentRegistryDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.agentsById = buildAgentIndex(deps.agents)

    this.logger.info('agent_registry.initialized', {
      agentCount: this.agentsById.size,
      agentIds: Array.from(this.agentsById.keys()),
    })
  }

  getAgentById(agentId: AgentId): AgentDefinition {
    const definition = this.agentsById.get(agentId)
    if (!definition) {
      throw new AgentRegistryLookupError(`Agent '${agentId}' is not registered.`)
    }
    return definition
  }

  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agentsById.values())
  }

  hasAgent(agentId: AgentId): boolean {
    return this.agentsById.has(agentId)
  }
}

function buildAgentIndex(agents: AgentConfiguration[]): ReadonlyMap<AgentId, AgentDefinition> {
  const index = new Map<AgentId, AgentDefinition>()

  for (const agent of agents) {
    validateAgentConfiguration(agent)

    if (index.has(agent.id)) {
      throw new AgentRegistrationValidationError(
        `Duplicate agent id '${agent.id}' is not allowed.`,
      )
    }

    index.set(agent.id, toAgentDefinition(agent))
  }

  return index
}

function toAgentDefinition(agent: AgentConfiguration): AgentDefinition {
  return {
    id: agent.id,
    promptId: agent.prompt.trim(),
    temperature: agent.temperature,
    requiredContextSources: normalizeContextSources(agent.contextSources),
    artifactType: agent.artifactType.trim(),
    routingMetadata: agent.routingMetadata,
    allowedStatuses: normalizeAllowedStatuses(agent.allowedStatuses),
    requiredCompletedAgentIds: normalizeRequiredCompletedAgentIds(agent),
  }
}

function validateAgentConfiguration(agent: AgentConfiguration): void {
  if (!agent.id) {
    throw new AgentRegistrationValidationError('Agent id is required.')
  }

  if (!agent.capability?.trim()) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' must define a non-empty capability.`,
    )
  }

  if (!agent.prompt?.trim()) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' must define a non-empty prompt id.`,
    )
  }

  if (!agent.artifactType?.trim()) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' must define a non-empty artifact type.`,
    )
  }

  if (
    typeof agent.temperature !== 'undefined'
    && (!Number.isFinite(agent.temperature) || agent.temperature < 0 || agent.temperature > 2)
  ) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' temperature must be a finite number between 0 and 2.`,
    )
  }

  if (typeof agent.routingMetadata !== 'undefined' && !isRecord(agent.routingMetadata)) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' routingMetadata must be an object.`,
    )
  }

  for (const source of agent.contextSources ?? []) {
    if (!VALID_CONTEXT_SOURCES.has(source)) {
      throw new AgentRegistrationValidationError(
        `Agent '${agent.id}' references unsupported context source '${source}'.`,
      )
    }
  }

  for (const status of agent.allowedStatuses ?? []) {
    if (!VALID_STATUSES.has(status)) {
      throw new AgentRegistrationValidationError(
        `Agent '${agent.id}' references unsupported execution status '${status}'.`,
      )
    }
  }

  const prerequisites = agent.requiredCompletedAgentIds ?? []
  if (prerequisites.includes(agent.id)) {
    throw new AgentRegistrationValidationError(
      `Agent '${agent.id}' cannot require itself as a prerequisite.`,
    )
  }
}

function normalizeContextSources(contextSources: AgentConfiguration['contextSources']): ContextSourceKind[] {
  return contextSources?.length ? Array.from(new Set(contextSources)) : [...DEFAULT_REQUIRED_CONTEXT_SOURCES]
}

function normalizeAllowedStatuses(
  statuses: AgentConfiguration['allowedStatuses'],
): ExecutionStateSnapshot['status'][] | undefined {
  return statuses?.length ? Array.from(new Set(statuses)) : undefined
}

function normalizeRequiredCompletedAgentIds(
  agent: AgentConfiguration,
): AgentId[] | undefined {
  const prerequisites = agent.requiredCompletedAgentIds?.length
    ? Array.from(new Set(agent.requiredCompletedAgentIds))
    : undefined

  return prerequisites
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
