export type ProviderKey = 'gpt' | 'claude' | 'gemini' | 'runway'

export type ProviderLifecycleState =
  | 'ACTIVE'
  | 'DEGRADED'
  | 'RATE_LIMITED'
  | 'OUT_OF_CREDITS'
  | 'UNAVAILABLE'
  | 'DISABLED'

export type ProviderFeature = 'text' | 'image' | 'video' | 'long_form_text' | 'limited_generation'

export type ProviderRegistryItem = {
  provider: ProviderKey
  enabled: boolean
  capabilities: ProviderFeature[]
  cooldownMs: number
}

export type ProviderRuntimeHealth = {
  provider: ProviderKey
  state: ProviderLifecycleState
  cooldownUntil: number | null
  lastError: string | null
  failures: number
}
