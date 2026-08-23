import type { AgentDefinition, IPromptRegistry, ResolvedPrompt } from '../agent-runner/types.js'
import type { AgentId, EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'

export type { IPromptRegistry, ResolvedPrompt }

export type PromptSourceOwnerId = AgentId | (string & {})

export interface PromptSourceDefinition {
  id: string
  version: string
  filePath: string
  ownerAgentIds: PromptSourceOwnerId[]
  canonical: boolean
  deprecated?: boolean
  defaultVersion?: boolean
  metadata?: Record<string, unknown>
}

export interface PromptLoaderInput {
  source: PromptSourceDefinition
}

export interface PromptCacheRecord extends ResolvedPrompt {
  ownerAgentIds: PromptSourceOwnerId[]
  canonical: boolean
  deprecated: boolean
}

export interface ResolvePromptByIdInput {
  promptId: string
  version?: string
}

export interface PromptInfo {
  id: string
  availableVersions: string[]
  defaultVersion: string
  ownerAgentIds: PromptSourceOwnerId[]
  canonical: boolean
}

export interface IPromptLoader {
  load(input: PromptLoaderInput): Promise<string>
}

export interface IPromptCache {
  get(key: string): Promise<PromptCacheRecord | null>
  set(key: string, value: PromptCacheRecord): Promise<void>
  clear(): Promise<void>
}

export interface PromptRegistryDependencies {
  sources: PromptSourceDefinition[]
  loader: IPromptLoader
  cache: IPromptCache
  logger?: IRuntimeLogger
}

export interface PromptLookupContext {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
}
