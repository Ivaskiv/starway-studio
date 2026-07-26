import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type {
  AIProviderResponse,
  AgentDefinition,
  IAIProvider,
  ResolvedPrompt,
} from '../../runtime/agent-runner/types.js'
import type { EngineeringTask, ExecutionStateSnapshot } from '../../runtime/orchestrator/types.js'
import type { LoadedExecutionContext } from '../../runtime/context-loader/types.js'

export type { IAIProvider }

export interface OllamaTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface OllamaStructuredOutputConfig {
  enabled: boolean
}

export interface OllamaStreamingChunk {
  contentDelta?: string
  rawChunk: OllamaChunkLike
}

export interface OllamaStreamingResult {
  content: string
  usage?: OllamaTokenUsage
  model?: string
  chunks: number
}

export interface OllamaRetryPolicyConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface OllamaConfig {
  baseUrl?: string
  client?: IOllamaClient
  defaultModel?: string
  timeoutMs?: number
  retryPolicy?: OllamaRetryPolicyConfig
  logger?: IRuntimeLogger
  defaultStreaming?: boolean
  defaultStructuredOutput?: OllamaStructuredOutputConfig
  onStreamChunk?: (chunk: OllamaStreamingChunk) => void | Promise<void>
}

export interface OllamaExecuteInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}

export interface OllamaExecutionOptions {
  model: string
  stream: boolean
  timeoutMs: number
  structuredOutput: OllamaStructuredOutputConfig
  abortSignal?: AbortSignal
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

export interface OllamaGenerateBody {
  model: string
  prompt: string
  system?: string
  stream: boolean
  format?: 'json'
  options?: {
    temperature?: number
    num_predict?: number
  }
}

export interface OllamaRequestOptions {
  timeoutMs: number
  signal?: AbortSignal
}

export interface OllamaProviderRequest {
  body: OllamaGenerateBody
  requestOptions: OllamaRequestOptions
  executionOptions: OllamaExecutionOptions
}

export interface OllamaProviderMetadata extends Record<string, unknown> {
  provider: 'ollama'
  model?: string
  tokenUsage?: OllamaTokenUsage
  streamed: boolean
  chunks?: number
}

export interface OllamaChunkLike {
  model?: string
  response?: string
  done?: boolean
  prompt_eval_count?: number
  eval_count?: number
}

export interface OllamaResponseLike extends OllamaChunkLike {}

export interface IOllamaClient {
  generate(
    request: OllamaGenerateBody,
    options: OllamaRequestOptions,
  ): Promise<OllamaResponseLike | AsyncIterable<OllamaChunkLike>>
}

export interface IOllamaRequestMapper {
  map(input: OllamaExecuteInput): OllamaProviderRequest
}

export interface IOllamaResponseMapper {
  mapResponse(input: {
    response: OllamaResponseLike
    request: OllamaProviderRequest
  }): AIProviderResponse
  mapStreamingResult(input: {
    result: OllamaStreamingResult
    request: OllamaProviderRequest
  }): AIProviderResponse
}

export interface IOllamaErrorMapper {
  map(error: unknown): Error
}

export interface IOllamaRetryPolicy {
  execute<T>(operation: (attempt: number) => Promise<T>): Promise<T>
}

export interface IOllamaStreamingSupport {
  consume(
    stream: AsyncIterable<OllamaChunkLike>,
    options?: {
      onChunk?: (chunk: OllamaStreamingChunk) => void | Promise<void>
    },
  ): Promise<OllamaStreamingResult>
}

export interface IOllamaTokenUsageCalculator {
  calculate(response?: Pick<OllamaChunkLike, 'prompt_eval_count' | 'eval_count'>): OllamaTokenUsage | undefined
}

export interface IOllamaStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OllamaStructuredOutputConfig
  }): Record<string, unknown> | undefined
}

export interface OllamaProviderDependencies {
  client: IOllamaClient
  requestMapper: IOllamaRequestMapper
  responseMapper: IOllamaResponseMapper
  errorMapper: IOllamaErrorMapper
  retryPolicy: IOllamaRetryPolicy
  logger?: IRuntimeLogger
}

