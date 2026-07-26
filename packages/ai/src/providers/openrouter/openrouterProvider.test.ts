import { describe, expect, it, vi } from 'vitest'

import type { ContextSourceKind, LoadedExecutionContext } from '../../runtime/context-loader/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import type { AgentDefinition, ResolvedPrompt } from '../../runtime/agent-runner/types.js'
import {
  OpenRouterCancelledError,
  OpenRouterRateLimitError,
  OpenRouterStructuredOutputError,
} from './errors.js'
import { OpenRouterProvider } from './openrouterProvider.js'
import { OpenRouterRequestMapper } from './requestMapper.js'
import { OpenRouterResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { IOpenRouterChatClient, OpenRouterChunkLike, OpenRouterCompletionLike } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const task: EngineeringTask = {
  id: 'task-openrouter-1',
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

describe('OpenRouterRequestMapper', () => {
  it('maps route aliases into upstream models via configuration', () => {
    const mapper = new OpenRouterRequestMapper({
      defaultModel: 'openai/gpt-4.1-mini',
      routing: {
        defaultRoute: 'fast',
        routes: {
          fast: 'openai/gpt-4.1-mini',
          smart: 'anthropic/claude-sonnet-4',
        },
      },
    })

    const request = mapper.map(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openrouter: {
              route: 'smart',
              stream: true,
            },
          },
        },
      }),
    )

    expect(request.executionOptions.route).toBe('smart')
    expect(request.body.model).toBe('anthropic/claude-sonnet-4')
    expect(request.body.stream).toBe(true)
  })

  it('uses the configured default route when no explicit route is provided', () => {
    const mapper = new OpenRouterRequestMapper({
      defaultModel: 'openai/gpt-4.1-mini',
      routing: {
        defaultRoute: 'fast',
        routes: {
          fast: 'google/gemini-2.5-pro',
        },
      },
    })

    const request = mapper.map(makeInput())

    expect(request.executionOptions.route).toBe('fast')
    expect(request.body.model).toBe('google/gemini-2.5-pro')
  })
})

describe('OpenRouterResponseMapper', () => {
  it('parses structured JSON output from a normal completion', () => {
    const mapper = new OpenRouterResponseMapper(new TokenUsageCalculator(), new StructuredOutputParser())

    const response = mapper.mapCompletion({
      response: {
        model: 'openai/gpt-4.1',
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
          model: 'openai/gpt-4.1',
          route: 'fast',
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
    expect((response.metadata as Record<string, unknown>).route).toBe('fast')
  })
})

describe('StreamingSupport', () => {
  it('aggregates streamed chunks into one response payload', async () => {
    const support = new StreamingSupport(new TokenUsageCalculator())

    async function* stream(): AsyncIterable<OpenRouterChunkLike> {
      yield {
        model: 'openai/gpt-4.1-mini',
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

describe('OpenRouterProvider', () => {
  it('implements IAIProvider for non-streaming requests', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async (): Promise<OpenRouterCompletionLike> => ({
        model: 'google/gemini-2.5-pro',
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

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
      routing: {
        routes: {
          smart: 'google/gemini-2.5-pro',
        },
      },
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openrouter: {
              route: 'smart',
            },
          },
        },
      }),
    )

    expect(response.content).toBe('Implemented successfully.')
    expect((response.metadata as Record<string, unknown>).provider).toBe('openrouter')
  })

  it('passes route metadata through completion responses', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async (): Promise<OpenRouterCompletionLike> => ({
        model: 'anthropic/claude-sonnet-4',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'Routed successfully.',
            },
          },
        ],
      })),
    }

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
      routing: {
        routes: {
          premium: 'anthropic/claude-sonnet-4',
        },
      },
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openrouter: {
              route: 'premium',
            },
          },
        },
      }),
    )

    expect((response.metadata as Record<string, unknown>).route).toBe('premium')
  })

  it('supports structured JSON output end-to-end', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async (): Promise<OpenRouterCompletionLike> => ({
        model: 'openai/gpt-4.1',
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

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openrouter: {
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

  it('supports streaming responses', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async () => ({
        async *[Symbol.asyncIterator](): AsyncIterator<OpenRouterChunkLike> {
          yield {
            model: 'openai/gpt-4.1-mini',
            choices: [{ delta: { content: 'Hello ' } }],
          }
          yield {
            choices: [{ delta: { content: 'stream' }, finish_reason: 'stop' }],
            usage: {
              prompt_tokens: 6,
              completion_tokens: 2,
              total_tokens: 8,
            },
          }
        },
      })),
    }

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            openrouter: {
              stream: true,
            },
          },
        },
      }),
    )

    expect(response.content).toBe('Hello stream')
    expect((response.metadata as Record<string, unknown>).streamed).toBe(true)
  })

  it('maps abort-like failures into OpenRouterCancelledError', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async () => {
        throw { name: 'AbortError', message: 'Aborted' }
      }),
    }

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OpenRouterCancelledError)
  })

  it('maps repeated rate limits into OpenRouterRateLimitError', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async () => {
        throw { status: 429, message: 'Too many requests' }
      }),
    }

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
      retryPolicy: {
        maxAttempts: 2,
      },
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OpenRouterRateLimitError)
  })

  it('throws OpenRouterStructuredOutputError for invalid JSON when structured output is required', async () => {
    const client: IOpenRouterChatClient = {
      create: vi.fn(async (): Promise<OpenRouterCompletionLike> => ({
        model: 'openai/gpt-4.1-mini',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'not json',
            },
          },
        ],
      })),
    }

    const provider = new OpenRouterProvider({
      client,
      logger,
      defaultModel: 'openai/gpt-4.1-mini',
    })

    await expect(
      provider.execute(
        makeInput({
          prompt: {
            ...prompt,
            metadata: {
              openrouter: {
                structuredOutput: {
                  enabled: true,
                  mode: 'json_object',
                },
              },
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(OpenRouterStructuredOutputError)
  })
})
