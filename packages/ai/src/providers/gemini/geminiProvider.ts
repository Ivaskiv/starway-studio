import { GoogleGenerativeAI } from '@google/generative-ai'

import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import { GeminiErrorMapper } from './errorMapper.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { GeminiRequestMapper } from './requestMapper.js'
import { GeminiResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { GeminiConfig, GeminiProviderDependencies, GeminiSdkClient } from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class DefaultGeminiClient {
  constructor(private readonly client: GeminiSdkClient) {}

  getModel(input: {
    model: string
    generationConfig?: import('@google/generative-ai').GenerationConfig
    requestOptions?: import('@google/generative-ai').RequestOptions
  }) {
    return this.client.getGenerativeModel(
      {
        model: input.model,
        generationConfig: input.generationConfig,
      },
      input.requestOptions,
    )
  }
}

export class GeminiProvider implements IAIProvider {
  private readonly logger: IRuntimeLogger
  private readonly deps: GeminiProviderDependencies
  private readonly streamingSupport: StreamingSupport
  private readonly onStreamChunk?: GeminiConfig['onStreamChunk']

  constructor(config: GeminiConfig = {}) {
    this.logger = config.logger ?? new NoopRuntimeLogger()

    const client =
      config.client ??
      new DefaultGeminiClient(
        new GoogleGenerativeAI(config.apiKey ?? process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? ''),
      )

    const tokenUsageCalculator = new TokenUsageCalculator()
    const structuredOutputParser = new StructuredOutputParser()
    const rateLimitHandler = new RateLimitHandler(config.rateLimit)

    this.deps = {
      client,
      requestMapper: new GeminiRequestMapper({
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        defaultStreaming: config.defaultStreaming,
        defaultStructuredOutput: config.defaultStructuredOutput,
      }),
      responseMapper: new GeminiResponseMapper(tokenUsageCalculator, structuredOutputParser),
      errorMapper: new GeminiErrorMapper(),
      retryPolicy: new RetryPolicy(rateLimitHandler, undefined, config.retryPolicy),
      logger: this.logger,
    }

    this.streamingSupport = new StreamingSupport(tokenUsageCalculator)
    this.onStreamChunk = config.onStreamChunk
  }

  async execute(input: Parameters<IAIProvider['execute']>[0]) {
    const mapped = this.deps.requestMapper.map(input)

    this.logger.info('gemini_provider.request_started', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      model: mapped.executionOptions.model,
      stream: mapped.executionOptions.stream,
      structuredOutput: mapped.executionOptions.structuredOutput.enabled,
    })

    try {
      const providerResponse = await this.deps.retryPolicy.execute(async (attempt) => {
        this.logger.debug('gemini_provider.request_attempt', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          attempt,
        })

        const model = this.deps.client.getModel({
          model: mapped.model,
          generationConfig: mapped.body.generationConfig,
          requestOptions: {
            timeout: mapped.requestOptions.timeout,
          },
        })

        if (mapped.executionOptions.stream) {
          const result = await model.generateContentStream(mapped.body, mapped.requestOptions)
          const streamed = await this.streamingSupport.consume(result.stream, {
            onChunk: this.onStreamChunk,
          })
          return this.deps.responseMapper.mapStreamingResult({
            result: streamed,
            request: mapped,
          })
        }

        const result = await model.generateContent(mapped.body, mapped.requestOptions)
        return this.deps.responseMapper.mapResponse({
          response: result.response,
          request: mapped,
        })
      })

      this.logger.info('gemini_provider.request_completed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        streamed: mapped.executionOptions.stream,
      })

      return providerResponse
    } catch (cause) {
      const mappedError = this.deps.errorMapper.map(cause)
      this.logger.error('gemini_provider.request_failed', {
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
