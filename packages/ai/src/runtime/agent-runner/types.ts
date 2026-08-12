import type {
  AgentId,
  AgentRunInput,
  AgentRunResult,
  EngineeringArtifact,
  EngineeringTask,
  ExecutionStateSnapshot,
  IAgentRunner,
  IRuntimeLogger,
} from '../orchestrator/types.js'
import type { IContextLoader, LoadedExecutionContext } from '../context-loader/types.js'
import type { IUsageLedger } from '../../providers/usageLedger.js'
import type { ModelStrategyTier } from '../../providers/models.js'

export type { AgentRunInput, AgentRunResult, IAgentRunner, IContextLoader, LoadedExecutionContext }

export type AgentProviderId = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter'

export interface AgentDefinition {
  id: AgentId
  promptId: string
  artifactType: string
  provider?: AgentProviderId
  model?: string
  temperature?: number
  routingMetadata?: Record<string, unknown>
  allowedStatuses?: ExecutionStateSnapshot['status'][]
  requiredCompletedAgentIds?: AgentId[]
  requiredContextSources?: import('../context-loader/types.js').ContextSourceKind[]
}

export interface PromptExecutionMetadata {
  // `content` remains the canonical system instruction; these fields preserve
  // separated user input and routing metadata for provider adapters.
  userPrompt?: string
  strategyTier?: ModelStrategyTier
  contentType?: string
}

export interface PromptMetadata extends Record<string, unknown> {
  execution?: PromptExecutionMetadata
}

export interface ResolvedPrompt {
  id: string
  version: string
  content: string
  metadata?: PromptMetadata
}

export interface AIProviderResponse {
  content?: string
  structuredOutput?: Record<string, unknown>
  notes?: string[]
  metadata?: Record<string, unknown>
}

export interface ArtifactValidationResult {
  valid: boolean
  reason?: string
  notes?: string[]
}

export interface IPromptRegistry {
  resolvePrompt(input: {
    agentDefinition: AgentDefinition
    task: EngineeringTask
    state: ExecutionStateSnapshot
  }): Promise<ResolvedPrompt>
}

export interface IAIProvider {
  execute(input: {
    agentDefinition: AgentDefinition
    task: EngineeringTask
    state: ExecutionStateSnapshot
    prompt: ResolvedPrompt
    context: LoadedExecutionContext
  }): Promise<AIProviderResponse>
}

export interface IArtifactFactory {
  createArtifact(input: {
    agentDefinition: AgentDefinition
    task: EngineeringTask
    state: ExecutionStateSnapshot
    prompt: ResolvedPrompt
    context: LoadedExecutionContext
    providerResponse: AIProviderResponse
  }): Promise<EngineeringArtifact>
}

export interface IArtifactValidator {
  validate(input: {
    agentDefinition: AgentDefinition
    task: EngineeringTask
    state: ExecutionStateSnapshot
    artifact: EngineeringArtifact
    providerResponse: AIProviderResponse
  }): Promise<ArtifactValidationResult>
}

export interface AgentRunnerDependencies {
  agentDefinitions: AgentDefinition[] | Partial<Record<AgentId, AgentDefinition>>
  promptRegistry: IPromptRegistry
  contextLoader: IContextLoader
  aiProvider: IAIProvider
  artifactFactory: IArtifactFactory
  artifactValidator: IArtifactValidator
  usageLedger?: IUsageLedger
  logger?: IRuntimeLogger
}
