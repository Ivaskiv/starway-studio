import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'
import { ProviderResolutionError } from './errors.js'
import { ProviderResolver } from './providerResolver.js'
import type {
  IAIProviderRegistry,
  ProviderId,
  ProviderRegistryDependencies,
} from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ProviderRegistry implements IAIProviderRegistry {
  private readonly logger: IRuntimeLogger
  private readonly cache = new Map<ProviderId, import('../../runtime/agent-runner/types.js').IAIProvider>()
  private readonly resolver

  constructor(private readonly deps: ProviderRegistryDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
    this.resolver = deps.resolver ?? new ProviderResolver()
  }

  getProvider() {
    const selection = this.resolveSelection().preferred
    const cached = this.cache.get(selection.providerId)
    if (cached) {
      this.logger.debug('provider_registry.cache_hit', {
        providerId: selection.providerId,
      })
      return cached
    }

    const provider = this.deps.factory.create(selection)
    this.cache.set(selection.providerId, provider)
    this.logger.info('provider_registry.provider_selected', {
      providerId: selection.providerId,
    })
    return provider
  }

  getSelectedProviderId(): ProviderId {
    return this.resolveSelection().preferred.providerId
  }

  private resolveSelection() {
    try {
      return this.resolver.resolve(this.deps.configuration)
    } catch (cause) {
      throw new ProviderResolutionError('Failed to resolve active AI provider.', cause)
    }
  }
}
