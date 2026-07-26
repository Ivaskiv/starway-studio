import type {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  GenerationConfig,
  GenerativeModel,
  RequestOptions,
  SingleRequestOptions,
} from '@google/generative-ai'
import type { GoogleGenerativeAI } from '@google/generative-ai'

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

export interface GeminiTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedContentTokens?: number
}

export interface GeminiStructuredOutputConfig {
  enabled: boolean
  schema?: Record<string, unknown>
}

export interface GeminiStreamingChunk {
  contentDelta?: string
  rawChunk: GeminiResponseLike
}

export interface GeminiStreamingResult {
  content: string
  usage?: GeminiTokenUsage
  model?: string
  chunks: number
}

export interface GeminiRetryPolicyConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface GeminiRateLimitConfig {
  maxDelayMs?: number
  defaultDelayMs?: number
}

export interface GeminiConfig {
  apiKey?: string
  client?: IGeminiClient
  defaultModel?: string
  timeoutMs?: number
  retryPolicy?: GeminiRetryPolicyConfig
  rateLimit?: GeminiRateLimitConfig
  logger?: IRuntimeLogger
  defaultStreaming?: boolean
  defaultStructuredOutput?: GeminiStructuredOutputConfig
  onStreamChunk?: (chunk: GeminiStreamingChunk) => void | Promise<void>
}

export interface GeminiExecuteInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
  state: ExecutionStateSnapshot
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}

export interface GeminiExecutionOptions {
  model: string
  stream: boolean
  timeoutMs: number
  structuredOutput: GeminiStructuredOutputConfig
  abortSignal?: AbortSignal
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

export interface GeminiProviderRequest {
  model: string
  body: GenerateContentRequest
  requestOptions: SingleRequestOptions
  executionOptions: GeminiExecutionOptions
}

export interface GeminiProviderMetadata extends Record<string, unknown> {
  model?: string
  provider: 'gemini'
  tokenUsage?: GeminiTokenUsage
  streamed: boolean
  chunks?: number
}

export interface GeminiResponseLike {
  text?: () => string
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
    cachedContentTokenCount?: number
  }
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
}

export interface IGeminiModel {
  generateContent(
    request: GenerateContentRequest,
    requestOptions?: SingleRequestOptions,
  ): Promise<GenerateContentResult | { response: GeminiResponseLike }>
  generateContentStream(
    request: GenerateContentRequest,
    requestOptions?: SingleRequestOptions,
  ): Promise<GenerateContentStreamResult | { stream: AsyncIterable<GeminiResponseLike>; response: Promise<GeminiResponseLike> }>
}

export interface IGeminiClient {
  getModel(input: {
    model: string
    generationConfig?: GenerationConfig
    requestOptions?: RequestOptions
  }): IGeminiModel
}

export interface IGeminiRequestMapper {
  map(input: GeminiExecuteInput): GeminiProviderRequest
}

export interface IGeminiResponseMapper {
  mapResponse(input: {
    response: GeminiResponseLike
    request: GeminiProviderRequest
  }): AIProviderResponse
  mapStreamingResult(input: {
    result: GeminiStreamingResult
    request: GeminiProviderRequest
  }): AIProviderResponse
}

export interface IGeminiErrorMapper {
  map(error: unknown): Error
}

export interface IGeminiRetryPolicy {
  execute<T>(operation: (attempt: number) => Promise<T>): Promise<T>
}

export interface IGeminiRateLimitHandler {
  shouldRetry(error: unknown): boolean
  getDelayMs(error: unknown, attempt: number): number
}

export interface IGeminiStreamingSupport {
  consume(
    stream: AsyncIterable<GeminiResponseLike>,
    options?: {
      onChunk?: (chunk: GeminiStreamingChunk) => void | Promise<void>
    },
  ): Promise<GeminiStreamingResult>
}

export interface IGeminiTokenUsageCalculator {
  calculate(usage?: GeminiResponseLike['usageMetadata']): GeminiTokenUsage | undefined
}

export interface IGeminiStructuredOutputParser {
  parse(input: {
    content?: string
    structuredOutput: GeminiStructuredOutputConfig
  }): Record<string, unknown> | undefined
}

export interface GeminiProviderDependencies {
  client: IGeminiClient
  requestMapper: IGeminiRequestMapper
  responseMapper: IGeminiResponseMapper
  errorMapper: IGeminiErrorMapper
  retryPolicy: IGeminiRetryPolicy
  logger?: IRuntimeLogger
}

export type GeminiSdkClient = GoogleGenerativeAI
export type GeminiSdkModel = GenerativeModel
