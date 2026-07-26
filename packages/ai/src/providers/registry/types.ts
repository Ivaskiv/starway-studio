import type { AnthropicConfig } from '../anthropic/types.js'
import type { GeminiConfig } from '../gemini/types.js'
import type { OllamaConfig } from '../ollama/types.js'
import type { OpenAIConfig } from '../openai/types.js'
import type { OpenRouterConfig } from '../openrouter/types.js'
import type { IAIProvider } from '../../runtime/agent-runner/types.js'
import type { IRuntimeLogger } from '../../runtime/orchestrator/types.js'

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter'

export interface ProviderConfigMap {
  openai: OpenAIConfig
  anthropic: AnthropicConfig
  gemini: GeminiConfig
  ollama: OllamaConfig
  openrouter: OpenRouterConfig
}

export interface ProviderConfigurationEntry<TConfig> {
  enabled?: boolean
  config?: TConfig
}

export interface CapabilityProviderTarget<TProviderId extends ProviderId = ProviderId> {
  provider: TProviderId
  model: string
}

export interface CapabilityProviderMapping {
  preferred: CapabilityProviderTarget
  fallback?: CapabilityProviderTarget
}

export interface ProviderConfiguration {
  selectedProvider: ProviderId
  selectedCapability?: string
  providers: {
    openai?: ProviderConfigurationEntry<OpenAIConfig>
    anthropic?: ProviderConfigurationEntry<AnthropicConfig>
    gemini?: ProviderConfigurationEntry<GeminiConfig>
    ollama?: ProviderConfigurationEntry<OllamaConfig>
    openrouter?: ProviderConfigurationEntry<OpenRouterConfig>
  }
  capabilityMappings?: Record<string, CapabilityProviderMapping>
}

export interface ResolvedProviderSelection<TProviderId extends ProviderId = ProviderId> {
  providerId: TProviderId
  config: ProviderConfigMap[TProviderId]
}

export interface ResolvedProviderTargets {
  preferred: ResolvedProviderSelection
  fallback: ResolvedProviderSelection | null
}

export interface IAIProviderRegistry {
  getProvider(): IAIProvider
  getSelectedProviderId(): ProviderId
}

export interface IProviderFactory {
  create<TProviderId extends ProviderId>(selection: ResolvedProviderSelection<TProviderId>): IAIProvider
}

export interface IProviderResolver {
  resolve(configuration: ProviderConfiguration): ResolvedProviderTargets
}

export interface ProviderFactoryDependencies {
  creators?: Partial<{
    [K in ProviderId]: (config: ProviderConfigMap[K]) => IAIProvider
  }>
  logger?: IRuntimeLogger
}

export interface ProviderRegistryDependencies {
  configuration: ProviderConfiguration
  factory: IProviderFactory
  resolver?: IProviderResolver
  logger?: IRuntimeLogger
}
