import type {
  AgentId,
  EngineeringArtifact,
  EngineeringTask,
  ExecutionStateSnapshot,
  IRuntimeLogger,
  PersistedArtifact,
} from '../orchestrator/types.js'

export type ArtifactKind =
  | 'plan'
  | 'implementation'
  | 'review'
  | 'investigation'
  | 'refactoring'
  | 'release'
  | 'generic'

export interface ArtifactVersion {
  schemaVersion: string
  artifactVersion: number
}

export interface RuntimeArtifactMetadata {
  kind: ArtifactKind
  ownerAgentId: AgentId
  taskId: string
  stateStatus: ExecutionStateSnapshot['status']
  handoffReady: boolean
  createdAt: string
}

export interface RuntimeArtifact extends EngineeringArtifact {
  metadata: RuntimeArtifactMetadata & Record<string, unknown>
}

export interface StoredRuntimeArtifact extends PersistedArtifact {
  metadata: RuntimeArtifactMetadata & {
    version: ArtifactVersion
  } & Record<string, unknown>
}

export type PlanArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'plan' } }
export type ImplementationArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'implementation' } }
export type ReviewArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'review' } }
export type InvestigationArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'investigation' } }
export type RefactoringArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'refactoring' } }
export type ReleaseArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'release' } }
export type GenericArtifact = RuntimeArtifact & { metadata: RuntimeArtifactMetadata & { kind: 'generic' } }

export type ArtifactHandlingResult =
  | {
      kind: 'accepted'
      artifact: StoredRuntimeArtifact
    }
  | {
      kind: 'rejected'
      reason: string
      retryable?: boolean
    }

export interface ArtifactValidationResult {
  valid: boolean
  reason?: string
  retryable?: boolean
}

export interface ArtifactFactoryInput {
  task: EngineeringTask
  agentId: AgentId
  artifact: EngineeringArtifact
  state: ExecutionStateSnapshot
}

export interface IArtifactFactory {
  create(input: ArtifactFactoryInput): Promise<RuntimeArtifact>
}

export interface IArtifactValidator {
  validate(input: {
    task: EngineeringTask
    agentId: AgentId
    artifact: RuntimeArtifact
    state: ExecutionStateSnapshot
  }): Promise<ArtifactValidationResult>
}

export interface IArtifactStore {
  save(input: {
    artifact: RuntimeArtifact
    version: ArtifactVersion
  }): Promise<StoredRuntimeArtifact>
  getById(id: string): Promise<StoredRuntimeArtifact | null>
  listByTaskId(taskId: string): Promise<StoredRuntimeArtifact[]>
}

export interface IArtifactEngine {
  validateAndStore(input: {
    task: EngineeringTask
    agentId: AgentId
    artifact: EngineeringArtifact
    state: ExecutionStateSnapshot
  }): Promise<ArtifactHandlingResult>
  getArtifactById(id: string): Promise<StoredRuntimeArtifact | null>
  listArtifactsByTaskId(taskId: string): Promise<StoredRuntimeArtifact[]>
}

export interface ArtifactEngineDependencies {
  factory: IArtifactFactory
  validator: IArtifactValidator
  store: IArtifactStore
  logger?: IRuntimeLogger
  schemaVersion?: string
}
