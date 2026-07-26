import { describe, expect, it, vi } from 'vitest'

import type { AgentDefinition, ResolvedPrompt } from '../../runtime/agent-runner/types.js'
import type { ContextSourceKind, LoadedExecutionContext } from '../../runtime/context-loader/types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import {
  GeminiCancelledError,
  GeminiRateLimitError,
  GeminiStructuredOutputError,
} from './errors.js'
import { GeminiProvider } from './geminiProvider.js'
import { GeminiRequestMapper } from './requestMapper.js'
import { GeminiResponseMapper } from './responseMapper.js'
import { RateLimitHandler } from './rateLimitHandler.js'
import { RetryPolicy } from './retryPolicy.js'
import { StreamingSupport } from './streamingSupport.js'
import { StructuredOutputParser } from './structuredOutput.js'
import { TokenUsageCalculator } from './tokenUsage.js'
import type { GeminiResponseLike, IGeminiClient, IGeminiModel } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const task: EngineeringTask = {
  id: 'task-gemini-1',
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

function createClient(model: IGeminiModel): IGeminiClient {
  return {
    getModel: vi.fn(() => model),
  }
}

describe('GeminiRequestMapper', () => {
  it('maps structured output and model overrides into a Gemini request', () => {
    const mapper = new GeminiRequestMapper({
      defaultModel: 'gemini-2.5-pro',
    })

    const request = mapper.map(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            gemini: {
              model: 'gemini-2.5-pro',
              stream: true,
              structuredOutput: {
                enabled: true,
                schema: { type: 'OBJECT' },
              },
            },
          },
        },
      }),
    )

    expect(request.model).toBe('gemini-2.5-pro')
    expect(request.body.generationConfig?.responseMimeType).toBe('application/json')
    expect(request.body.generationConfig?.responseSchema).toEqual({ type: 'OBJECT' })
  })
})

describe('GeminiResponseMapper', () => {
  it('parses structured JSON output from a normal response', () => {
    const mapper = new GeminiResponseMapper(new TokenUsageCalculator(), new StructuredOutputParser())

    const response = mapper.mapResponse({
      response: {
        text: () => '{"result":"ok"}',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      },
      request: {
        model: 'gemini-2.5-pro',
        body: {} as never,
        requestOptions: {},
        executionOptions: {
          model: 'gemini-2.5-pro',
          stream: false,
          timeoutMs: 1000,
          structuredOutput: {
            enabled: true,
            schema: { type: 'OBJECT' },
          },
        },
      },
    })

    expect(response.structuredOutput).toEqual({ result: 'ok' })
    expect((response.metadata as Record<string, unknown>).tokenUsage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cachedContentTokens: undefined,
    })
  })
})

describe('StreamingSupport', () => {
  it('aggregates streamed chunks into one response payload', async () => {
    const support = new StreamingSupport(new TokenUsageCalculator())

    async function* stream(): AsyncIterable<GeminiResponseLike> {
      yield {
        text: () => 'Hello ',
        usageMetadata: {
          promptTokenCount: 3,
          candidatesTokenCount: 1,
          totalTokenCount: 4,
        },
      }
      yield {
        text: () => 'world',
        usageMetadata: {
          promptTokenCount: 3,
          candidatesTokenCount: 2,
          totalTokenCount: 5,
        },
      }
    }

    const result = await support.consume(stream())

    expect(result.content).toBe('Hello world')
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
        throw { status: 429, message: 'Rate limited' }
      }
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })
})

describe('GeminiProvider', () => {
  it('implements IAIProvider for non-streaming requests', async () => {
    const model: IGeminiModel = {
      generateContent: vi.fn(async () => ({
        response: {
          text: () => 'Implemented successfully.',
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 8,
            totalTokenCount: 20,
          },
        },
      })),
      generateContentStream: vi.fn(),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
      logger,
      defaultModel: 'gemini-2.5-pro',
    })

    const response = await provider.execute(makeInput())

    expect(response.content).toBe('Implemented successfully.')
    expect((response.metadata as Record<string, unknown>).provider).toBe('gemini')
  })

  it('supports structured JSON output end-to-end', async () => {
    const model: IGeminiModel = {
      generateContent: vi.fn(async () => ({
        response: {
          text: () => '{"plan":["step-1"]}',
        },
      })),
      generateContentStream: vi.fn(),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
      logger,
      defaultModel: 'gemini-2.5-pro',
    })

    const response = await provider.execute(
      makeInput({
        prompt: {
          ...prompt,
          metadata: {
            gemini: {
              structuredOutput: {
                enabled: true,
                schema: { type: 'OBJECT' },
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
    const model: IGeminiModel = {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(async () => ({
        stream: (async function* () {
          yield { text: () => 'A' }
          yield { text: () => 'B' }
        })(),
        response: Promise.resolve({ text: () => 'AB' }),
      })),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
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
            gemini: {
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
    const model: IGeminiModel = {
      generateContent: vi.fn(async () => {
        throw { name: 'AbortError', message: 'Request aborted.' }
      }),
      generateContentStream: vi.fn(),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
      logger,
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(GeminiCancelledError)
  })

  it('maps repeated rate limits to GeminiRateLimitError', async () => {
    const model: IGeminiModel = {
      generateContent: vi.fn(async () => {
        throw { status: 429, message: 'Too many requests' }
      }),
      generateContentStream: vi.fn(),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
      logger,
      retryPolicy: { maxAttempts: 2 },
      rateLimit: { defaultDelayMs: 1, maxDelayMs: 1 },
    })

    await expect(provider.execute(makeInput())).rejects.toBeInstanceOf(GeminiRateLimitError)
  })

  it('throws when structured output is requested but invalid JSON is returned', async () => {
    const model: IGeminiModel = {
      generateContent: vi.fn(async () => ({
        response: {
          text: () => 'not-json',
        },
      })),
      generateContentStream: vi.fn(),
    }

    const provider = new GeminiProvider({
      client: createClient(model),
      logger,
      defaultModel: 'gemini-2.5-pro',
    })

    await expect(
      provider.execute(
        makeInput({
          prompt: {
            ...prompt,
            metadata: {
              gemini: {
                structuredOutput: {
                  enabled: true,
                  schema: { type: 'OBJECT' },
                },
              },
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(GeminiStructuredOutputError)
  })
})
