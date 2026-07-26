import type {
  AnthropicExecuteInput,
  AnthropicExecutionOptions,
  AnthropicProviderRequest,
  AnthropicStructuredOutputConfig,
  IAnthropicRequestMapper,
} from './types.js'

const DEFAULT_MODEL = 'claude-sonnet-4-5'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_MAX_TOKENS = 2_048

export class AnthropicRequestMapper implements IAnthropicRequestMapper {
  constructor(
    private readonly defaults: {
      defaultModel?: string
      timeoutMs?: number
      maxRetries?: number
      defaultStreaming?: boolean
      defaultStructuredOutput?: AnthropicStructuredOutputConfig
      defaultMaxTokens?: number
    } = {},
  ) {}

  map(input: AnthropicExecuteInput): AnthropicProviderRequest {
    const promptOptions = getAnthropicOptions(input.prompt.metadata)
    const contextOptions = getAnthropicOptions(input.context.metadata)

    const structuredOutput = resolveStructuredOutput(
      promptOptions.structuredOutput,
      contextOptions.structuredOutput,
      this.defaults.defaultStructuredOutput,
    )

    const executionOptions: AnthropicExecutionOptions = {
      model:
        getStringOption(promptOptions.model) ??
        getStringOption(contextOptions.model) ??
        this.defaults.defaultModel ??
        DEFAULT_MODEL,
      stream:
        getBooleanOption(promptOptions.stream) ??
        getBooleanOption(contextOptions.stream) ??
        this.defaults.defaultStreaming ??
        false,
      timeoutMs:
        getNumberOption(promptOptions.timeoutMs) ??
        getNumberOption(contextOptions.timeoutMs) ??
        this.defaults.timeoutMs ??
        DEFAULT_TIMEOUT_MS,
      maxRetries:
        getNumberOption(promptOptions.maxRetries) ??
        getNumberOption(contextOptions.maxRetries) ??
        this.defaults.maxRetries ??
        DEFAULT_MAX_RETRIES,
      structuredOutput,
      abortSignal: getAbortSignal(promptOptions.abortSignal) ?? getAbortSignal(contextOptions.abortSignal),
      temperature: getNumberOption(promptOptions.temperature) ?? getNumberOption(contextOptions.temperature),
      maxTokens:
        getNumberOption(promptOptions.maxTokens) ??
        getNumberOption(contextOptions.maxTokens) ??
        this.defaults.defaultMaxTokens ??
        DEFAULT_MAX_TOKENS,
      user: getStringOption(promptOptions.user) ?? getStringOption(contextOptions.user),
      metadata: mergeMetadata(promptOptions.metadata, contextOptions.metadata),
    }

    const body = {
      model: executionOptions.model,
      stream: executionOptions.stream,
      max_tokens: executionOptions.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: 'user' as const,
          content: buildUserMessage(input),
        },
      ],
      system: input.prompt.content,
      ...(typeof executionOptions.temperature === 'number' ? { temperature: executionOptions.temperature } : {}),
      ...(executionOptions.user ? { metadata: { user_id: executionOptions.user } } : {}),
      ...(structuredOutput.enabled ? { output_config: { format: { type: 'json_schema' as const, schema: structuredOutput.schema ?? { type: 'object' } } } } : {}),
    }

    return {
      body,
      requestOptions: {
        timeout: executionOptions.timeoutMs,
        signal: executionOptions.abortSignal,
        maxRetries: 0,
      },
      executionOptions,
    }
  }
}

function buildUserMessage(input: AnthropicExecuteInput): string {
  return JSON.stringify(
    {
      task: {
        id: input.task.id,
        description: input.task.description,
        objective: input.task.objective,
        priority: input.task.priority,
        metadata: input.task.metadata,
      },
      agent: {
        id: input.agentDefinition.id,
        artifactType: input.agentDefinition.artifactType,
      },
      state: {
        status: input.state.status,
        currentAgentId: input.state.currentAgentId,
        completedAgentIds: input.state.completedAgentIds,
        finalOutcome: input.state.finalOutcome,
      },
      context: {
        summary: input.context.summary,
        sourceOrder: input.context.sourceOrder,
        task: input.context.task,
        runtimeState: input.context.runtimeState,
        prompt: input.context.prompt,
        canonicalDocuments: input.context.canonicalDocuments,
        repositoryEvidence: input.context.repositoryEvidence,
        priorArtifacts: input.context.priorArtifacts,
        metadata: input.context.metadata,
      },
    },
    null,
    2,
  )
}

function resolveStructuredOutput(
  promptStructuredOutput: unknown,
  contextStructuredOutput: unknown,
  defaultStructuredOutput: AnthropicStructuredOutputConfig | undefined,
): AnthropicStructuredOutputConfig {
  const promptParsed = normalizeStructuredOutput(promptStructuredOutput)
  const contextParsed = normalizeStructuredOutput(contextStructuredOutput)

  return promptParsed ?? contextParsed ?? defaultStructuredOutput ?? { enabled: false }
}

function normalizeStructuredOutput(value: unknown): AnthropicStructuredOutputConfig | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Record<string, unknown>
  return {
    enabled: getBooleanOption(candidate.enabled) ?? true,
    schema: isRecord(candidate.schema) ? candidate.schema : undefined,
  }
}

function getAnthropicOptions(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  const direct = metadata.anthropic
  if (direct && typeof direct === 'object') {
    return direct as Record<string, unknown>
  }

  return metadata
}

function getStringOption(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getNumberOption(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getBooleanOption(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function getAbortSignal(value: unknown): AbortSignal | undefined {
  if (value && typeof value === 'object' && 'aborted' in value) {
    return value as AbortSignal
  }
  return undefined
}

function mergeMetadata(
  promptMetadata: unknown,
  contextMetadata: unknown,
): Record<string, unknown> | undefined {
  const left = isRecord(promptMetadata) ? promptMetadata : {}
  const right = isRecord(contextMetadata) ? contextMetadata : {}
  const merged = {
    ...right,
    ...left,
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
