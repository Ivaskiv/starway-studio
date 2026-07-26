import { describe, expect, it, vi } from 'vitest'

import type { AgentDefinition, ResolvedPrompt } from '../../runtime/agent-runner/types.js'
import type { ContextSourceKind, LoadedExecutionContext } from '../../runtime/context-loader/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import {
  OllamaCancelledError,
  OllamaRateLimitError,
  OllamaStructuredOutputError,
  OllamaTimeoutError,
} from './errors.js'
import { OllamaProvider } from './ollamaProvider.js'
import { OllamaRequestMapper } from './requestMapper.js'
import { OllamaResponseMapper } from './responseMapper.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { IOllamaClient, OllamaChunkLike, OllamaResponseLike } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const task: EngineeringTask = {
  id: 'task-ollama-1',
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

describe('OllamaRequestMapper', () => {
  it('maps local model and streaming options into an Ollama request', () => {
    const mapper = new OllamaRequestMapper({
      defaultModel: 'llama3.1:8b',
    })

    const request = mapper.map(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            ollama: {
              model: 'qwen2.5-coder:7b',
              stream: true,
            },
          },
        },
      }),
    )

    expect(request.body.model).toBe('qwen2.5-coder:7b')
    expect(request.body.stream).toBe(true)
    expect(request.body.system).toBe(prompt.content)
  })
})

describe('OllamaResponseMapper', () => {
  it('parses structured JSON output from a normal response', () => {
    const mapper = new OllamaResponseMapper(new TokenUsageCalculator(), new StructuredOutputParser())

    const response = mapper.mapResponse({
      response: {
        model: 'llama3.1:8b',
        response: '{"result":"ok"}',
        prompt_eval_count: 10,
        eval_count: 5,
      },
      request: {
        body: {} as never,
        requestOptions: { timeoutMs: 1000 },
        executionOptions: {
          model: 'llama3.1:8b',
          stream: false,
          timeoutMs: 1000,
          structuredOutput: {
            enabled: true,
          },
        },
      },
    })

    expect(response.structuredOutput).toEqual({ result: 'ok' })
    expect((response.metadata as Record<string, unknown>).tokenUsage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    })
  })
})

describe('StreamingSupport', () => {
  it('aggregates streamed chunks into one response payload', async () => {
    const support = new StreamingSupport(new TokenUsageCalculator())

    async function* stream(): AsyncIterable<OllamaChunkLike> {
      yield {
        model: 'llama3.1:8b',
        response: 'Hello ',
      }
      yield {
        response: 'world',
        done: true,
        prompt_eval_count: 3,
        eval_count: 2,
      }
    }

    const result = await support.consume(stream())

    expect(result.content).toBe('Hello world')
    expect(result.usage?.totalTokens).toBe(5)
  })
})

describe('RetryPolicy', () => {
  it('retries transient failures before succeeding', async () => {
    const sleep = vi.fn(async () => undefined)
    const retry = new RetryPolicy(sleep, { maxAttempts: 3 })
    let attempts = 0

    const result = await retry.execute(async () => {
      attempts += 1
      if (attempts === 1) {
        throw { status: 503, message: 'Unavailable' }
      }
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })
})

describe('OllamaProvider', () => {
  it('implements IAIProvider for non-streaming requests', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async (): Promise<OllamaResponseLike> => ({
        model: 'llama3.1:8b',
        response: 'Implemented successfully.',
        prompt_eval_count: 12,
        eval_count: 8,
      })),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    const response = await provider.execute(makeInput())

    expect(response.content).toBe('Implemented successfully.')
    expect((response.metadata as Record<string, unknown>).provider).toBe('ollama')
  })

  it('supports structured JSON output end-to-end', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async (): Promise<OllamaResponseLike> => ({
        model: 'llama3.1:8b',
        response: '{"plan":["step-1"]}',
      })),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            ollama: {
              structuredOutput: {
                enabled: true,
              },
            },
          },
        },
      }),
    )

    expect(response.structuredOutput).toEqual({ plan: ['step-1'] })
  })

  it('supports streaming responses', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async () => ({
        async *[Symbol.asyncIterator](): AsyncIterator<OllamaChunkLike> {
          yield { model: 'llama3.1:8b', response: 'Hello ' }
          yield { response: 'stream', done: true, prompt_eval_count: 6, eval_count: 2 }
        },
      })),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            ollama: {
              stream: true,
            },
          },
        },
      }),
    )

    expect(response.content).toBe('Hello stream')
    expect((response.metadata as Record<string, unknown>).streamed).toBe(true)
  })

  it('maps abort-like failures into OllamaCancelledError', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async () => {
        throw { name: 'AbortError', message: 'Aborted' }
      }),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OllamaCancelledError)
  })

  it('maps repeated rate limits into OllamaRateLimitError', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async () => {
        throw { status: 429, message: 'Too many requests' }
      }),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
      retryPolicy: {
        maxAttempts: 2,
      },
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OllamaRateLimitError)
  })

  it('maps timeout failures into OllamaTimeoutError', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async () => {
        throw { name: 'TimeoutError', message: 'Timed out', timedOut: true }
      }),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(OllamaTimeoutError)
  })

  it('throws OllamaStructuredOutputError for invalid JSON when structured output is required', async () => {
    const client: IOllamaClient = {
      generate: vi.fn(async (): Promise<OllamaResponseLike> => ({
        model: 'llama3.1:8b',
        response: 'not json',
      })),
    }

    const provider = new OllamaProvider({
      client,
      logger,
      defaultModel: 'llama3.1:8b',
    })

    await expect(
      provider.execute(
        makeInput({
          prompt: {
            ...prompt,
            metadata: {
              ollama: {
                structuredOutput: {
                  enabled: true,
                },
              },
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(OllamaStructuredOutputError)
  })
})
