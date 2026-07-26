import type {
  IOpenRouterRequestMapper,
  OpenRouterExecuteInput,
  OpenRouterExecutionOptions,
  OpenRouterProviderRequest,
  OpenRouterRoutingConfig,
  OpenRouterStructuredOutputConfig,
} from './types.js'

const DEFAULT_MODEL = 'openai/gpt-4.1-mini'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2

export class OpenRouterRequestMapper implements IOpenRouterRequestMapper {
  constructor(
    private readonly defaults: {
      defaultModel?: string
      timeoutMs?: number
      maxRetries?: number
      defaultStreaming?: boolean
      defaultStructuredOutput?: OpenRouterStructuredOutputConfig
      routing?: OpenRouterRoutingConfig
      requestHeaders?: Record<string, string>
    } = {},
  ) {}

  map(input: OpenRouterExecuteInput): OpenRouterProviderRequest {
    const promptOptions = getOpenRouterOptions(input.prompt.metadata)
    const contextOptions = getOpenRouterOptions(input.context.metadata)

    const structuredOutput = resolveStructuredOutput(
      promptOptions.structuredOutput,
      contextOptions.structuredOutput,
      this.defaults.defaultStructuredOutput,
    )

    const route = getStringOption(promptOptions.route)
      ?? getStringOption(contextOptions.route)
      ?? this.defaults.routing?.defaultRoute

    const resolvedModel = resolveModel({
      route,
      explicitModel: getStringOption(promptOptions.model) ?? getStringOption(contextOptions.model),
      routing: this.defaults.routing,
      defaultModel: this.defaults.defaultModel,
    })

    const executionOptions: OpenRouterExecutionOptions = {
      model: resolvedModel,
      route,
      stream: getBooleanOption(promptOptions.stream) ?? getBooleanOption(contextOptions.stream) ?? this.defaults.defaultStreaming ?? false,
      timeoutMs: getNumberOption(promptOptions.timeoutMs) ?? getNumberOption(contextOptions.timeoutMs) ?? this.defaults.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: getNumberOption(promptOptions.maxRetries) ?? getNumberOption(contextOptions.maxRetries) ?? this.defaults.maxRetries ?? DEFAULT_MAX_RETRIES,
      structuredOutput,
      abortSignal: getAbortSignal(promptOptions.abortSignal) ?? getAbortSignal(contextOptions.abortSignal),
      temperature: getNumberOption(promptOptions.temperature) ?? getNumberOption(contextOptions.temperature),
      maxTokens: getNumberOption(promptOptions.maxTokens) ?? getNumberOption(contextOptions.maxTokens),
      user: getStringOption(promptOptions.user) ?? getStringOption(contextOptions.user),
      metadata: mergeMetadata(promptOptions.metadata, contextOptions.metadata),
    }

    const body = {
      model: executionOptions.model,
      stream: executionOptions.stream,
      messages: [
        {
          role: 'developer' as const,
          content: input.prompt.content,
        },
        {
          role: 'user' as const,
          content: buildUserMessage(input),
        },
      ],
      ...(typeof executionOptions.temperature === 'number' ? { temperature: executionOptions.temperature } : {}),
      ...(typeof executionOptions.maxTokens === 'number' ? { max_completion_tokens: executionOptions.maxTokens } : {}),
      ...(executionOptions.user ? { user: executionOptions.user } : {}),
      ...(structuredOutput.enabled ? { response_format: buildResponseFormat(structuredOutput) } : {}),
      ...(executionOptions.stream ? { stream_options: { include_usage: true } } : {}),
    }

    return {
      body,
      requestOptions: {
        timeout: executionOptions.timeoutMs,
        signal: executionOptions.abortSignal,
        maxRetries: 0,
        headers: this.defaults.requestHeaders,
      },
      executionOptions,
    }
  }
}

function buildUserMessage(input: OpenRouterExecuteInput): string {
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

function buildResponseFormat(structuredOutput: OpenRouterStructuredOutputConfig) {
  if (structuredOutput.mode === 'json_schema' && structuredOutput.schema) {
    return {
      type: 'json_schema' as const,
      json_schema: {
        name: structuredOutput.schemaName ?? 'runtime_output',
        schema: structuredOutput.schema,
        strict: structuredOutput.strict ?? true,
      },
    }
  }

  return {
    type: 'json_object' as const,
  }
}

function resolveModel(input: {
  route?: string
  explicitModel?: string
  routing?: OpenRouterRoutingConfig
  defaultModel?: string
}): string {
  if (input.route) {
    const routed = input.routing?.routes?.[input.route]
    if (routed) {
      return routed
    }
  }

  return input.explicitModel ?? input.defaultModel ?? DEFAULT_MODEL
}

function resolveStructuredOutput(
  promptStructuredOutput: unknown,
  contextStructuredOutput: unknown,
  defaultStructuredOutput: OpenRouterStructuredOutputConfig | undefined,
): OpenRouterStructuredOutputConfig {
  const promptParsed = normalizeStructuredOutput(promptStructuredOutput)
  const contextParsed = normalizeStructuredOutput(contextStructuredOutput)

  return promptParsed ?? contextParsed ?? defaultStructuredOutput ?? { enabled: false }
}

function normalizeStructuredOutput(value: unknown): OpenRouterStructuredOutputConfig | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Record<string, unknown>
  return {
    enabled: getBooleanOption(candidate.enabled) ?? true,
    mode:
      candidate.mode === 'json_schema' || candidate.mode === 'json_object'
        ? candidate.mode
        : 'json_object',
    schemaName: getStringOption(candidate.schemaName),
    schema: isRecord(candidate.schema) ? candidate.schema : undefined,
    strict: getBooleanOption(candidate.strict),
  }
}

function getOpenRouterOptions(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  const direct = metadata.openrouter
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

