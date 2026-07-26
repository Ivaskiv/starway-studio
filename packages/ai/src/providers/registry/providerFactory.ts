import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import { AnthropicProvider } from '../anthropic/anthropicProvider.js'
import { GeminiProvider } from '../gemini/geminiProvider.js'
import { OllamaProvider } from '../ollama/ollamaProvider.js'
import { OpenAIProvider } from '../openai/openaiProvider.js'
import { OpenRouterProvider } from '../openrouter/openrouterProvider.js'
import { ProviderFactoryError } from './errors.js'
import type {
  IProviderFactory,
  ProviderFactoryDependencies,
  ProviderId,
  ResolvedProviderSelection,
} from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ProviderFactory implements IProviderFactory {
  private readonly logger: IRuntimeLogger
  private readonly creators: NonNullable<ProviderFactoryDependencies['creators']>

  constructor(deps: ProviderFactoryDependencies = {}) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.creators = {
      openai: (config) => new OpenAIProvider(config),
      anthropic: (config) => new AnthropicProvider(config),
      gemini: (config) => new GeminiProvider(config),
      ollama: (config) => new OllamaProvider(config),
      openrouter: (config) => new OpenRouterProvider(config),
      ...(deps.creators ?? {}),
    }
  }

  create<TProviderId extends ProviderId>(selection: ResolvedProviderSelection<TProviderId>) {
    const creator = this.creators[selection.providerId] as
      | ((config: ResolvedProviderSelection<TProviderId>['config']) => import('../../runtime/agent-runner/types.js').IAIProvider)
      | undefined

    if (!creator) {
      throw new ProviderFactoryError(
        `No provider factory is registered for '${selection.providerId}'.`,
      )
    }

    try {
      const provider = creator(selection.config)
      this.logger.info('provider_factory.provider_created', {
        providerId: selection.providerId,
      })
      return provider
    } catch (cause) {
      throw new ProviderFactoryError(
        `Failed to create provider '${selection.providerId}'.`,
        cause,
      )
    }
  }
}

