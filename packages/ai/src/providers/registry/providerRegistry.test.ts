import { describe, expect, it, vi } from 'vitest'

import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import { AnthropicProvider } from '../anthropic/anthropicProvider.js'
import { GeminiProvider } from '../gemini/geminiProvider.js'
import { OllamaProvider } from '../ollama/ollamaProvider.js'
import { OpenAIProvider } from '../openai/openaiProvider.js'
import { OpenRouterProvider } from '../openrouter/openrouterProvider.js'
import {
  ProviderConfigurationError,
  ProviderFactoryError,
  ProviderResolutionError,
} from './errors.js'
import { ProviderFactory } from './providerFactory.js'
import { ProviderRegistry } from './providerRegistry.js'
import { ProviderResolver } from './providerResolver.js'
import type { ProviderConfiguration } from './types.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('ProviderResolver', () => {
  it('resolves the selected provider from configuration', () => {
    const resolver = new ProviderResolver()

    const selection = resolver.resolve({
      selectedProvider: 'ollama',
      providers: {
        ollama: {
          config: {
            defaultModel: 'llama3.1:8b',
          },
        },
      },
    })

    expect(selection.preferred.providerId).toBe('ollama')
    expect(selection.preferred.config).toEqual({
      defaultModel: 'llama3.1:8b',
    })
    expect(selection.fallback).toBeNull()
  })

  it('fails when the selected provider is not configured', () => {
    const resolver = new ProviderResolver()

    expect(() =>
      resolver.resolve({
        selectedProvider: 'openai',
        providers: {},
      }),
    ).toThrow(ProviderConfigurationError)
  })

  it('resolves provider selection through capability mapping using preferred and fallback targets', () => {
    const resolver = new ProviderResolver()

    const selection = resolver.resolve({
      selectedProvider: 'openai',
      selectedCapability: 'deep_reasoning',
      providers: {
        anthropic: {
          config: {
            apiKey: 'test-anthropic',
          },
        },
        openai: {
          config: {
            apiKey: 'test-openai',
          },
        },
      },
      capabilityMappings: {
        deep_reasoning: {
          preferred: {
            provider: 'anthropic',
            model: 'claude-opus',
          },
          fallback: {
            provider: 'openai',
            model: 'gpt-5.5',
          },
        },
      },
    })

    expect(selection.preferred.providerId).toBe('anthropic')
    expect(selection.preferred.config).toMatchObject({
      apiKey: 'test-anthropic',
      defaultModel: 'claude-opus',
    })
    expect(selection.fallback).toMatchObject({
      providerId: 'openai',
      config: {
        apiKey: 'test-openai',
        defaultModel: 'gpt-5.5',
      },
    })
  })

  it('fails when selected capability mapping is missing', () => {
    const resolver = new ProviderResolver()

    expect(() =>
      resolver.resolve({
        selectedProvider: 'openai',
        selectedCapability: 'missing_capability',
        providers: {
          openai: {
            config: {},
          },
        },
      }),
    ).toThrow(ProviderConfigurationError)
  })

  it('returns null fallback when capability does not define one', () => {
    const resolver = new ProviderResolver()

    const selection = resolver.resolve({
      selectedProvider: 'openai',
      selectedCapability: 'classification',
      providers: {
        ollama: {
          config: {
            baseUrl: 'http://127.0.0.1:11434',
          },
        },
      },
      capabilityMappings: {
        classification: {
          preferred: {
            provider: 'ollama',
            model: 'qwen',
          },
        },
      },
    })

    expect(selection.preferred.providerId).toBe('ollama')
    expect(selection.fallback).toBeNull()
  })
})

describe('ProviderFactory', () => {
  it('creates OpenAI provider instances', () => {
    const factory = new ProviderFactory({ logger })
    const provider = factory.create({
      providerId: 'openai',
      config: {
        apiKey: 'test-openai',
      },
    })

    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('creates Anthropic provider instances', () => {
    const factory = new ProviderFactory({ logger })
    const provider = factory.create({
      providerId: 'anthropic',
      config: {
        apiKey: 'test-anthropic',
      },
    })

    expect(provider).toBeInstanceOf(AnthropicProvider)
  })

  it('creates Gemini provider instances', () => {
    const factory = new ProviderFactory({ logger })
    const provider = factory.create({
      providerId: 'gemini',
      config: {
        apiKey: 'test-gemini',
      },
    })

    expect(provider).toBeInstanceOf(GeminiProvider)
  })

  it('creates Ollama provider instances', () => {
    const factory = new ProviderFactory({ logger })
    const provider = factory.create({
      providerId: 'ollama',
      config: {
        baseUrl: 'http://127.0.0.1:11434',
      },
    })

    expect(provider).toBeInstanceOf(OllamaProvider)
  })

  it('creates OpenRouter provider instances', () => {
    const factory = new ProviderFactory({ logger })
    const provider = factory.create({
      providerId: 'openrouter',
      config: {
        apiKey: 'test-openrouter',
      },
    })

    expect(provider).toBeInstanceOf(OpenRouterProvider)
  })

  it('uses custom creators when provided', () => {
    const provider: IAIProvider = {
      execute: vi.fn(),
    }
    const factory = new ProviderFactory({
      creators: {
        openai: vi.fn(() => provider),
      },
      logger,
    })

    const result = factory.create({
      providerId: 'openai',
      config: {},
    })

    expect(result).toBe(provider)
  })
})

describe('ProviderRegistry', () => {
  it('selects and caches the provider resolved from configuration', () => {
    const provider: IAIProvider = {
      execute: vi.fn(),
    }
    const factory = {
      create: vi.fn(() => provider),
    }
    const registry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'ollama',
        providers: {
          ollama: {
            config: {
              baseUrl: 'http://127.0.0.1:11434',
            },
          },
        },
      },
      factory,
      logger,
    })

    const first = registry.getProvider()
    const second = registry.getProvider()

    expect(first).toBe(provider)
    expect(second).toBe(provider)
    expect(factory.create).toHaveBeenCalledTimes(1)
    expect(registry.getSelectedProviderId()).toBe('ollama')
  })

  it('switches provider when configuration changes', () => {
    const configuration: ProviderConfiguration = {
      selectedProvider: 'openai',
      providers: {
        openai: { config: {} },
        gemini: { config: {} },
      },
    }

    const openaiProvider: IAIProvider = { execute: vi.fn() }
    const geminiProvider: IAIProvider = { execute: vi.fn() }
    const factory = {
      create: vi.fn((selection) =>
        selection.providerId === 'openai' ? openaiProvider : geminiProvider,
      ),
    }

    const registry = new ProviderRegistry({
      configuration,
      factory,
      logger,
    })

    expect(registry.getProvider()).toBe(openaiProvider)

    configuration.selectedProvider = 'gemini'

    expect(registry.getProvider()).toBe(geminiProvider)
    expect(factory.create).toHaveBeenCalledTimes(2)
  })

  it('wraps resolver failures as ProviderResolutionError', () => {
    const registry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'anthropic',
        providers: {},
      },
      factory: {
        create: vi.fn(),
      },
      logger,
    })

    expect(() => registry.getProvider()).toThrow(ProviderResolutionError)
  })

  it('surfaces factory failures as ProviderFactoryError', () => {
    const registry = new ProviderRegistry({
      configuration: {
        selectedProvider: 'openrouter',
        providers: {
          openrouter: {
            config: {},
          },
        },
      },
      factory: {
        create: vi.fn(() => {
          throw new ProviderFactoryError('factory failed')
        }),
      },
      logger,
    })

    expect(() => registry.getProvider()).toThrow(ProviderFactoryError)
  })
})
