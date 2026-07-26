import type {
  IOllamaRequestMapper,
  OllamaExecuteInput,
  OllamaExecutionOptions,
  OllamaProviderRequest,
  OllamaStructuredOutputConfig,
} from './types.js'

const DEFAULT_MODEL = 'llama3.1:8b'
const DEFAULT_TIMEOUT_MS = 30000

export class OllamaRequestMapper implements IOllamaRequestMapper {
  constructor(
    private readonly defaults: {
      defaultModel?: string
      timeoutMs?: number
      defaultStreaming?: boolean
      defaultStructuredOutput?: OllamaStructuredOutputConfig
    } = {},
  ) {}

  map(input: OllamaExecuteInput): OllamaProviderRequest {
    const promptOptions = getOllamaOptions(input.prompt.metadata)
    const contextOptions = getOllamaOptions(input.context.metadata)
    const structuredOutput = resolveStructuredOutput(
      promptOptions.structuredOutput,
      contextOptions.structuredOutput,
      this.defaults.defaultStructuredOutput,
    )

    const executionOptions: OllamaExecutionOptions = {
      model:
        getStringOption(promptOptions.model) ??
        getStringOption(contextOptions.model) ??
        this.defaults.defaultModel ??
        process.env.OLLAMA_MODEL ??
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
      structuredOutput,
      abortSignal: getAbortSignal(promptOptions.abortSignal) ?? getAbortSignal(contextOptions.abortSignal),
      temperature: getNumberOption(promptOptions.temperature) ?? getNumberOption(contextOptions.temperature),
      maxTokens: getNumberOption(promptOptions.maxTokens) ?? getNumberOption(contextOptions.maxTokens),
      metadata: mergeMetadata(promptOptions.metadata, contextOptions.metadata),
    }

    return {
      body: {
        model: executionOptions.model,
        prompt: buildUserMessage(input),
        system: input.prompt.content,
        stream: executionOptions.stream,
        ...(structuredOutput.enabled ? { format: 'json' as const } : {}),
        ...buildOptions(executionOptions),
      },
      requestOptions: {
        timeoutMs: executionOptions.timeoutMs,
        signal: executionOptions.abortSignal,
      },
      executionOptions,
    }
  }
}

function buildUserMessage(input: OllamaExecuteInput): string {
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

function buildOptions(executionOptions: OllamaExecutionOptions): Pick<import('./types.js').OllamaGenerateBody, 'options'> | {} {
  const options = {
    ...(typeof executionOptions.temperature === 'number' ? { temperature: executionOptions.temperature } : {}),
    ...(typeof executionOptions.maxTokens === 'number' ? { num_predict: executionOptions.maxTokens } : {}),
  }

  return Object.keys(options).length > 0 ? { options } : {}
}

function resolveStructuredOutput(
  promptStructuredOutput: unknown,
  contextStructuredOutput: unknown,
  defaultStructuredOutput: OllamaStructuredOutputConfig | undefined,
): OllamaStructuredOutputConfig {
  const promptParsed = normalizeStructuredOutput(promptStructuredOutput)
  const contextParsed = normalizeStructuredOutput(contextStructuredOutput)
  return promptParsed ?? contextParsed ?? defaultStructuredOutput ?? { enabled: false }
}

function normalizeStructuredOutput(value: unknown): OllamaStructuredOutputConfig | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  return {
    enabled: getBooleanOption(candidate.enabled) ?? true,
  }
}

function getOllamaOptions(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }
  const direct = metadata.ollama
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

function mergeMetadata(promptMetadata: unknown, contextMetadata: unknown): Record<string, unknown> | undefined {
  const left = isRecord(promptMetadata) ? promptMetadata : {}
  const right = isRecord(contextMetadata) ? contextMetadata : {}
  const merged = { ...right, ...left }
  return Object.keys(merged).length > 0 ? merged : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

