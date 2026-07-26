import type OpenAI from 'openai'
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources/chat/completions'

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

export interface OpenAITokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

export interface OpenAIStructuredOutputConfig {
  enabled: boolean
  mode?: 'json_object' | 'json_schema'
  schemaName?: string
  schema?: Record<string, unknown>
  strict?: boolean
}

export interface OpenAIStreamingChunk {
  contentDelta?: string
  rawChunk: OpenAIChunkLike
}

export interface OpenAIStreamingResult {
  content: string
  finishReason?: string | null
  usage?: OpenAITokenUsage
  model?: string
  chunks: number
}

export interface OpenAIRetryPolicyConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface OpenAIRateLimitConfig {
  maxDelayMs?: number
  defaultDelayMs?: number
}

export interface OpenAIConfig {
  apiKey?: string
  client?: IOpenAIChatClient
  defaultModel?: string
  timeoutMs?: number
  maxRetries?: number
  retryPolicy?: OpenAIRetryPolicyConfig
  rateLimit?: OpenAIRateLimitConfig
  logger?: IRuntimeLogger
  defaultStreaming?: boolean
  defaultStructuredOutput?: OpenAIStructuredOutputConfig
  onStreamChunk?: (chunk: OpenAIStreamingChunk) => void | Promise<void>
}

export interface OpenAIExecuteInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}

export interface OpenAIExecutionOptions {
  model: string
  stream: boolean
  timeoutMs: number
  maxRetries: number
  structuredOutput: OpenAIStructuredOutputConfig
  abortSignal?: AbortSignal
  temperature?: number
  maxTokens?: number
  user?: string
  metadata?: Record<string, unknown>
}

export interface OpenAIProviderRequest {
  body: ChatCompletionCreateParams
  requestOptions: {
    timeout?: number
    signal?: AbortSignal
    maxRetries?: number
  }
  executionOptions: OpenAIExecutionOptions
}

export interface OpenAIProviderMetadata extends Record<string, unknown> {
  model?: string
  provider: 'openai'
  finishReason?: string | null
  tokenUsage?: OpenAITokenUsage
  streamed: boolean
  chunks?: number
  requestMetadata?: Record<string, unknown>
}

export interface OpenAIMessageLike {
  role?: string
  content?: unknown
  refusal?: string | null
}

export interface OpenAICompletionLike {
  id?: string
  model?: string
  choices?: Array<{
    finish_reason?: string | null
    message?: OpenAIMessageLike
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    prompt_tokens_details?: {
      cached_tokens?: number
    }
    completion_tokens_details?: {
      reasoning_tokens?: number
    }
  }
}

export interface OpenAIChunkLike {
  model?: string
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: string | null | Array<{ type?: string; text?: string }>
    }
  }>
  usage?: OpenAICompletionLike['usage'] | null
}

export interface IOpenAIChatClient {
  create(
    request: ChatCompletionCreateParams,
    options?: {
      timeout?: number
      signal?: AbortSignal
      maxRetries?: number
    },
  ): Promise<OpenAICompletionLike | AsyncIterable<OpenAIChunkLike | ChatCompletionChunk>>
}

export interface IOpenAIRequestMapper {
  map(input: OpenAIExecuteInput): OpenAIProviderRequest
}

export interface IOpenAIResponseMapper {
  mapCompletion(input: {
    response: OpenAICompletionLike
    request: OpenAIProviderRequest
  }): AIProviderResponse
  mapStreamingResult(input: {
    result: OpenAIStreamingResult
    request: OpenAIProviderRequest
  }): AIProviderResponse
}

export interface IOpenAIErrorMapper {
  map(error: unknown): Error
}

export interface IRetryPolicy {
  execute<T>(operation: (attempt: number) => Promise<T>): Promise<T>
}

export interface IRateLimitHandler {
  shouldRetry(error: unknown): boolean
  getDelayMs(error: unknown, attempt: number): number
}

export interface IStreamingSupport {
  consume(
    stream: AsyncIterable<OpenAIChunkLike | ChatCompletionChunk>,
    options?: {
      onChunk?: (chunk: OpenAIStreamingChunk) => void | Promise<void>
    },
  ): Promise<OpenAIStreamingResult>
}

export interface ITokenUsageCalculator {
  calculate(usage?: OpenAICompletionLike['usage']): OpenAITokenUsage | undefined
}

export interface IStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OpenAIStructuredOutputConfig
  }): Record<string, unknown> | undefined
}

export interface OpenAIProviderDependencies {
  client: IOpenAIChatClient
  requestMapper: IOpenAIRequestMapper
  responseMapper: IOpenAIResponseMapper
  errorMapper: IOpenAIErrorMapper
  retryPolicy: IRetryPolicy
  logger?: IRuntimeLogger
}

export type OpenAIClientSdk = OpenAI
