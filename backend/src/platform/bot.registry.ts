import { listPlatformProducts, type PlatformProductId } from '@shared/platform.registry'

import { requireTelegramBotConfig } from '../modules/telegram-mentor/runtime/botConfig.js'

export type PlatformBotDeliveryMode = 'polling' | 'webhook' | 'hybrid'

export type PlatformBotTemplate = {
  id: string
  label: string
  productOwnership: PlatformProductId[]
  reminderHandlers: string[]
  cronHandlers: string[]
  onboardingHandlers: string[]
  deeplinkHandlers: string[]
  permissions: string[]
  deliveryMode: PlatformBotDeliveryMode
}

export type RuntimePlatformBot = PlatformBotTemplate & {
  token: string
  username: string
  botLink: string
}

export type PlatformBotRegistry = {
  main: RuntimePlatformBot
  planned: PlatformBotTemplate[]
  productOwnershipIndex: Record<PlatformProductId, string>
}

const MAIN_BOT_TEMPLATE: PlatformBotTemplate = {
  id: 'main',
  label: 'Starway shared runtime',
  productOwnership: listPlatformProducts().map(product => product.id),
  reminderHandlers: [
    'dailyMorning',
    'dailyEvening',
    'streakRisk',
    'weeklySummary',
  ],
  cronHandlers: [
    'subscriptionExpiring',
    'subscriptionExpired',
    'microTaskReminder',
    'nudge',
    'weeklySummary',
    'dailyMorning',
    'dailyEvening',
  ],
  onboardingHandlers: [
    'start',
    'status',
    'privacy',
    'billing',
  ],
  deeplinkHandlers: [
    'telegram-link',
    'miniapp',
    'start',
    'startapp',
  ],
  permissions: [
    'onboarding',
    'deeplink',
    'subscriptions',
    'reminders',
    'delivery',
  ],
  deliveryMode: 'hybrid',
}

const PLANNED_BOTS: PlatformBotTemplate[] = [
  {
    id: 'focus-bot',
    label: 'FOCUS product bot',
    productOwnership: ['focus'],
    reminderHandlers: ['weeklyPracticeReminder'],
    cronHandlers: ['weeklyPracticeReminder'],
    onboardingHandlers: ['start', 'landing', 'checkout'],
    deeplinkHandlers: ['focus'],
    permissions: ['onboarding', 'deeplink', 'subscriptions'],
    deliveryMode: 'webhook',
  },
  {
    id: 'stankey-bot',
    label: 'STANKEY product bot',
    productOwnership: ['stankey'],
    reminderHandlers: ['lessonReminder', 'progressReminder'],
    cronHandlers: ['lessonReminder', 'progressReminder'],
    onboardingHandlers: ['start', 'status', 'checkout'],
    deeplinkHandlers: ['stankey', 'start_stankey'],
    permissions: ['onboarding', 'deeplink', 'subscriptions', 'reminders'],
    deliveryMode: 'hybrid',
  },
  {
    id: 'absystem-bot',
    label: 'ABsystem product bot',
    productOwnership: ['absystem'],
    reminderHandlers: ['dailyMorning', 'dailyEvening', 'streakRisk'],
    cronHandlers: ['dailyMorning', 'dailyEvening', 'streakRisk', 'weeklySummary'],
    onboardingHandlers: ['dashboard', 'mentor', 'trial'],
    deeplinkHandlers: ['mentor', 'ai-mentor'],
    permissions: ['onboarding', 'deeplink', 'subscriptions', 'reminders', 'analytics'],
    deliveryMode: 'hybrid',
  },
]

export function resolveRuntimeBotRegistry(context = 'platform bot registry'): PlatformBotRegistry {
  const runtime = requireTelegramBotConfig(context)
  const main: RuntimePlatformBot = {
    ...MAIN_BOT_TEMPLATE,
    token: runtime.token,
    username: runtime.username,
    botLink: runtime.botLink,
  }

  const productOwnershipIndex = Object.fromEntries(
    listPlatformProducts().map(product => [product.id, main.id]),
  ) as Record<PlatformProductId, string>

  return {
    main,
    planned: PLANNED_BOTS,
    productOwnershipIndex,
  }
}

