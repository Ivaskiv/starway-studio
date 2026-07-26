import type Anthropic from '@anthropic-ai/sdk'
import type {
  Message,
  MessageCreateParams,
  RawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages'

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

export interface AnthropicTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
}

export interface AnthropicStructuredOutputConfig {
  enabled: boolean
  schema?: Record<string, unknown>
}

export interface AnthropicStreamingChunk {
  contentDelta?: string
  rawChunk: AnthropicStreamEventLike
}

export interface AnthropicStreamingResult {
  content: string
  stopReason?: string | null
  usage?: AnthropicTokenUsage
  model?: string
  chunks: number
}

export interface AnthropicRetryPolicyConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface AnthropicRateLimitConfig {
  maxDelayMs?: number
  defaultDelayMs?: number
}

export interface AnthropicConfig {
  apiKey?: string
  client?: IAnthropicMessagesClient
  defaultModel?: string
  timeoutMs?: number
  maxRetries?: number
  retryPolicy?: AnthropicRetryPolicyConfig
  rateLimit?: AnthropicRateLimitConfig
  logger?: IRuntimeLogger
  defaultStreaming?: boolean
  defaultStructuredOutput?: AnthropicStructuredOutputConfig
  onStreamChunk?: (chunk: AnthropicStreamingChunk) => void | Promise<void>
}

export interface AnthropicExecuteInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}

export interface AnthropicExecutionOptions {
  model: string
  stream: boolean
  timeoutMs: number
  maxRetries: number
  structuredOutput: AnthropicStructuredOutputConfig
  abortSignal?: AbortSignal
  maxTokens?: number
  temperature?: number
  user?: string
  metadata?: Record<string, unknown>
}

export interface AnthropicProviderRequest {
  body: MessageCreateParams
  requestOptions: {
    timeout?: number
    signal?: AbortSignal
    maxRetries?: number
  }
  executionOptions: AnthropicExecutionOptions
}

export interface AnthropicProviderMetadata extends Record<string, unknown> {
  model?: string
  provider: 'anthropic'
  stopReason?: string | null
  tokenUsage?: AnthropicTokenUsage
  streamed: boolean
  chunks?: number
  requestMetadata?: Record<string, unknown>
}

export interface AnthropicMessageLike {
  id?: string
  model?: string
  stop_reason?: string | null
  content?: Array<{
    type?: string
    text?: string
    input?: unknown
  }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number | null
    cache_read_input_tokens?: number | null
  }
}

export interface AnthropicStreamEventLike {
  type?: string
  message?: AnthropicMessageLike
  delta?: {
    text?: string
    stop_reason?: string | null
  }
  usage?: {
    input_tokens?: number | null
    output_tokens?: number | null
    cache_creation_input_tokens?: number | null
    cache_read_input_tokens?: number | null
  } | null
}

export interface IAnthropicMessagesClient {
  create(
    request: MessageCreateParams,
    options?: {
      timeout?: number
      signal?: AbortSignal
      maxRetries?: number
    },
  ): Promise<Message | AnthropicMessageLike | AsyncIterable<AnthropicStreamEventLike | RawMessageStreamEvent>>
}

export interface IAnthropicRequestMapper {
  map(input: AnthropicExecuteInput): AnthropicProviderRequest
}

export interface IAnthropicResponseMapper {
  mapMessage(input: {
    response: AnthropicMessageLike
    request: AnthropicProviderRequest
  }): AIProviderResponse
  mapStreamingResult(input: {
    result: AnthropicStreamingResult
    request: AnthropicProviderRequest
  }): AIProviderResponse
}

export interface IAnthropicErrorMapper {
  map(error: unknown): Error
}

export interface IAnthropicRetryPolicy {
  execute<T>(operation: (attempt: number) => Promise<T>): Promise<T>
}

export interface IAnthropicRateLimitHandler {
  shouldRetry(error: unknown): boolean
  getDelayMs(error: unknown, attempt: number): number
}

export interface IAnthropicStreamingSupport {
  consume(
    stream: AsyncIterable<AnthropicStreamEventLike | RawMessageStreamEvent>,
    options?: {
      onChunk?: (chunk: AnthropicStreamingChunk) => void | Promise<void>
    },
  ): Promise<AnthropicStreamingResult>
}

export interface IAnthropicTokenUsageCalculator {
  calculate(
    usage?:
      | AnthropicMessageLike['usage']
      | {
          input_tokens?: number | null
          output_tokens?: number | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
        }
      | null,
  ): AnthropicTokenUsage | undefined
}

export interface IAnthropicStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: AnthropicStructuredOutputConfig
  }): Record<string, unknown> | undefined
}

export interface AnthropicProviderDependencies {
  client: IAnthropicMessagesClient
  requestMapper: IAnthropicRequestMapper
  responseMapper: IAnthropicResponseMapper
  errorMapper: IAnthropicErrorMapper
  retryPolicy: IAnthropicRetryPolicy
  logger?: IRuntimeLogger
}

export type AnthropicClientSdk = Anthropic
