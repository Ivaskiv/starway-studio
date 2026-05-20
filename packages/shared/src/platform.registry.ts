import { getPaymentUrl } from './payments.js'

export type PlatformProductId = 'focus' | 'stankey' | 'absystem'

export type PlatformAuthMode = 'public' | 'hybrid' | 'protected'
export type PlatformTelegramMode = 'shared' | 'telegram-first' | 'telegram-optional' | 'disabled'
export type PlatformPaymentMode = 'none' | 'wayforpay' | 'subscription' | 'addon'
export type PlatformSubscriptionMode = 'none' | 'trial' | 'subscription' | 'addon'
export type PlatformOnboardingMode = 'landing' | 'telegram' | 'dashboard' | 'hybrid'
export type PlatformProductType = 'public' | 'hybrid' | 'protected'
export type PlatformVisibility = 'public' | 'private' | 'hybrid'

export type PlatformDashboardAccess = {
  enabled: boolean
  requiresAuth: boolean
  route: string | null
}

export type PlatformDeeplinkRules = {
  publicAllowed: boolean
  dashboardAllowed: boolean
  telegramRequired: boolean
  payloads: string[]
  fallbackRoute: string
}

export type PlatformCronReminderFlags = {
  reminders: boolean
  streak: boolean
  scheduledJobs: boolean
}

export type PlatformProductRoomConfig = {
  id: string
  label: string
  publicRoute: string
  appRoute: string
  dashboardRoute: string | null
  miniAppRoute: string | null
  telegramRoute: string | null
  sections: string[]
}

export type PlatformProductManifest =
  | {
      slug: string
      name: string
      visibility: PlatformVisibility
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
  | {
      productId: PlatformProductId
      slug: string
      name: string
      title: string
      visibility: PlatformVisibility
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
  cronReminderFlags: PlatformCronReminderFlags
  deeplinkRules: PlatformDeeplinkRules
  dashboardAccess: PlatformDashboardAccess
  productRoom: PlatformProductRoomConfig
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

const focusManifest: PlatformProductManifest = {
  slug: 'focus',
  name: 'FOCUS',
  visibility: 'public',
  channels: ['web', 'telegram'],
  billing: {
    provider: 'wayforpay',
    subscriptions: true,
  },
  onboarding: {
    enabled: true,
    quizEnabled: true,
  },
  features: {
    aiMentor: true,
    onboarding: true,
    subscriptions: true,
    telegram: true,
  },
}

const stankeyManifest: PlatformProductManifest = {
  productId: 'stankey',
  slug: 'stankey',
  name: 'STANKEY',
  title: 'ABsystem STANKEY',
  visibility: 'private',
  channels: ['telegram', 'web'],
  billing: {
    provider: 'wayforpay',
    subscriptions: true,
  },
  pricing: {
    currency: 'UAH',
    plans: [
      { id: 'monthly', title: '1 місяць', price: 777, durationDays: 30 },
      { id: 'quarterly', title: '3 місяці', price: 1990, durationDays: 90 },
      { id: 'lifetime', title: 'Назавжди', price: 4444, durationDays: null },
    ],
  },
  access: {
    durationDays: {
      monthly: 30,
      quarterly: 90,
      lifetime: null,
    },
  },
  trial: {
    enabled: true,
    durationDays: 7,
  },
  onboarding: {
    enabled: true,
    quizEnabled: false,
  },
  features: {
    aiMentor: true,
    onboarding: true,
    subscriptions: true,
    telegram: true,
    lessons: true,
    practice: true,
    tasks: true,
    miniapp: true,
    premiumFlows: true,
  },
}

const absystemManifest: PlatformProductManifest = {
  productId: 'absystem',
  slug: 'absystem',
  name: 'ABsystem',
  title: 'ABsystem',
  visibility: 'private',
  channels: ['web', 'telegram'],
  billing: {
    provider: 'wayforpay',
    subscriptions: true,
  },
  pricing: {
    currency: 'UAH',
    plans: [
      { id: 'trial', title: '7 днів', price: 0, durationDays: 7 },
      { id: 'monthly', title: '1 місяць', price: 1190, durationDays: 30 },
      { id: 'annual', title: '1 рік', price: 8990, durationDays: 365 },
    ],
  },
  access: {
    durationDays: {
      trial: 7,
      monthly: 30,
      annual: 365,
    },
  },
  trial: {
    enabled: true,
    durationDays: 7,
  },
  onboarding: {
    enabled: true,
    quizEnabled: false,
  },
  features: {
    aiMentor: true,
    onboarding: true,
    subscriptions: true,
    telegram: true,
    analytics: true,
    progress: true,
    reminders: true,
  },
}

const focusConfig: PlatformProductConfig = {
  id: 'focus',
  type: 'public',
  visibility: 'public',
  title: 'ФОКУС',
  subtitle: 'weekly live practice room',
  description: 'Щотижневі живі Zoom-практики з Надею для рішень, напруги, грошей і тижневого фокусу.',
  shortDescription: 'Публічний landing продукт з живими практиками та subscription entry.',
  heroTitle: 'ФОКУС',
  heroSubtitle: 'Nadya by Starway',
  heroDescription: 'Закритий канал із живими Zoom-практиками для тих, хто хоче рухатись без хаосу.',
  routing: {
    publicRoute: '/focus',
    appRoute: '/focus',
    dashboardRoute: '/app/dashboard',
    miniAppRoute: '/miniapp',
  },
  authMode: 'public',
  telegramMode: 'shared',
  paymentMode: 'wayforpay',
  subscriptionMode: 'subscription',
  onboardingMode: 'landing',
  cronReminderFlags: {
    reminders: false,
    streak: false,
    scheduledJobs: false,
  },
  deeplinkRules: {
    publicAllowed: true,
    dashboardAllowed: false,
    telegramRequired: false,
    payloads: ['focus', 'focus_landing'],
    fallbackRoute: '/focus',
  },
  dashboardAccess: {
    enabled: true,
    requiresAuth: true,
    route: '/app/dashboard',
  },
  productRoom: {
    id: 'focus-room',
    label: 'FOCUS landing room',
    publicRoute: '/focus',
    appRoute: '/focus',
    dashboardRoute: '/app/dashboard',
    miniAppRoute: '/miniapp',
    telegramRoute: null,
    sections: ['hero', 'problem', 'how', 'included', 'pricing', 'reviews', 'cta'],
  },
  paymentUrl: getPaymentUrl('FOCUS'),
  trialDays: null,
  badges: ['Public', 'Landing', 'Weekly practice'],
  features: [
    'Live Zoom practices',
    'Telegram channel access',
    'Weekly guided decision rhythm',
    'Payment entry via WayForPay',
  ],
  results: [
    'Less decision delay',
    'Cleaner weekly focus',
    'Practical live support',
  ],
  problems: [
    'Delayed decisions',
    'Money tension',
    'Repeating patterns',
  ],
  format: [
    'Weekly live practice',
    'Telegram channel',
    'Zoom session',
  ],
  audience: [
    'People who need a practical weekly reset',
    'Users who want a public marketing entry',
  ],
  access: {
    entryProducts: ['focus'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['absystem'],
    lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'completed', 'winback', 'upsellReady'],
  },
  relationMap: {
    entryProducts: ['focus'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['absystem'],
  },
  manifest: focusManifest,
}

const stankeyConfig: PlatformProductConfig = {
  id: 'stankey',
  type: 'hybrid',
  visibility: 'hybrid',
  title: 'STANKEY',
  subtitle: 'telegram-first product',
  description: 'Telegram-first miniproduct for paid access, gifted access, and hybrid SaaS onboarding.',
  shortDescription: 'Telegram-first hybrid product with paid, gifted, and add-on access modes.',
  heroTitle: 'STANKEY',
  heroSubtitle: 'Telegram-first access',
  heroDescription: 'Практичний міні-курс і гібридний продукт, який може жити як standalone, bonus або addon.',
  routing: {
    publicRoute: '/miniapp',
    appRoute: '/app/dashboard/subscription',
    dashboardRoute: '/app/dashboard/subscription',
    miniAppRoute: '/miniapp',
  },
  authMode: 'hybrid',
  telegramMode: 'telegram-first',
  paymentMode: 'wayforpay',
  subscriptionMode: 'subscription',
  onboardingMode: 'telegram',
  cronReminderFlags: {
    reminders: true,
    streak: true,
    scheduledJobs: true,
  },
  deeplinkRules: {
    publicAllowed: false,
    dashboardAllowed: true,
    telegramRequired: true,
    payloads: ['stankey', 'start_stankey', 'pay_stankey'],
    fallbackRoute: '/miniapp',
  },
  dashboardAccess: {
    enabled: true,
    requiresAuth: false,
    route: '/app/dashboard/subscription',
  },
  productRoom: {
    id: 'stankey-room',
    label: 'STANKEY Telegram room',
    publicRoute: '/miniapp',
    appRoute: '/app/dashboard/subscription',
    dashboardRoute: '/app/dashboard/subscription',
    miniAppRoute: '/miniapp',
    telegramRoute: '/start',
    sections: ['welcome', 'first-lesson', 'progress', 'trial', 'paywall'],
  },
  paymentUrl: getPaymentUrl('STANKEY'),
  trialDays: 7,
  badges: ['Telegram-first', 'Hybrid', 'Giftable'],
  features: [
    'Telegram onboarding',
    'Paid access via WayForPay',
    'Gifted and addon access',
    'Progress-aware lesson flow',
    'Reminder hooks',
  ],
  results: [
    'Fast product entry',
    'Product-specific Telegram flow',
    'Standalone or embedded access',
  ],
  problems: [
    'Missing access context',
    'Scattered onboarding',
    'Unclear paid vs gifted state',
  ],
  format: [
    'Telegram bot',
    'MiniApp',
    'Dashboard entry',
  ],
  audience: [
    'Telegram-first users',
    'Gifted access users',
    'Standalone paid product users',
  ],
  access: {
    entryProducts: ['stankey'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['absystem'],
    lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'completed', 'winback', 'upsellReady'],
  },
  relationMap: {
    entryProducts: ['stankey'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['absystem'],
  },
  manifest: stankeyManifest,
}

const absystemConfig: PlatformProductConfig = {
  id: 'absystem',
  type: 'protected',
  visibility: 'private',
  title: 'ABsystem',
  subtitle: 'protected SaaS product',
  description: 'Protected dashboard-first mentor ecosystem with analytics, progress, and subscription lifecycle.',
  shortDescription: 'Protected SaaS core with analytics, progress and AI mentor flows.',
  heroTitle: 'ABsystem',
  heroSubtitle: 'AI mentor core',
  heroDescription: 'Керуючий модуль системи з аналітикою, прогресом, підпискою і daily rhythm.',
  routing: {
    publicRoute: '/app/dashboard',
    appRoute: '/app/dashboard',
    dashboardRoute: '/app/dashboard',
    miniAppRoute: '/miniapp/mentor',
  },
  authMode: 'protected',
  telegramMode: 'shared',
  paymentMode: 'subscription',
  subscriptionMode: 'trial',
  onboardingMode: 'dashboard',
  cronReminderFlags: {
    reminders: true,
    streak: true,
    scheduledJobs: true,
  },
  deeplinkRules: {
    publicAllowed: false,
    dashboardAllowed: true,
    telegramRequired: false,
    payloads: ['mentor', 'ai-mentor', 'absystem'],
    fallbackRoute: '/app/dashboard',
  },
  dashboardAccess: {
    enabled: true,
    requiresAuth: true,
    route: '/app/dashboard',
  },
  productRoom: {
    id: 'absystem-room',
    label: 'ABsystem dashboard room',
    publicRoute: '/app/dashboard',
    appRoute: '/app/dashboard',
    dashboardRoute: '/app/dashboard',
    miniAppRoute: '/miniapp/mentor',
    telegramRoute: '/telegram',
    sections: ['mentor', 'wheel', 'cycle', 'progress', 'subscription'],
  },
  paymentUrl: null,
  trialDays: 7,
  badges: ['Protected', 'Analytics', 'Mentor core'],
  features: [
    'AI mentor',
    'Analytics and progress',
    'Subscription lifecycle',
    'Telegram support',
    'Reminder hooks',
  ],
  results: [
    'Dashboard-first control',
    'Protected analytics',
    'Mentor guided flow',
  ],
  problems: [
    'Protected access',
    'Analytics overload',
    'Lifecycle complexity',
  ],
  format: [
    'Dashboard',
    'Telegram',
    'MiniApp',
  ],
  audience: [
    'Protected SaaS users',
    'Analytics-first users',
    'Mentor users',
  ],
  access: {
    entryProducts: ['absystem'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['stankey'],
    lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'completed', 'winback', 'upsellReady'],
  },
  relationMap: {
    entryProducts: ['absystem'],
    includedProducts: ['absystem'],
    recommendedUpsells: ['stankey'],
  },
  manifest: absystemManifest,
}

export const PLATFORM_PRODUCTS = {
  focus: focusConfig,
  stankey: stankeyConfig,
  absystem: absystemConfig,
} as const

export type PlatformProductsRegistry = typeof PLATFORM_PRODUCTS

export function getPlatformProductConfig(productId: PlatformProductId) {
  return PLATFORM_PRODUCTS[productId]
}

export function listPlatformProducts() {
  return Object.values(PLATFORM_PRODUCTS)
}

export function getPlatformProductsByVisibility(visibility: PlatformVisibility) {
  return listPlatformProducts().filter(product => product.visibility === visibility)
}

export function getPlatformProductsByAuthMode(authMode: PlatformAuthMode) {
  return listPlatformProducts().filter(product => product.authMode === authMode)
}

export function getPlatformProductByRoute(route: string) {
  return listPlatformProducts().find(product =>
    product.routing.publicRoute === route
    || product.routing.appRoute === route
    || product.routing.dashboardRoute === route
    || product.routing.miniAppRoute === route,
  ) ?? null
}

export function getPlatformProductManifest(productId: PlatformProductId) {
  return getPlatformProductConfig(productId).manifest
}
