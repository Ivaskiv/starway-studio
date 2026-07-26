import { buildAiUsageEstimate, calculateAiCostUsd } from './pricing.js'
import type { AIProviderResponse } from '../runtime/agent-runner/types.js'
import type { AgentDefinition } from '../runtime/agent-runner/types.js'
import type { EngineeringTask } from '../runtime/orchestrator/types.js'

export interface UsageLedgerEntry {
  provider: string
  model: string
  agent: string
  task: string
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  latency: number
  estimatedCost: number
  actualCost: number
  timestamp: string
  user: string | null
}

export interface UsageLedgerExecutionInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  promptText: string
  contextText: string
  providerResponse: AIProviderResponse
  latencyMs: number
  timestamp?: Date
}

export interface IUsageLedgerStore {
  append(entry: UsageLedgerEntry): Promise<void>
  list(): Promise<UsageLedgerEntry[]>
}

export interface IUsageLedger {
  recordExecution(input: UsageLedgerExecutionInput): Promise<UsageLedgerEntry>
}

export class InMemoryUsageLedgerStore implements IUsageLedgerStore {
  private readonly entries: UsageLedgerEntry[] = []

  async append(entry: UsageLedgerEntry): Promise<void> {
    this.entries.push(entry)
  }

  async list(): Promise<UsageLedgerEntry[]> {
    return [...this.entries]
  }
}

export class UsageLedger implements IUsageLedger {
  constructor(private readonly store: IUsageLedgerStore) {}

  async recordExecution(input: UsageLedgerExecutionInput): Promise<UsageLedgerEntry> {
    const metadata = normalizeMetadata(input.providerResponse.metadata)
    const provider = metadata.provider ?? 'unknown'
    const model = metadata.model ?? 'unknown'
    const usage = normalizeTokenUsage(metadata.tokenUsage)
    const estimate = buildAiUsageEstimate({
      model,
      promptText: input.promptText,
      userText: input.contextText,
      maxOutputTokens: usage.outputTokens,
    })

    const entry: UsageLedgerEntry = {
      provider,
      model,
      agent: input.agentDefinition.id,
      task: input.task.id,
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      latency: input.latencyMs,
      estimatedCost: estimate.estimatedCostUsd,
      actualCost: calculateAiCostUsd(model, usage.inputTokens, usage.outputTokens),
      timestamp: (input.timestamp ?? new Date()).toISOString(),
      user: resolveUserId(input.task.metadata),
    }

    await this.store.append(entry)
    return entry
  }
}

function normalizeMetadata(metadata: AIProviderResponse['metadata']): {
  provider?: string
  model?: string
  tokenUsage?: Record<string, unknown>
} {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  return metadata as {
    provider?: string
    model?: string
    tokenUsage?: Record<string, unknown>
  }
}

function normalizeTokenUsage(tokenUsage: Record<string, unknown> | undefined): {
  inputTokens: number
  outputTokens: number
  cachedTokens: number
} {
  if (!tokenUsage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    }
  }

  return {
    inputTokens: readNumber(tokenUsage, ['inputTokens']) ?? 0,
    outputTokens: readNumber(tokenUsage, ['outputTokens']) ?? 0,
    cachedTokens:
      readNumber(tokenUsage, [
        'cachedTokens',
        'cachedInputTokens',
        'cachedContentTokens',
        'cacheReadInputTokens',
        'cacheCreationInputTokens',
      ]) ?? 0,
  }
}

function readNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

function resolveUserId(metadata: EngineeringTask['metadata']): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const directUserId = metadata.userId
  if (typeof directUserId === 'string' && directUserId.length > 0) {
    return directUserId
  }

  const nestedUser = metadata.user
  if (nestedUser && typeof nestedUser === 'object' && typeof (nestedUser as { id?: unknown }).id === 'string') {
    return (nestedUser as { id: string }).id
  }

  return null
}
