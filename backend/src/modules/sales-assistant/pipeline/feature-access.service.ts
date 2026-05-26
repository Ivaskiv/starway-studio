import type { GenerationContentType } from '@/modules/sales-assistant/pipeline/generation-queue.types.js'
import { providerHealthService } from '@/modules/sales-assistant/pipeline/provider-health.service.js'
import type { ProviderFeature, ProviderKey } from '@/modules/sales-assistant/pipeline/provider-lifecycle.types.js'

export type AccessTier = 'free' | 'premium' | 'enterprise'

export type GatingDecision = {
  allowed: boolean
  reason?: 'feature_blocked' | 'provider_unavailable' | 'provider_credits' | 'provider_disabled'
  message?: string
  upgradeCta?: string
  fallbackOption?: string
  availableProviders: ProviderKey[]
}

const TIER_FEATURES: Record<AccessTier, ProviderFeature[]> = {
  free: ['text', 'limited_generation'],
  premium: ['text', 'image', 'limited_generation', 'long_form_text'],
  enterprise: ['text', 'image', 'video', 'limited_generation', 'long_form_text'],
}

function mapContentTypeToFeature(type: GenerationContentType): ProviderFeature {
  if (type === 'reels') return 'text'
  return 'text'
}

export class FeatureAccessService {
  validate(params: {
    tier: AccessTier
    requestedContentTypes: GenerationContentType[]
    preferredProvider: ProviderKey
  }): GatingDecision {
    const { tier, requestedContentTypes, preferredProvider } = params
    const requiredFeatures = [...new Set(requestedContentTypes.map(mapContentTypeToFeature))]
    const tierFeatures = TIER_FEATURES[tier]

    for (const feature of requiredFeatures) {
      if (!tierFeatures.includes(feature)) {
        return {
          allowed: false,
          reason: 'feature_blocked',
          message: `Feature ${feature} недоступна на плані ${tier}.`,
          upgradeCta: tier === 'free' ? 'Upgrade to Premium' : 'Contact Enterprise Sales',
          fallbackOption: feature === 'video' ? 'Use image storyboard fallback' : 'Use text fallback',
          availableProviders: [],
        }
      }
    }

    const candidates = providerHealthService.resolveCandidates(preferredProvider, requiredFeatures[0] ?? 'text')
    if (candidates.length === 0) {
      const states = providerHealthService.getStates()
      const outOfCredits = states.some((state) => state.state === 'OUT_OF_CREDITS')
      const disabled = states.some((state) => state.state === 'DISABLED')
      return {
        allowed: false,
        reason: outOfCredits ? 'provider_credits' : disabled ? 'provider_disabled' : 'provider_unavailable',
        message: outOfCredits
          ? 'У вибраних провайдерів закінчились кредити.'
          : disabled
            ? 'Провайдер відключений або API key невалідний.'
            : 'Провайдери тимчасово недоступні.',
        upgradeCta: outOfCredits ? 'Top up credits / Upgrade plan' : 'Manage provider settings',
        fallbackOption: 'Switch provider and retry',
        availableProviders: [],
      }
    }

    return {
      allowed: true,
      availableProviders: candidates,
    }
  }
}

export const featureAccessService = new FeatureAccessService()
