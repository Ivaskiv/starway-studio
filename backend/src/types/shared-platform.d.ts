declare module '@shared/platform.registry' {
  export type FocusManifest = {
    slug: 'focus'
    name: 'FOCUS'
    visibility: 'public' | 'private' | 'hybrid'
    channels: readonly string[]
    billing: {
      provider: 'wayforpay'
      subscriptions: true
    }
    onboarding: {
      enabled: boolean
      quizEnabled: boolean
    }
    features: Record<string, boolean>
  }

  export type StankeyManifest = {
    productId: 'stankey'
    slug: 'stankey'
    name: 'STANKEY'
    title: string
    visibility: 'public' | 'private' | 'hybrid'
    channels: readonly string[]
    billing: {
      provider: 'wayforpay'
      subscriptions: true
    }
    pricing: {
      currency: 'UAH'
      plans: Array<{
        id: string
        title: string
        price: number
        durationDays: number | null
      }>
    }
    access: {
      durationDays: Record<string, number | null>
    }
    trial: {
      enabled: boolean
      durationDays: number
    }
    onboarding: {
      enabled: boolean
      quizEnabled: boolean
    }
    features: Record<string, boolean>
  }

  export type AbsystemManifest = {
    productId: 'absystem'
    slug: 'absystem'
    name: 'ABsystem'
    title: string
    visibility: 'public' | 'private' | 'hybrid'
    channels: readonly string[]
    billing: {
      provider: 'wayforpay'
      subscriptions: true
    }
    pricing: {
      currency: 'UAH'
      plans: Array<{
        id: string
        title: string
        price: number
        durationDays: number | null
      }>
    }
    access: {
      durationDays: Record<string, number | null>
    }
    trial: {
      enabled: boolean
      durationDays: number
    }
    onboarding: {
      enabled: boolean
      quizEnabled: boolean
    }
    features: Record<string, boolean>
  }

  export type PlatformProductManifest = FocusManifest | StankeyManifest | AbsystemManifest

  export type PlatformProductId = 'focus' | 'stankey' | 'absystem'
  export type PlatformAuthMode = 'public' | 'hybrid' | 'protected'
  export type PlatformTelegramMode = 'shared' | 'telegram-first' | 'telegram-optional' | 'disabled'
  export type PlatformPaymentMode = 'none' | 'wayforpay' | 'subscription' | 'addon'
  export type PlatformSubscriptionMode = 'none' | 'trial' | 'subscription' | 'addon'
  export type PlatformOnboardingMode = 'landing' | 'telegram' | 'dashboard' | 'hybrid'
  export type PlatformProductType = 'public' | 'hybrid' | 'protected'
  export type PlatformVisibility = 'public' | 'private' | 'hybrid'

  export type PlatformProductConfig = {
    id: PlatformProductId
    type: PlatformProductType
    visibility: PlatformVisibility
    title: string
    subtitle: string
    description: string
    shortDescription: string
    heroTitle: string
    heroSubtitle: string
    heroDescription: string
    routing: {
      publicRoute: string
      appRoute: string
      dashboardRoute: string | null
      miniAppRoute: string | null
    }
    authMode: PlatformAuthMode
    telegramMode: PlatformTelegramMode
    paymentMode: PlatformPaymentMode
    subscriptionMode: PlatformSubscriptionMode
    onboardingMode: PlatformOnboardingMode
    cronReminderFlags: {
      reminders: boolean
      streak: boolean
      scheduledJobs: boolean
    }
    deeplinkRules: {
      publicAllowed: boolean
      dashboardAllowed: boolean
      telegramRequired: boolean
      payloads: string[]
      fallbackRoute: string
    }
    dashboardAccess: {
      enabled: boolean
      requiresAuth: boolean
      route: string | null
    }
    productRoom: {
      id: string
      label: string
      publicRoute: string
      appRoute: string
      dashboardRoute: string | null
      miniAppRoute: string | null
      telegramRoute: string | null
      sections: string[]
    }
    paymentUrl: string | null
    trialDays: number | null
    badges: string[]
    features: string[]
    results: string[]
    problems: string[]
    format: string[]
    audience: string[]
    access: {
      entryProducts: PlatformProductId[]
      includedProducts: PlatformProductId[]
      recommendedUpsells: PlatformProductId[]
      lifecycleStates: string[]
    }
    relationMap: {
      entryProducts: PlatformProductId[]
      includedProducts: PlatformProductId[]
      recommendedUpsells: PlatformProductId[]
    }
    manifest: PlatformProductManifest
  }

  export const PLATFORM_PRODUCTS: Record<PlatformProductId, PlatformProductConfig>
  export function getPlatformProductConfig(productId: PlatformProductId): PlatformProductConfig
  export function listPlatformProducts(): PlatformProductConfig[]
  export function getPlatformProductsByVisibility(visibility: PlatformVisibility): PlatformProductConfig[]
  export function getPlatformProductsByAuthMode(authMode: PlatformAuthMode): PlatformProductConfig[]
  export function getPlatformProductByRoute(route: string): PlatformProductConfig | null
  export function getPlatformProductManifest(productId: 'focus'): FocusManifest
  export function getPlatformProductManifest(productId: 'stankey'): StankeyManifest
  export function getPlatformProductManifest(productId: 'absystem'): AbsystemManifest
}
