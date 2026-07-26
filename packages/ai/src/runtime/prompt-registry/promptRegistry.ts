import {
  PromptCompatibilityError,
  PromptDeprecatedError,
  PromptMetadataValidationError,
  PromptNotFoundError,
  PromptOwnershipConflictError,
} from './errors.js'
import type {
  IPromptRegistry,
  PromptInfo,
  PromptLookupContext,
  PromptRegistryDependencies,
  PromptSourceDefinition,
  ResolvePromptByIdInput,
  ResolvedPrompt,
} from './types.js'
import type { AgentId, IRuntimeLogger } from '../orchestrator/types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class PromptRegistry implements IPromptRegistry {
  private readonly logger: IRuntimeLogger
  private readonly sourcesByPromptId: ReadonlyMap<string, PromptSourceDefinition[]>
  private readonly canonicalPromptIdsByAgentId: ReadonlyMap<AgentId, Set<string>>

  constructor(private readonly deps: PromptRegistryDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    validatePromptSources(deps.sources)
    this.sourcesByPromptId = indexSourcesByPromptId(deps.sources)
    this.canonicalPromptIdsByAgentId = indexCanonicalPromptIdsByAgentId(deps.sources)
  }

  async resolvePrompt(input: PromptLookupContext): Promise<ResolvedPrompt> {
    const canonicalPromptIds = this.canonicalPromptIdsByAgentId.get(input.agentDefinition.id) ?? new Set<string>()
    if (canonicalPromptIds.size > 1) {
      throw new PromptOwnershipConflictError(input.agentDefinition.id, [...canonicalPromptIds])
    }

    const prompt = await this.resolvePromptById({ promptId: input.agentDefinition.promptId })
    const matchingSource = this.findSource(prompt.id, prompt.version)

    if (!matchingSource.ownerAgentIds.includes(input.agentDefinition.id)) {
      throw new PromptCompatibilityError(
        `Prompt '${prompt.id}' version '${prompt.version}' is not owned by agent '${input.agentDefinition.id}'.`,
      )
    }

    this.logger.info('prompt_registry.prompt_resolved_for_agent', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      promptId: prompt.id,
      promptVersion: prompt.version,
    })

    return prompt
  }

  async resolvePromptById(input: ResolvePromptByIdInput): Promise<ResolvedPrompt> {
    const source = this.selectSource(input)
    const cacheKey = buildCacheKey(source.id, source.version)

    const cached = await this.deps.cache.get(cacheKey)
    if (cached) {
      this.logger.debug('prompt_registry.cache_hit', {
        promptId: source.id,
        promptVersion: source.version,
      })
      return toResolvedPrompt(cached)
    }

    this.logger.debug('prompt_registry.cache_miss', {
      promptId: source.id,
      promptVersion: source.version,
    })

    const content = await this.deps.loader.load({ source })
    const record = {
      id: source.id,
      version: source.version,
      content,
      metadata: {
        filePath: source.filePath,
        ...source.metadata,
      },
      ownerAgentIds: source.ownerAgentIds,
      canonical: source.canonical,
      deprecated: source.deprecated ?? false,
    }

    await this.deps.cache.set(cacheKey, record)
    this.logger.info('prompt_registry.prompt_loaded', {
      promptId: source.id,
      promptVersion: source.version,
    })

    return toResolvedPrompt(record)
  }

  async getPromptInfo(promptId: string): Promise<PromptInfo> {
    const sources = this.sourcesByPromptId.get(promptId)
    if (!sources?.length) {
      throw new PromptNotFoundError(promptId)
    }

    const defaultSource = pickDefaultSource(sources)
    return {
      id: promptId,
      availableVersions: sources.map((source) => source.version),
      defaultVersion: defaultSource.version,
      ownerAgentIds: [...new Set(sources.flatMap((source) => source.ownerAgentIds))],
      canonical: sources.some((source) => source.canonical),
    }
  }

  private selectSource(input: ResolvePromptByIdInput): PromptSourceDefinition {
    const sources = this.sourcesByPromptId.get(input.promptId)
    if (!sources?.length) {
      throw new PromptNotFoundError(input.promptId, input.version)
    }

    const source = input.version
      ? sources.find((candidate) => candidate.version === input.version)
      : pickDefaultSource(sources)

    if (!source) {
      throw new PromptNotFoundError(input.promptId, input.version)
    }

    if (source.deprecated) {
      throw new PromptDeprecatedError(source.id, source.version)
    }

    return source
  }

  private findSource(promptId: string, version: string): PromptSourceDefinition {
    const sources = this.sourcesByPromptId.get(promptId)
    const source = sources?.find((candidate) => candidate.version === version)
    if (!source) {
      throw new PromptNotFoundError(promptId, version)
    }
    return source
  }
}

function validatePromptSources(sources: PromptSourceDefinition[]): void {
  const seenVersionKeys = new Set<string>()
  const defaultCountByPromptId = new Map<string, number>()

  for (const source of sources) {
    if (!source.id.trim()) {
      throw new PromptMetadataValidationError('Prompt source id is required.')
    }
    if (!source.version.trim()) {
      throw new PromptMetadataValidationError(`Prompt '${source.id}' is missing a version.`)
    }
    if (!source.filePath.trim()) {
      throw new PromptMetadataValidationError(`Prompt '${source.id}' version '${source.version}' is missing a file path.`)
    }
    if (!source.ownerAgentIds.length) {
      throw new PromptMetadataValidationError(`Prompt '${source.id}' version '${source.version}' must own at least one agent role.`)
    }

    const key = buildCacheKey(source.id, source.version)
    if (seenVersionKeys.has(key)) {
      throw new PromptMetadataValidationError(`Duplicate prompt source detected for '${source.id}' version '${source.version}'.`)
    }
    seenVersionKeys.add(key)

    if (source.defaultVersion) {
      defaultCountByPromptId.set(source.id, (defaultCountByPromptId.get(source.id) ?? 0) + 1)
    }

    if (source.defaultVersion && source.deprecated) {
      throw new PromptMetadataValidationError(
        `Prompt '${source.id}' version '${source.version}' cannot be both default and deprecated.`,
      )
    }
  }

  for (const [promptId, count] of defaultCountByPromptId.entries()) {
    if (count > 1) {
      throw new PromptMetadataValidationError(`Prompt '${promptId}' has multiple default versions.`)
    }
  }

  for (const [promptId, promptSources] of indexSourcesByPromptId(sources).entries()) {
    if (promptSources.length > 1 && !promptSources.some((source) => source.defaultVersion)) {
      throw new PromptMetadataValidationError(`Prompt '${promptId}' has multiple versions but no default version.`)
    }
  }
}

function indexSourcesByPromptId(sources: PromptSourceDefinition[]): ReadonlyMap<string, PromptSourceDefinition[]> {
  const grouped = new Map<string, PromptSourceDefinition[]>()
  for (const source of sources) {
    const existing = grouped.get(source.id) ?? []
    existing.push(source)
    grouped.set(source.id, existing)
  }
  return grouped
}

function indexCanonicalPromptIdsByAgentId(
  sources: PromptSourceDefinition[],
): ReadonlyMap<AgentId, Set<string>> {
  const grouped = new Map<AgentId, Set<string>>()

  for (const source of sources) {
    if (!source.canonical || source.deprecated) {
      continue
    }

    for (const agentId of source.ownerAgentIds) {
      const promptIds = grouped.get(agentId) ?? new Set<string>()
      promptIds.add(source.id)
      grouped.set(agentId, promptIds)
    }
  }

  return grouped
}

function pickDefaultSource(sources: PromptSourceDefinition[]): PromptSourceDefinition {
  return sources.find((source) => source.defaultVersion) ?? sources[0]
}

function buildCacheKey(promptId: string, version: string): string {
  return `${promptId}@${version}`
}

function toResolvedPrompt(record: {
  id: string
  version: string
  content: string
  metadata?: Record<string, unknown>
}): ResolvedPrompt {
  return {
    id: record.id,
    version: record.version,
    content: record.content,
    metadata: record.metadata,
  }
}
