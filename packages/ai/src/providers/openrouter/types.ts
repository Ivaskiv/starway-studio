import type OpenAI from 'openai'
import type {
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

export interface OpenRouterTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

export interface OpenRouterStructuredOutputConfig {
  enabled: boolean
  mode?: 'json_object' | 'json_schema'
  schemaName?: string
  schema?: Record<string, unknown>
  strict?: boolean
}

export interface OpenRouterStreamingChunk {
  contentDelta?: string
  rawChunk: OpenRouterChunkLike
}

export interface OpenRouterStreamingResult {
  content: string
  finishReason?: string | null
  usage?: OpenRouterTokenUsage
  model?: string
  chunks: number
}

export interface OpenRouterRetryPolicyConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface OpenRouterRateLimitConfig {
  maxDelayMs?: number
  defaultDelayMs?: number
}

export interface OpenRouterRoutingConfig {
  defaultRoute?: string
  routes?: Record<string, string>
}

export interface OpenRouterConfig {
  apiKey?: string
  client?: IOpenRouterChatClient
  baseUrl?: string
  routing?: OpenRouterRoutingConfig
  defaultModel?: string
  timeoutMs?: number
  maxRetries?: number
  retryPolicy?: OpenRouterRetryPolicyConfig
  rateLimit?: OpenRouterRateLimitConfig
  logger?: IRuntimeLogger
  defaultStreaming?: boolean
  defaultStructuredOutput?: OpenRouterStructuredOutputConfig
  onStreamChunk?: (chunk: OpenRouterStreamingChunk) => void | Promise<void>
  appName?: string
  siteUrl?: string
}

export interface OpenRouterExecuteInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}

export interface OpenRouterExecutionOptions {
  model: string
  route?: string
  stream: boolean
  timeoutMs: number
  maxRetries: number
  structuredOutput: OpenRouterStructuredOutputConfig
  abortSignal?: AbortSignal
  temperature?: number
  maxTokens?: number
  user?: string
  metadata?: Record<string, unknown>
}

export interface OpenRouterProviderRequest {
  body: ChatCompletionCreateParams
  requestOptions: {
    timeout?: number
    signal?: AbortSignal
    maxRetries?: number
    headers?: Record<string, string>
  }
  executionOptions: OpenRouterExecutionOptions
}

export interface OpenRouterProviderMetadata extends Record<string, unknown> {
  model?: string
  provider: 'openrouter'
  route?: string
  finishReason?: string | null
  tokenUsage?: OpenRouterTokenUsage
  streamed: boolean
  chunks?: number
  requestMetadata?: Record<string, unknown>
}

export interface OpenRouterMessageLike {
  role?: string
  content?: unknown
  refusal?: string | null
}

export interface OpenRouterCompletionLike {
  id?: string
  model?: string
  choices?: Array<{
    finish_reason?: string | null
    message?: OpenRouterMessageLike
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

export interface OpenRouterChunkLike {
  model?: string
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: string | null | Array<{ type?: string; text?: string }>
    }
  }>
  usage?: OpenRouterCompletionLike['usage'] | null
}

export interface IOpenRouterChatClient {
  create(
    request: ChatCompletionCreateParams,
    options?: {
      timeout?: number
      signal?: AbortSignal
      maxRetries?: number
      headers?: Record<string, string>
    },
  ): Promise<OpenRouterCompletionLike | AsyncIterable<OpenRouterChunkLike | ChatCompletionChunk>>
}

export interface IOpenRouterRequestMapper {
  map(input: OpenRouterExecuteInput): OpenRouterProviderRequest
}

export interface IOpenRouterResponseMapper {
  mapCompletion(input: {
    response: OpenRouterCompletionLike
    request: OpenRouterProviderRequest
  }): AIProviderResponse
  mapStreamingResult(input: {
    result: OpenRouterStreamingResult
    request: OpenRouterProviderRequest
  }): AIProviderResponse
}

export interface IOpenRouterErrorMapper {
  map(error: unknown): Error
}

export interface IOpenRouterRetryPolicy {
  execute<T>(operation: (attempt: number) => Promise<T>): Promise<T>
}

export interface IOpenRouterRateLimitHandler {
  shouldRetry(error: unknown): boolean
  getDelayMs(error: unknown, attempt: number): number
}

export interface IOpenRouterStreamingSupport {
  consume(
    stream: AsyncIterable<OpenRouterChunkLike | ChatCompletionChunk>,
    options?: {
      onChunk?: (chunk: OpenRouterStreamingChunk) => void | Promise<void>
    },
  ): Promise<OpenRouterStreamingResult>
}

export interface IOpenRouterTokenUsageCalculator {
  calculate(usage?: OpenRouterCompletionLike['usage']): OpenRouterTokenUsage | undefined
}

export interface IOpenRouterStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: OpenRouterStructuredOutputConfig
  }): Record<string, unknown> | undefined
}

export interface OpenRouterProviderDependencies {
  client: IOpenRouterChatClient
  requestMapper: IOpenRouterRequestMapper
  responseMapper: IOpenRouterResponseMapper
  errorMapper: IOpenRouterErrorMapper
  retryPolicy: IOpenRouterRetryPolicy
  logger?: IRuntimeLogger
}

export type OpenRouterClientSdk = OpenAI

