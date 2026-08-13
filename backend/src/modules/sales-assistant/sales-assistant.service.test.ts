import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const contentItemFindManyMock = vi.fn()
const validateOutputMock = vi.fn()
const callProviderSafeMock = vi.fn()
const resolveEnabledProvidersMock = vi.fn()
const providerExecuteMock = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    contentItem: {
      findMany: (...args: unknown[]) => contentItemFindManyMock(...args),
    },
    aiBehaviorProfile: {
      findFirst: vi.fn(),
    },
    salesAssistantGeneration: {
      create: vi.fn(),
    },
    userAiWorkspace: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/modules/sales-assistant/sales-assistant.validation.js', () => ({
  validateOutput: (...args: unknown[]) => validateOutputMock(...args),
}))

vi.mock('@/modules/sales-assistant/sales-assistant.providers.js', () => ({
  callProviderSafe: (...args: unknown[]) => callProviderSafeMock(...args),
  resolveEnabledProviders: (...args: unknown[]) => resolveEnabledProvidersMock(...args),
}))

vi.mock('@/modules/sales-assistant/prompts/contentType.prompts.js', () => ({
  buildPromptForType: vi.fn(() => ({
    system: 'SYSTEM_SENTINEL',
    user: 'USER_SENTINEL',
  })),
  resolveFreeFirstRoutingMode: vi.fn(() => 'PREMIUM'),
  resolveProvidersForMode: vi.fn(() => ['claude']),
}))

vi.mock('@starway/ai/providers', () => {
  class FakeAnthropicProvider {
    async execute(...args: unknown[]) {
      return providerExecuteMock(...args)
    }
  }

  class FakeOpenAIProvider {
    async execute(...args: unknown[]) {
      return providerExecuteMock(...args)
    }
  }

  class FakeGeminiProvider {
    async execute(...args: unknown[]) {
      return providerExecuteMock(...args)
    }
  }

  class FakeOllamaProvider {
    async execute(...args: unknown[]) {
      return providerExecuteMock(...args)
    }
  }

  class FakeOpenRouterProvider {
    async execute(...args: unknown[]) {
      return providerExecuteMock(...args)
    }
  }

  return {
    AnthropicProvider: FakeAnthropicProvider,
    OpenAIProvider: FakeOpenAIProvider,
    GeminiProvider: FakeGeminiProvider,
    OllamaProvider: FakeOllamaProvider,
    OpenRouterProvider: FakeOpenRouterProvider,
  }
})

describe('generateContent sales canonical runner transition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contentItemFindManyMock.mockResolvedValue([])
    validateOutputMock.mockResolvedValue({ valid: true })
    resolveEnabledProvidersMock.mockReturnValue(['claude'])
    providerExecuteMock.mockResolvedValue({
      content: 'CANONICAL_RESULT',
      metadata: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        tokenUsage: {
          inputTokens: 11,
          outputTokens: 7,
          totalTokens: 18,
        },
      },
    })
    process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER = 'openai'
  })

  afterEach(() => {
    delete process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER
  })

  it('routes sales generation through canonical AgentRunner and skips direct callProviderSafe', async () => {
    const { AgentRunner } = await import('@starway/ai')
    const runSpy = vi.spyOn(AgentRunner.prototype, 'run')
    const { generateContent } = await import('./sales-assistant.service.js')

    const result = await generateContent(
      null,
      {
        contentType: 'sales',
        selectedProtocol: 'raw_truth',
        selectedOutputs: ['sales'],
        userContext: 'USER_CONTEXT_SENTINEL',
        userRequest: 'USER_REQUEST_SENTINEL',
      },
      {
        key: 'STARWAY_OGOLENA_PRAVDA',
        systemAnchor: 'anchor',
        supportedProtocols: {},
        supportedOutputs: ['sales'],
      },
      'user-1',
    )

    expect(runSpy).toHaveBeenCalledTimes(1)
    expect(providerExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'sales_agent',
        }),
        prompt: expect.objectContaining({
          content: 'SYSTEM_SENTINEL',
          metadata: expect.objectContaining({
            execution: expect.objectContaining({
              userPrompt: 'USER_SENTINEL',
              strategyTier: 'standard',
              contentType: 'sales',
            }),
          }),
        }),
      }),
    )
    expect(callProviderSafeMock).not.toHaveBeenCalled()
    expect(result.content).toBe('CANONICAL_RESULT')
    expect(result.modelUsed).toBe('claude')
    expect(result.tokensUsed).toBe(18)
    expect(result.multiModelResults).toEqual([
      expect.objectContaining({
        modelKey: 'claude',
        content: 'CANONICAL_RESULT',
      }),
    ])
  })

  it('routes landing generation through canonical AgentRunner and skips direct callProviderSafe', async () => {
    const { AgentRunner } = await import('@starway/ai')
    const runSpy = vi.spyOn(AgentRunner.prototype, 'run')
    const { generateContent } = await import('./sales-assistant.service.js')

    const result = await generateContent(
      null,
      {
        contentType: 'landing',
        selectedProtocol: 'raw_truth',
        selectedOutputs: ['landing'],
        userContext: 'LANDING_CONTEXT_SENTINEL',
        userRequest: 'LANDING_REQUEST_SENTINEL',
      },
      {
        key: 'STARWAY_OGOLENA_PRAVDA',
        systemAnchor: 'anchor',
        supportedProtocols: {},
        supportedOutputs: ['landing'],
      },
      'user-2',
    )

    expect(runSpy).toHaveBeenCalledTimes(1)
    expect(providerExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'content_agent',
        }),
        prompt: expect.objectContaining({
          content: 'SYSTEM_SENTINEL',
          metadata: expect.objectContaining({
            execution: expect.objectContaining({
              userPrompt: 'USER_SENTINEL',
              strategyTier: 'standard',
              contentType: 'landing',
            }),
          }),
        }),
      }),
    )
    expect(callProviderSafeMock).not.toHaveBeenCalled()
    expect(result.content).toBe('CANONICAL_RESULT')
    expect(result.modelUsed).toBe('claude')
    expect(result.tokensUsed).toBe(18)
    expect(result.multiModelResults).toEqual([
      expect.objectContaining({
        modelKey: 'claude',
        content: 'CANONICAL_RESULT',
      }),
    ])
  })
})
