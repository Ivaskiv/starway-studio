import OpenAI from 'openai'
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions'

import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import { OpenRouterErrorMapper } from './errorMapper.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { OpenRouterRequestMapper } from './requestMapper.js'
import { OpenRouterResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type {
  OpenRouterClientSdk,
  OpenRouterConfig,
  OpenRouterProviderDependencies,
} from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class DefaultOpenRouterChatClient {
  constructor(private readonly client: OpenRouterClientSdk) {}

  async create(
    request: ChatCompletionCreateParams,
    options?: {
      timeout?: number
      signal?: AbortSignal
      maxRetries?: number
      headers?: Record<string, string>
    },
  ) {
    return this.client.chat.completions.create(request, options)
  }
}

export class OpenRouterProvider implements IAIProvider {
  private readonly logger: IRuntimeLogger
  private readonly deps: OpenRouterProviderDependencies
  private readonly streamingSupport: StreamingSupport
  private readonly onStreamChunk?: OpenRouterConfig['onStreamChunk']

  constructor(config: OpenRouterConfig = {}) {
    this.logger = config.logger ?? new NoopRuntimeLogger()

    const client =
      config.client ??
      new DefaultOpenRouterChatClient(
        new OpenAI({
          apiKey: config.apiKey ?? process.env.OPENROUTER_API_KEY,
          baseURL: config.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
          maxRetries: 0,
          defaultHeaders: buildDefaultHeaders(config),
        }),
      )

    const tokenUsageCalculator = new TokenUsageCalculator()
    const structuredOutputParser = new StructuredOutputParser()
    const rateLimitHandler = new RateLimitHandler(config.rateLimit)

    this.deps = {
      client,
      requestMapper: new OpenRouterRequestMapper({
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        defaultStreaming: config.defaultStreaming,
        defaultStructuredOutput: config.defaultStructuredOutput,
        routing: config.routing,
        requestHeaders: buildDefaultHeaders(config),
      }),
      responseMapper: new OpenRouterResponseMapper(tokenUsageCalculator, structuredOutputParser),
      errorMapper: new OpenRouterErrorMapper(),
      retryPolicy: new RetryPolicy(rateLimitHandler, undefined, config.retryPolicy),
      logger: this.logger,
    }

    this.streamingSupport = new StreamingSupport(tokenUsageCalculator)
    this.onStreamChunk = config.onStreamChunk
  }

  async execute(input: Parameters<IAIProvider['execute']>[0]) {
    const mapped = this.deps.requestMapper.map(input)

    this.logger.info('openrouter_provider.request_started', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      model: mapped.executionOptions.model,
      route: mapped.executionOptions.route,
      stream: mapped.executionOptions.stream,
      structuredOutput: mapped.executionOptions.structuredOutput.enabled,
    })

    try {
      const response = await this.deps.retryPolicy.execute(async (attempt) => {
        this.logger.debug('openrouter_provider.request_attempt', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          attempt,
          route: mapped.executionOptions.route,
        })
        return this.deps.client.create(mapped.body, mapped.requestOptions)
      })

      if (isAsyncIterable(response)) {
        const streamed = await this.streamingSupport.consume(response, {
          onChunk: this.onStreamChunk,
        })
        const providerResponse = this.deps.responseMapper.mapStreamingResult({
          result: streamed,
          request: mapped,
        })
        this.logger.info('openrouter_provider.request_completed', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          route: mapped.executionOptions.route,
          model: streamed.model,
          streamed: true,
          chunks: streamed.chunks,
        })
        return providerResponse
      }

      const providerResponse = this.deps.responseMapper.mapCompletion({
        response,
        request: mapped,
      })
      this.logger.info('openrouter_provider.request_completed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        route: mapped.executionOptions.route,
        model: response.model,
        streamed: false,
      })
      return providerResponse
    } catch (cause) {
      const mappedError = this.deps.errorMapper.map(cause)
      this.logger.error('openrouter_provider.request_failed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        route: mapped.executionOptions.route,
        error: {
          name: mappedError.name,
          message: mappedError.message,
        },
      })
      throw mappedError
    }
  }
}

function buildDefaultHeaders(config: OpenRouterConfig): Record<string, string> | undefined {
  const appName = config.appName ?? process.env.OPENROUTER_APP_NAME
  const siteUrl = config.siteUrl ?? process.env.OPENROUTER_SITE_URL
  const headers = {
    ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
    ...(appName ? { 'X-Title': appName } : {}),
  }
  return Object.keys(headers).length > 0 ? headers : undefined
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return !!value && typeof value === 'object' && Symbol.asyncIterator in value
}

