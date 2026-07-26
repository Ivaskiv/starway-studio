import OpenAI from 'openai'
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions'

import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import { OpenAIErrorMapper } from './errorMapper.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { OpenAIRequestMapper } from './requestMapper.js'
import { OpenAIResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { OpenAIClientSdk, OpenAIConfig, OpenAIProviderDependencies } from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class DefaultOpenAIChatClient {
  constructor(private readonly client: OpenAIClientSdk) {}

  async create(
    request: ChatCompletionCreateParams,
    options?: {
      timeout?: number
      signal?: AbortSignal
      maxRetries?: number
    },
  ) {
    return this.client.chat.completions.create(request, options)
  }
}

export class OpenAIProvider implements IAIProvider {
  private readonly logger: IRuntimeLogger
  private readonly deps: OpenAIProviderDependencies

  constructor(config: OpenAIConfig = {}) {
    this.logger = config.logger ?? new NoopRuntimeLogger()

    const client =
      config.client ??
      new DefaultOpenAIChatClient(
        new OpenAI({
          apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
          maxRetries: 0,
        }),
      )

    const tokenUsageCalculator = new TokenUsageCalculator()
    const structuredOutputParser = new StructuredOutputParser()
    const rateLimitHandler = new RateLimitHandler(config.rateLimit)

    this.deps = {
      client,
      requestMapper: new OpenAIRequestMapper({
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        defaultStreaming: config.defaultStreaming,
        defaultStructuredOutput: config.defaultStructuredOutput,
      }),
      responseMapper: new OpenAIResponseMapper(tokenUsageCalculator, structuredOutputParser),
      errorMapper: new OpenAIErrorMapper(),
      retryPolicy: new RetryPolicy(rateLimitHandler, undefined, config.retryPolicy),
      logger: this.logger,
    }

    this.streamingSupport = new StreamingSupport(tokenUsageCalculator)
    this.onStreamChunk = config.onStreamChunk
  }

  private readonly streamingSupport: StreamingSupport
  private readonly onStreamChunk?: OpenAIConfig['onStreamChunk']

  async execute(input: Parameters<IAIProvider['execute']>[0]) {
    const mapped = this.deps.requestMapper.map(input)

    this.logger.info('openai_provider.request_started', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      model: mapped.executionOptions.model,
      stream: mapped.executionOptions.stream,
      structuredOutput: mapped.executionOptions.structuredOutput.enabled,
    })

    try {
      const response = await this.deps.retryPolicy.execute(async (attempt) => {
        this.logger.debug('openai_provider.request_attempt', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          attempt,
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
        this.logger.info('openai_provider.request_completed', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
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
      this.logger.info('openai_provider.request_completed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        model: response.model,
        streamed: false,
      })
      return providerResponse
    } catch (cause) {
      const mappedError = this.deps.errorMapper.map(cause)
      this.logger.error('openai_provider.request_failed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        error: {
          name: mappedError.name,
          message: mappedError.message,
        },
      })
      throw mappedError
    }
  }
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return !!value && typeof value === 'object' && Symbol.asyncIterator in value
}
