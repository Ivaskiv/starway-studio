import { ProviderConfigurationError } from './errors.js'
import type {
  CapabilityProviderTarget,
  IProviderResolver,
  ProviderConfigMap,
  ProviderConfiguration,
  ProviderId,
  ResolvedProviderSelection,
  ResolvedProviderTargets,
} from './types.js'

export class ProviderResolver implements IProviderResolver {
  resolve(configuration: ProviderConfiguration): ResolvedProviderTargets {
    const capability = configuration.selectedCapability?.trim()
    if (capability) {
      return resolveCapabilitySelection(configuration, capability)
    }

    const providerId = configuration.selectedProvider
    const entry = configuration.providers[providerId]

    if (!entry) {
      throw new ProviderConfigurationError(
        `Selected provider '${providerId}' is not configured.`,
      )
    }

    return {
      preferred: {
        providerId,
        config: (entry.config ?? {}) as ResolvedProviderSelection['config'],
      } as ResolvedProviderSelection,
      fallback: null,
    }
  }

  resolveProviderId(configuration: ProviderConfiguration): ProviderId {
    return this.resolve(configuration).preferred.providerId
  }
}

function resolveCapabilitySelection(
  configuration: ProviderConfiguration,
  capability: string,
): ResolvedProviderTargets {
  const mapping = configuration.capabilityMappings?.[capability]

  if (!mapping) {
    throw new ProviderConfigurationError(
      `Selected capability '${capability}' is not configured.`,
    )
  }

  return {
    preferred: resolveTarget(configuration, capability, mapping.preferred),
    fallback: mapping.fallback
      ? resolveTarget(configuration, capability, mapping.fallback)
      : null,
  }
}

function resolveTarget(
  configuration: ProviderConfiguration,
  capability: string,
  preferred: CapabilityProviderTarget,
): ResolvedProviderSelection {
  const preferredEntry = configuration.providers[preferred.provider]
  if (!preferredEntry) {
    throw new ProviderConfigurationError(
      `Capability '${capability}' references unconfigured provider '${preferred.provider}'.`,
    )
  }

  return {
    providerId: preferred.provider,
    config: mergeProviderConfig(preferredEntry.config, preferred),
  } as ResolvedProviderSelection
}

function mergeProviderConfig<TProviderId extends ProviderId>(
  config: ProviderConfigMap[TProviderId] | undefined,
  target: CapabilityProviderTarget<TProviderId>,
): ProviderConfigMap[TProviderId] {
  return {
    ...(config ?? {}),
    defaultModel: target.model,
  } as ProviderConfigMap[TProviderId]
}
