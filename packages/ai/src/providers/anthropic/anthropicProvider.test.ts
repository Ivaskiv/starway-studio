import { describe, expect, it, vi } from 'vitest'

import type { AgentDefinition, ResolvedPrompt } from '../../runtime/agent-runner/types.js'
import type { ContextSourceKind, LoadedExecutionContext } from '../../runtime/context-loader/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import {
  AnthropicCancelledError,
  AnthropicRateLimitError,
  AnthropicStructuredOutputError,
} from './errors.js'
import { AnthropicProvider } from './anthropicProvider.js'
import { AnthropicRequestMapper } from './requestMapper.js'
import { AnthropicResponseMapper } from './responseMapper.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { AnthropicMessageLike, AnthropicStreamEventLike, IAnthropicMessagesClient } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const task: EngineeringTask = {
  id: 'task-anthropic-1',
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

describe('AnthropicRequestMapper', () => {
  it('maps structured output and model overrides into a messages request', () => {
    const mapper = new AnthropicRequestMapper({
      defaultModel: 'claude-sonnet-4-5',
    })

    const request = mapper.map(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            anthropic: {
              model: 'claude-opus-4-6',
              stream: true,
              structuredOutput: {
                enabled: true,
                schema: { type: 'object' },
              },
            },
          },
        },
      }),
    )

    expect(request.body.model).toBe('claude-opus-4-6')
    expect(request.body.stream).toBe(true)
    expect(request.body.output_config).toEqual({
      format: {
        type: 'json_schema',
        schema: { type: 'object' },
      },
    })
  })
})

describe('AnthropicResponseMapper', () => {
  it('parses structured JSON output from a normal message', () => {
    const mapper = new AnthropicResponseMapper(new TokenUsageCalculator(), new StructuredOutputParser())

    const response = mapper.mapMessage({
      response: {
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '{"result":"ok"}' }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      },
      request: {
        body: {} as never,
        requestOptions: {},
        executionOptions: {
          model: 'claude-sonnet-4-5',
          stream: false,
          timeoutMs: 1000,
          maxRetries: 1,
          structuredOutput: {
            enabled: true,
            schema: { type: 'object' },
          },
        },
      },
    })

    expect(response.structuredOutput).toEqual({ result: 'ok' })
    expect((response.metadata as Record<string, unknown>).tokenUsage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cacheCreationInputTokens: undefined,
      cacheReadInputTokens: undefined,
    })
  })
})

describe('StreamingSupport', () => {
  it('aggregates streamed deltas into one response payload', async () => {
    const support = new StreamingSupport(new TokenUsageCalculator())

    async function* stream(): AsyncIterable<AnthropicStreamEventLike> {
      yield {
        type: 'message_start',
        message: {
          model: 'claude-sonnet-4-5',
          usage: { input_tokens: 3, output_tokens: 0 },
        },
      }
      yield {
        type: 'content_block_delta',
        delta: { text: 'Hello ' },
      }
      yield {
        type: 'content_block_delta',
        delta: { text: 'world' },
      }
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: 3, output_tokens: 2 },
      }
    }

    const result = await support.consume(stream())

    expect(result.content).toBe('Hello world')
    expect(result.stopReason).toBe('end_turn')
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

describe('AnthropicProvider', () => {
  it('implements IAIProvider for non-streaming requests', async () => {
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async (): Promise<AnthropicMessageLike> => ({
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Implemented successfully.' }],
        usage: {
          input_tokens: 12,
          output_tokens: 8,
        },
      })),
    }

    const provider = new AnthropicProvider({
      client,
      logger,
      defaultModel: 'claude-sonnet-4-5',
    })

    const response = await provider.execute(makeInput())

    expect(response.content).toBe('Implemented successfully.')
    expect((response.metadata as Record<string, unknown>).provider).toBe('anthropic')
  })

  it('supports structured JSON output end-to-end', async () => {
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async (): Promise<AnthropicMessageLike> => ({
        model: 'claude-opus-4-6',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '{"plan":["step-1"]}' }],
      })),
    }

    const provider = new AnthropicProvider({
      client,
      logger,
      defaultModel: 'claude-opus-4-6',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            anthropic: {
              structuredOutput: {
                enabled: true,
                schema: { type: 'object' },
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
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async (): Promise<AsyncIterable<AnthropicStreamEventLike>> => ({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'A' } }
          yield { type: 'content_block_delta', delta: { text: 'B' } }
          yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 1, output_tokens: 2 } }
        },
      })),
    }

    const provider = new AnthropicProvider({
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
            anthropic: {
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
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async () => {
        throw {
          name: 'AbortError',
          message: 'Request was aborted.',
        }
      }),
    }

    const provider = new AnthropicProvider({
      client,
      logger,
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(AnthropicCancelledError)
  })

  it('maps repeated rate limits after retries to AnthropicRateLimitError', async () => {
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async () => {
        throw {
          status: 429,
          message: 'Too many requests',
        }
      }),
    }

    const provider = new AnthropicProvider({
      client,
      logger,
      retryPolicy: { maxAttempts: 2 },
      rateLimit: { defaultDelayMs: 1, maxDelayMs: 1 },
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(AnthropicRateLimitError)
  })

  it('throws when structured output is requested but invalid JSON is returned', async () => {
    const client: IAnthropicMessagesClient = {
      create: vi.fn(async (): Promise<AnthropicMessageLike> => ({
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'not-json' }],
      })),
    }

    const provider = new AnthropicProvider({
      client,
      logger,
      defaultModel: 'claude-sonnet-4-5',
    })

    await expect(
      provider.execute(
        makeInput({
          prompt: {
            ...prompt,
            metadata: {
              anthropic: {
                structuredOutput: {
                  enabled: true,
                  schema: { type: 'object' },
                },
              },
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(AnthropicStructuredOutputError)
  })
})
