import { describe, expect, it, vi } from 'vitest'

import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type { ContextSourceKind, LoadedExecutionContext } from '../../runtime/context-loader/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { AgentDefinition, ResolvedPrompt } from '../../runtime/agent-runner/types.js'
import { OpenAICancelledError, OpenAIRateLimitError, OpenAIStructuredOutputError } from './errors.js'
import { OpenAIProvider } from './openaiProvider.js'
import { OpenAIRequestMapper } from './requestMapper.js'
import { OpenAIResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { IOpenAIChatClient, OpenAIChunkLike, OpenAICompletionLike } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const task: EngineeringTask = {
  id: 'task-openai-1',
  description: 'Generate implementation artifact',
  objective: 'Return provider output',
}

const state: ExecutionStateSnapshot = {
  task,
  status: 'running',
  currentAgentId: 'implementation',
  completedAgentIds: ['project_manager', 'task_planning'],
  artifacts: [],
  notes: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

const agentDefinition: AgentDefinition = {
  id: 'implementation',
  promptId: 'implementation-prompt',
  artifactType: 'implementation_artifact',
}

const prompt: ResolvedPrompt = {
  id: 'implementation-prompt',
  version: '1.0.0',
  content: 'Implement the approved plan.',
}

const context: LoadedExecutionContext = {
  summary: 'Scoped implementation context',
  sourceOrder: ['task', 'runtime_state', 'prompt'] as ContextSourceKind[],
  metadata: {},
}

function makeInput(overrides: Partial<{
  prompt: ResolvedPrompt
  context: LoadedExecutionContext
}> = {}) {
  return {
    task,
    state,
    agentDefinition,
    prompt: overrides.prompt ?? prompt,
    context: overrides.context ?? context,
  }
}

describe('OpenAIRequestMapper', () => {
  it('maps structured-output and model overrides into a chat completion request', () => {
    const mapper = new OpenAIRequestMapper({
      defaultModel: 'gpt-4.1-mini',
    })

    const request = mapper.map(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openai: {
              model: 'gpt-4.1',
              stream: true,
              structuredOutput: {
                enabled: true,
                mode: 'json_object',
              },
            },
          },
        },
      }),
    )

    expect(request.body.model).toBe('gpt-4.1')
    expect(request.body.stream).toBe(true)
    expect(request.body.response_format).toEqual({ type: 'json_object' })
  })
})

describe('OpenAIResponseMapper', () => {
  it('parses structured JSON output from a normal completion', () => {
    const mapper = new OpenAIResponseMapper(new TokenUsageCalculator(), new StructuredOutputParser())

    const response = mapper.mapCompletion({
      response: {
        model: 'gpt-4.1',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"result":"ok"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      },
      request: {
        body: {} as never,
        requestOptions: {},
        executionOptions: {
          model: 'gpt-4.1',
          stream: false,
          timeoutMs: 1000,
          maxRetries: 1,
          structuredOutput: {
            enabled: true,
            mode: 'json_object',
          },
        },
      },
    })

    expect(response.structuredOutput).toEqual({ result: 'ok' })
    expect((response.metadata as Record<string, unknown>).tokenUsage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cachedInputTokens: undefined,
      reasoningTokens: undefined,
    })
  })
})

describe('StreamingSupport', () => {
  it('aggregates streamed chunks into one response payload', async () => {
    const support = new StreamingSupport(new TokenUsageCalculator())

    async function* stream(): AsyncIterable<OpenAIChunkLike> {
      yield {
        model: 'gpt-4.1-mini',
        choices: [{ delta: { content: 'Hello ' } }],
      }
      yield {
        choices: [{ delta: { content: 'world' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 3,
          completion_tokens: 2,
          total_tokens: 5,
        },
      }
    }

    const result = await support.consume(stream())

    expect(result.content).toBe('Hello world')
    expect(result.finishReason).toBe('stop')
    expect(result.usage?.totalTokens).toBe(5)
  })
})

describe('RetryPolicy', () => {
  it('retries rate-limited requests before succeeding', async () => {
    const sleep = vi.fn(async () => undefined)
    const retry = new RetryPolicy(new RateLimitHandler(), sleep, { maxAttempts: 3 })
    let attempts = 0

    const result = await retry.execute(async () => {
      attempts += 1
      if (attempts === 1) {
        throw {
          status: 429,
          message: 'Rate limited',
        }
      }
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })
})

describe('OpenAIProvider', () => {
  it('implements IAIProvider for non-streaming requests', async () => {
    const client: IOpenAIChatClient = {
      create: vi.fn(async (): Promise<OpenAICompletionLike> => ({
        model: 'gpt-4.1-mini',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'Implemented successfully.',
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20,
        },
      })),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
      defaultModel: 'gpt-4.1-mini',
    })

    const response = await provider.execute(makeInput())

    expect(response.content).toBe('Implemented successfully.')
    expect((response.metadata as Record<string, unknown>).provider).toBe('openai')
  })

  it('supports structured JSON output end-to-end', async () => {
    const client: IOpenAIChatClient = {
      create: vi.fn(async (): Promise<OpenAICompletionLike> => ({
        model: 'gpt-4.1',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"plan":["step-1"]}',
            },
          },
        ],
      })),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
      defaultModel: 'gpt-4.1',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openai: {
              structuredOutput: {
                enabled: true,
                mode: 'json_object',
              },
            },
          },
        },
      }),
    )

    expect(response.structuredOutput).toEqual({ plan: ['step-1'] })
  })

  it('supports streaming requests', async () => {
    const seenChunks: string[] = []
    const client: IOpenAIChatClient = {
      create: vi.fn(async (): Promise<AsyncIterable<OpenAIChunkLike>> => ({
        async *[Symbol.asyncIterator]() {
          yield { model: 'gpt-4.1-mini', choices: [{ delta: { content: 'A' } }] }
          yield { choices: [{ delta: { content: 'B' }, finish_reason: 'stop' }] }
        },
      })),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
      onStreamChunk: (chunk) => {
        if (chunk.contentDelta) {
          seenChunks.push(chunk.contentDelta)
        }
      },
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openai: {
              stream: true,
            },
          },
        },
      }),
    )

    expect(response.content).toBe('AB')
    expect(seenChunks).toEqual(['A', 'B'])
  })

  it('maps abort-like failures to cancellation errors', async () => {
    const client: IOpenAIChatClient = {
      create: vi.fn(async () => {
        throw {
          name: 'AbortError',
          message: 'Request was aborted.',
        }
      }),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OpenAICancelledError)
  })

  it('maps repeated rate limits after retries to OpenAIRateLimitError', async () => {
    const client: IOpenAIChatClient = {
      create: vi.fn(async () => {
        throw {
          status: 429,
          message: 'Too many requests',
        }
      }),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
      retryPolicy: { maxAttempts: 2 },
      rateLimit: { defaultDelayMs: 1, maxDelayMs: 1 },
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OpenAIRateLimitError)
  })

  it('throws when structured output is requested but invalid JSON is returned', async () => {
    const client: IOpenAIChatClient = {
      create: vi.fn(async (): Promise<OpenAICompletionLike> => ({
        model: 'gpt-4.1',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'not-json',
            },
          },
        ],
      })),
    }

    const provider = new OpenAIProvider({
      client,
      logger,
      defaultModel: 'gpt-4.1',
    })

    await expect(
      provider.execute(
        makeInput({
          prompt: {
            ...prompt,
            metadata: {
              openai: {
                structuredOutput: {
                  enabled: true,
                  mode: 'json_object',
                },
              },
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(OpenAIStructuredOutputError)
  })
})
