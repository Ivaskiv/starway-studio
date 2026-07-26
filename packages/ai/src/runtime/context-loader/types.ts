import type { EngineeringArtifact } from '../orchestrator/types.js'
import type { AgentDefinition, ResolvedPrompt } from '../agent-runner/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'

export type ContextSourceKind =
  | 'task'
  | 'runtime_state'
  | 'prompt'
  | 'documentation'
  | 'artifacts'
  | 'repository'

export interface RuntimeContext {
  summary: string
  sourceOrder: ContextSourceKind[]
  task?: {
    id: string
    description: string
    objective: string
    priority?: EngineeringTask['priority']
    metadata?: Record<string, unknown>
  }
  runtimeState?: {
    status: ExecutionStateSnapshot['status']
    currentAgentId: ExecutionStateSnapshot['currentAgentId']
    completedAgentIds: ExecutionStateSnapshot['completedAgentIds']
    finalOutcome?: ExecutionStateSnapshot['finalOutcome']
  }
  prompt?: {
    id: string
    version: string
  }
  canonicalDocuments?: string[]
  repositoryEvidence?: string[]
  priorArtifacts?: EngineeringArtifact[]
  metadata?: Record<string, unknown>
}

export type LoadedExecutionContext = RuntimeContext

export interface ContextContribution {
  source: ContextSourceKind
  summaryFragment?: string
  task?: RuntimeContext['task']
  runtimeState?: RuntimeContext['runtimeState']
  prompt?: RuntimeContext['prompt']
  canonicalDocuments?: string[]
  repositoryEvidence?: string[]
  priorArtifacts?: EngineeringArtifact[]
  metadata?: Record<string, unknown>
}

export interface ContextProviderInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
}

export interface ContextValidationResult {
  valid: boolean
  reason?: string
  missingSources?: ContextSourceKind[]
}

export interface IContextLoader {
  loadContext(input: ContextProviderInput): Promise<RuntimeContext>
}

export interface IContextProvider {
  readonly source: ContextSourceKind
  provide(input: ContextProviderInput): Promise<ContextContribution | null>
}

export interface IContextMerger {
  merge(input: {
    contributions: ContextContribution[]
    priorityOrder: ContextSourceKind[]
  }): Promise<RuntimeContext>
}

export interface IContextValidator {
  validate(input: {
    context: RuntimeContext
    requiredSources: ContextSourceKind[]
    agentDefinition: AgentDefinition
    task: EngineeringTask
    state: ExecutionStateSnapshot
  }): Promise<ContextValidationResult>
}

export interface ContextLoaderDependencies {
  providers: IContextProvider[]
  merger: IContextMerger
  validator: IContextValidator
  logger?: IRuntimeLogger
}

export const DEFAULT_CONTEXT_SOURCE_PRIORITY: ContextSourceKind[] = [
  'task',
  'runtime_state',
  'prompt',
  'documentation',
  'artifacts',
  'repository',
]

export const DEFAULT_REQUIRED_CONTEXT_SOURCES: ContextSourceKind[] = [
  'task',
  'runtime_state',
  'prompt',
]
