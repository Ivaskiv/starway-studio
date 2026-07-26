import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import { OllamaErrorMapper } from './errorMapper.js'
import {
  OllamaCancelledError,
  OllamaProviderError,
  OllamaTimeoutError,
} from './errors.js'
import { OllamaRequestMapper } from './requestMapper.js'
import { OllamaResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { IOllamaClient, OllamaChunkLike, OllamaConfig, OllamaProviderDependencies } from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class DefaultOllamaClient implements IOllamaClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(input: {
    baseUrl?: string
    fetcher?: typeof fetch
  } = {}) {
    this.baseUrl = (input.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/+$/, '')
    this.fetcher = input.fetcher ?? fetch
  }

  async generate(
    request: import('./types.js').OllamaGenerateBody,
    options: import('./types.js').OllamaRequestOptions,
  ): Promise<import('./types.js').OllamaResponseLike | AsyncIterable<import('./types.js').OllamaChunkLike>> {
    const timeoutController = new AbortController()
    const signal = composeAbortSignals(options.signal, timeoutController.signal)
    const timeoutId = setTimeout(() => timeoutController.abort(new TimeoutError('Ollama request timed out.')), options.timeoutMs)

    try {
      const response = await this.fetcher(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(request),
        signal,
      })

      if (!response.ok) {
        const message = await safeReadText(response)
        throw new HttpError(response.status, message || `Ollama request failed with status ${response.status}.`)
      }

      if (request.stream) {
        if (!response.body) {
          throw new OllamaProviderError('Ollama streaming response did not include a body.')
        }
        return parseNdjsonStream(response.body)
      }

      return (await response.json()) as import('./types.js').OllamaResponseLike
    } catch (error) {
      if (isTimeoutAbort(error)) {
        throw new OllamaTimeoutError('Ollama request timed out.', error)
      }
      if (isAbortError(error)) {
        throw new OllamaCancelledError('Ollama request was cancelled.', error)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export class OllamaProvider implements IAIProvider {
  private readonly logger: IRuntimeLogger
  private readonly deps: OllamaProviderDependencies
  private readonly streamingSupport: StreamingSupport
  private readonly onStreamChunk?: OllamaConfig['onStreamChunk']

  constructor(config: OllamaConfig = {}) {
    this.logger = config.logger ?? new NoopRuntimeLogger()

    const client = config.client ?? new DefaultOllamaClient({ baseUrl: config.baseUrl })

    const tokenUsageCalculator = new TokenUsageCalculator()
    const structuredOutputParser = new StructuredOutputParser()

    this.deps = {
      client,
      requestMapper: new OllamaRequestMapper({
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        defaultStreaming: config.defaultStreaming,
        defaultStructuredOutput: config.defaultStructuredOutput,
      }),
      responseMapper: new OllamaResponseMapper(tokenUsageCalculator, structuredOutputParser),
      errorMapper: new OllamaErrorMapper(),
      retryPolicy: new RetryPolicy(undefined, config.retryPolicy),
      logger: this.logger,
    }

    this.streamingSupport = new StreamingSupport(tokenUsageCalculator)
    this.onStreamChunk = config.onStreamChunk
  }

  async execute(input: Parameters<IAIProvider['execute']>[0]) {
    const mapped = this.deps.requestMapper.map(input)

    this.logger.info('ollama_provider.request_started', {
      taskId: input.task.id,
      agentId: input.agentDefinition.id,
      model: mapped.executionOptions.model,
      stream: mapped.executionOptions.stream,
      structuredOutput: mapped.executionOptions.structuredOutput.enabled,
    })

    try {
      const response = await this.deps.retryPolicy.execute(async (attempt) => {
        this.logger.debug('ollama_provider.request_attempt', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          attempt,
        })
        return this.deps.client.generate(mapped.body, mapped.requestOptions)
      })

      if (isAsyncIterable(response)) {
        const streamed = await this.streamingSupport.consume(response, {
          onChunk: this.onStreamChunk,
        })
        const providerResponse = this.deps.responseMapper.mapStreamingResult({
          result: streamed,
          request: mapped,
        })
        this.logger.info('ollama_provider.request_completed', {
          taskId: input.task.id,
          agentId: input.agentDefinition.id,
          model: streamed.model,
          streamed: true,
          chunks: streamed.chunks,
        })
        return providerResponse
      }

      const providerResponse = this.deps.responseMapper.mapResponse({
        response,
        request: mapped,
      })
      this.logger.info('ollama_provider.request_completed', {
        taskId: input.task.id,
        agentId: input.agentDefinition.id,
        model: response.model,
        streamed: false,
      })
      return providerResponse
    } catch (cause) {
      const mappedError = this.deps.errorMapper.map(cause)
      this.logger.error('ollama_provider.request_failed', {
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

function isAsyncIterable(value: unknown): value is AsyncIterable<OllamaChunkLike> {
  return !!value && typeof value === 'object' && Symbol.asyncIterator in value
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

function composeAbortSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const filtered = signals.filter(Boolean) as AbortSignal[]
  if (filtered.length === 0) {
    return undefined
  }
  if (filtered.length === 1) {
    return filtered[0]
  }

  const controller = new AbortController()
  for (const signal of filtered) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener(
      'abort',
      () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason)
        }
      },
      { once: true },
    )
  }
  return controller.signal
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError'
}

function isTimeoutAbort(error: unknown): boolean {
  return !!error && typeof error === 'object' && ((error as { name?: unknown }).name === 'TimeoutError' || (error as { cause?: { name?: unknown } }).cause?.name === 'TimeoutError')
}

async function* parseNdjsonStream(stream: ReadableStream<Uint8Array>): AsyncIterable<OllamaChunkLike> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        yield JSON.parse(trimmed) as OllamaChunkLike
      }
    }

    const tail = buffer.trim()
    if (tail) {
      yield JSON.parse(tail) as OllamaChunkLike
    }
  } finally {
    reader.releaseLock()
  }
}

