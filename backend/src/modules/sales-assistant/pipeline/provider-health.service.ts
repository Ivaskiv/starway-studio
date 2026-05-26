import { PROVIDER_REGISTRY } from '@/modules/sales-assistant/pipeline/provider-registry.js'
import type {
  ProviderFeature,
  ProviderKey,
  ProviderLifecycleState,
  ProviderRuntimeHealth,
} from '@/modules/sales-assistant/pipeline/provider-lifecycle.types.js'

type FailureClass =
  | 'BALANCE_EXHAUSTED'
  | 'RATE_LIMIT'
  | 'INVALID_API_KEY'
  | 'TEMPORARY_UNAVAILABLE'
  | 'TIMEOUT'
  | 'FEATURE_NOT_SUPPORTED'
  | 'PROVIDER_DOWN'

class ProviderHealthService {
  private readonly health = new Map<ProviderKey, ProviderRuntimeHealth>()

  constructor() {
    this.reset()
  }

  reset(): void {
    this.health.clear()
    for (const provider of Object.keys(PROVIDER_REGISTRY) as ProviderKey[]) {
      const enabled = PROVIDER_REGISTRY[provider].enabled
      this.health.set(provider, {
        provider,
        state: enabled ? 'ACTIVE' : 'DISABLED',
        cooldownUntil: null,
        lastError: null,
        failures: 0,
      })
    }
  }

  supports(provider: ProviderKey, feature: ProviderFeature): boolean {
    return PROVIDER_REGISTRY[provider].capabilities.includes(feature)
  }

  isAvailable(provider: ProviderKey): boolean {
    const state = this.health.get(provider)
    if (!state) return false
    if (state.state === 'DISABLED') return false
    if (state.cooldownUntil && Date.now() < state.cooldownUntil) return false
    return state.state === 'ACTIVE' || state.state === 'DEGRADED'
  }

  getState(provider: ProviderKey): ProviderRuntimeHealth {
    return this.health.get(provider) ?? {
      provider,
      state: 'DISABLED',
      cooldownUntil: null,
      lastError: 'unknown_provider',
      failures: 0,
    }
  }

  getStates(): ProviderRuntimeHealth[] {
    return (Object.keys(PROVIDER_REGISTRY) as ProviderKey[]).map((provider) => this.getState(provider))
  }

  recordSuccess(provider: ProviderKey, degraded = false): void {
    const current = this.getState(provider)
    this.health.set(provider, {
      ...current,
      state: degraded ? 'DEGRADED' : 'ACTIVE',
      cooldownUntil: null,
      lastError: null,
      failures: 0,
    })
  }

  recordFailure(provider: ProviderKey, failureClass: FailureClass, message: string): ProviderLifecycleState {
    const current = this.getState(provider)
    const cooldownMs = PROVIDER_REGISTRY[provider]?.cooldownMs ?? 30_000

    let state: ProviderLifecycleState = 'UNAVAILABLE'
    if (failureClass === 'BALANCE_EXHAUSTED') state = 'OUT_OF_CREDITS'
    else if (failureClass === 'RATE_LIMIT') state = 'RATE_LIMITED'
    else if (failureClass === 'INVALID_API_KEY') state = 'DISABLED'
    else if (failureClass === 'FEATURE_NOT_SUPPORTED') state = 'DEGRADED'
    else if (failureClass === 'TIMEOUT' || failureClass === 'TEMPORARY_UNAVAILABLE' || failureClass === 'PROVIDER_DOWN') state = 'UNAVAILABLE'

    this.health.set(provider, {
      ...current,
      state,
      failures: current.failures + 1,
      lastError: message,
      cooldownUntil: state === 'UNAVAILABLE' || state === 'RATE_LIMITED' ? Date.now() + cooldownMs : null,
    })
    return state
  }

  resolveCandidates(primary: ProviderKey, feature: ProviderFeature): ProviderKey[] {
    const ordered: ProviderKey[] = [primary, 'gpt', 'claude', 'gemini', 'runway']
    const uniq = [...new Set(ordered)]
    return uniq.filter((provider) => this.supports(provider, feature) && this.isAvailable(provider))
  }
}

export const providerHealthService = new ProviderHealthService()
