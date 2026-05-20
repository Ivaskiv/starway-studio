import { getPlatformProductConfig, type PlatformProductId } from '@shared/platform.registry'

import { focusContent } from '@/products/focus/config/focus.content.js'
import { subscriptionsContent, type SubscriptionLifecycleState } from './subscriptions.content.js'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'

export type TelegramAccessSource =
  | 'payment'
  | 'gifted'
  | 'bonus'
  | 'trial'
  | 'manual'
  | 'affiliate'
  | 'restore'
  | 'upsell'
  | 'unknown'

export type TelegramMentorMode = 'silent' | 'soft' | 'medium' | 'aggressive'

export type TelegramProductIntent = {
  action: 'paid' | 'gifted' | 'bonus' | 'restore' | 'onboarding'
  productId: PlatformProductId
  raw: string
}

export type TelegramRoomCopy = {
  welcome: ReadonlyArray<string>
  activation: ReadonlyArray<string>
  payment: ReadonlyArray<string>
  gift: ReadonlyArray<string>
  restore: ReadonlyArray<string>
  reminder: ReadonlyArray<string>
  mentor: ReadonlyArray<string>
  onboarding: ReadonlyArray<string>
}

export type TelegramRoomCta = {
  start: string
  continue: string
  continueOnboarding: string
  restore: string
  upgrade: string
  buy: string
  open: string
  resume: string
  reopen: string
  activateTrial: string
  continueLesson: string
  openRoom: string
  activateGift: string
  waitlist: string
}

export type TelegramBehaviorLifecycleState =
  | 'guest'
  | 'onboarding'
  | 'trial'
  | 'active'
  | 'paused'
  | 'expired'
  | 'gifted'
  | 'bonus'
  | 'completed'
  | 'winback'
  | 'inactive'
  | 'low_activity'
  | 'high_engagement'
  | 'upsell_ready'
  | 'mentor_candidate'
  | 'affiliate'

export type TelegramBehaviorCtaKey = keyof TelegramRoomCta
export type TelegramBehaviorCtaValue = TelegramBehaviorCtaKey | string

export type TelegramLifecycleBehavior = {
  primaryCta: TelegramBehaviorCtaValue
  secondaryCtas: TelegramBehaviorCtaValue[]
  onboardingBehavior: string
  reminderCadence: 'off' | 'gentle' | 'streak' | 'daily' | 'every2days'
  reminderTone: 'silent' | 'soft' | 'focused' | 'retention' | 'warm' | 'direct'
  mentorIntensity: TelegramMentorMode
  activationStrategy: 'waitlist' | 'payment' | 'gift' | 'restore' | 'resume'
  streakStrategy: string
  gamificationStrategy: string
  winbackStrategy: string
  completionStrategy: string
  upsellStrategy: string
  roomBehavior: string
  lifecycleBehavior: string
  mentorMessage?: string
  softUpsellMessage?: string
  maxUpsellPerWeek?: number
  upsellCheck?: boolean
  mentorCandidateCheck?: boolean
  promoteMentor?: boolean
  skipIfAlreadySubscribed?: boolean
  trackingRequired?: boolean
}

export type TelegramProductBehaviorPolicy = {
  productId: PlatformProductId
  telegramFirst: boolean
  roomSwitching: 'shared-bot-room-switch'
  mentorGuardrail: string
  reminderGuardrail: string
  lifecycle: Record<TelegramBehaviorLifecycleState, TelegramLifecycleBehavior>
}

export type TelegramProductContext = {
  productId: PlatformProductId
  roomId: string
  title: string
  route: {
    public: string
    app: string
    dashboard: string | null
    miniApp: string | null
  }
  room: {
    id: string
    label: string
    publicRoute: string
    appRoute: string
    dashboardRoute: string | null
    miniAppRoute: string | null
    telegramRoute: string | null
    sections: string[]
  }
  access: {
    entryProducts: PlatformProductId[]
    includedProducts: PlatformProductId[]
    recommendedUpsells: PlatformProductId[]
    lifecycleStates: SubscriptionLifecycleState[]
  }
  cta: TelegramRoomCta
  copy: TelegramRoomCopy
  reminder: {
    enabled: boolean
    streak: boolean
    scheduledJobs: boolean
  }
  mentorModes: Record<SubscriptionLifecycleState, TelegramMentorMode>
  behaviorPolicy: TelegramProductBehaviorPolicy
  paymentUrl: string | null
  navigation: ReturnType<typeof getPlatformProductConfig>['routing']
  relationMap: ReturnType<typeof getPlatformProductConfig>['relationMap']
}

const CTA: TelegramRoomCta = {
  ...subscriptionsContent.cta,
  continueOnboarding: '🚀 Продовжити',
  reopen: '📘 Відкрити повторно',
  activateGift: '🎁 Активувати доступ',
  waitlist: stankeyContent.telegram.buttons.earlyAccess,
}

function buildLifecycleBehavior(
  primaryCta: TelegramBehaviorCtaValue,
  overrides?: Partial<Omit<TelegramLifecycleBehavior, 'primaryCta'>>,
): TelegramLifecycleBehavior {
  return {
    primaryCta,
    secondaryCtas: [],
    onboardingBehavior: 'guided',
    reminderCadence: 'gentle',
    reminderTone: 'soft',
    mentorIntensity: 'soft',
    activationStrategy: 'resume',
    streakStrategy: 'protect_active_streak',
    gamificationStrategy: 'visible_progress',
    winbackStrategy: 'soft_restore',
    completionStrategy: 'reopen_without_pressure',
    upsellStrategy: 'soft_contextual',
    roomBehavior: 'shared_room_resume',
    lifecycleBehavior: 'session_orchestrated',
    ...overrides,
  }
}

function buildBehaviorPolicy(productId: PlatformProductId): TelegramProductBehaviorPolicy {
  const sharedLifecycle: TelegramProductBehaviorPolicy['lifecycle'] = {
    guest: buildLifecycleBehavior('buy', {
      secondaryCtas: ['activateGift'],
      onboardingBehavior: 'entry_offer',
      reminderCadence: 'off',
      reminderTone: 'silent',
      mentorIntensity: 'silent',
      activationStrategy: 'waitlist',
      streakStrategy: 'not_started',
      gamificationStrategy: 'preview_only',
      roomBehavior: 'locked_room_preview',
      lifecycleBehavior: 'guest_fallback',
    }),
    onboarding: buildLifecycleBehavior('continueOnboarding', {
      onboardingBehavior: 'continue_guided_setup',
      reminderCadence: 'gentle',
      reminderTone: 'soft',
      mentorIntensity: 'soft',
      activationStrategy: 'resume',
      streakStrategy: 'seed_first_streak',
      gamificationStrategy: 'early_momentum',
      roomBehavior: 'open_onboarding_room',
    }),
    trial: buildLifecycleBehavior('continueLesson', {
      reminderCadence: 'daily',
      reminderTone: 'focused',
      mentorIntensity: 'soft',
      activationStrategy: 'resume',
      streakStrategy: 'protect_trial_streak',
      gamificationStrategy: 'trial_momentum',
      upsellStrategy: 'soft_when_progress_visible',
      roomBehavior: 'trial_room_open',
    }),
    active: buildLifecycleBehavior('continueLesson', {
      reminderCadence: 'daily',
      reminderTone: 'focused',
      mentorIntensity: 'medium',
      activationStrategy: 'resume',
      streakStrategy: 'protect_and_extend_streak',
      gamificationStrategy: 'full_progress_loop',
      upsellStrategy: 'contextual_only',
      roomBehavior: 'active_room_resume',
    }),
    paused: buildLifecycleBehavior('restore', {
      reminderCadence: 'gentle',
      reminderTone: 'retention',
      mentorIntensity: 'soft',
      activationStrategy: 'restore',
      streakStrategy: 'preserve_snapshot',
      gamificationStrategy: 'show_saved_progress',
      winbackStrategy: 'restore_with_saved_context',
      roomBehavior: 'paused_room_resume',
    }),
    expired: buildLifecycleBehavior('restore', {
      reminderCadence: 'gentle',
      reminderTone: 'retention',
      mentorIntensity: 'soft',
      activationStrategy: 'restore',
      streakStrategy: 'preserve_snapshot',
      gamificationStrategy: 'show_saved_progress',
      winbackStrategy: 'restore_with_saved_context',
      roomBehavior: 'paused_room_resume',
    }),
    gifted: buildLifecycleBehavior('activateGift', {
      onboardingBehavior: 'gift_activation',
      reminderCadence: 'gentle',
      reminderTone: 'soft',
      mentorIntensity: 'soft',
      activationStrategy: 'gift',
      streakStrategy: 'seed_first_streak',
      gamificationStrategy: 'gift_momentum',
      roomBehavior: 'gifted_room_resume',
    }),
    bonus: buildLifecycleBehavior('activateGift', {
      onboardingBehavior: 'bonus_activation',
      reminderCadence: 'gentle',
      reminderTone: 'soft',
      mentorIntensity: 'soft',
      activationStrategy: 'gift',
      streakStrategy: 'seed_first_streak',
      gamificationStrategy: 'bonus_momentum',
      roomBehavior: 'bonus_room_resume',
    }),
    completed: buildLifecycleBehavior('reopen', {
      onboardingBehavior: 'completion_reentry',
      reminderCadence: 'streak',
      reminderTone: 'focused',
      mentorIntensity: 'soft',
      activationStrategy: 'resume',
      streakStrategy: 'celebrate_then_restart',
      gamificationStrategy: 'completion_badges',
      completionStrategy: 'reopen_with_review',
      roomBehavior: 'completed_room_reopen',
    }),
    winback: buildLifecycleBehavior('restore', {
      reminderCadence: 'gentle',
      reminderTone: 'retention',
      mentorIntensity: 'soft',
      activationStrategy: 'restore',
      streakStrategy: 'preserve_snapshot',
      gamificationStrategy: 'saved_progress_restore',
      winbackStrategy: 'resume_from_last_step',
      roomBehavior: 'winback_room_resume',
    }),
    inactive: buildLifecycleBehavior('buy', {
      secondaryCtas: ['activateGift'],
      onboardingBehavior: 'paywall_entry',
      reminderCadence: 'off',
      reminderTone: 'silent',
      mentorIntensity: 'silent',
      activationStrategy: 'payment',
      streakStrategy: 'not_started',
      gamificationStrategy: 'preview_only',
      roomBehavior: 'locked_room_preview',
      lifecycleBehavior: 'inactive_paywall',
    }),
    low_activity: buildLifecycleBehavior('💬 Продовжити практику', {
      reminderCadence: 'every2days',
      reminderTone: 'warm',
      mentorIntensity: 'aggressive',
      activationStrategy: 'resume',
      streakStrategy: 'recover_streak',
      gamificationStrategy: 'momentum_recovery',
      roomBehavior: 'warm_reentry_room',
      lifecycleBehavior: 'reengage_before_dropoff',
      mentorMessage: 'Ти починав(ла) — продовжимо разом?',
    }),
    high_engagement: buildLifecycleBehavior('▶️ Далі', {
      reminderCadence: 'daily',
      reminderTone: 'direct',
      mentorIntensity: 'silent',
      activationStrategy: 'resume',
      streakStrategy: 'protect_high_engagement',
      gamificationStrategy: 'accelerate_progress',
      roomBehavior: 'fast_path_room',
      lifecycleBehavior: 'high_engagement_guard',
      upsellCheck: true,
      mentorCandidateCheck: true,
    }),
    upsell_ready: buildLifecycleBehavior('⭐ Наступний крок', {
      reminderCadence: 'gentle',
      reminderTone: 'warm',
      mentorIntensity: 'medium',
      activationStrategy: 'resume',
      streakStrategy: 'stabilize_before_upsell',
      gamificationStrategy: 'unlock_next_level',
      roomBehavior: 'next_level_offer',
      lifecycleBehavior: 'upsell_window',
      softUpsellMessage: 'Ти вже далеко. Готовий(а) до наступного рівня?',
      maxUpsellPerWeek: 1,
    }),
    mentor_candidate: buildLifecycleBehavior('🤖 Спробувати AI Mentor', {
      reminderCadence: 'gentle',
      reminderTone: 'warm',
      mentorIntensity: 'medium',
      activationStrategy: 'resume',
      streakStrategy: 'mentor_assisted_momentum',
      gamificationStrategy: 'mentor_guided_progress',
      roomBehavior: 'mentor_entry_room',
      lifecycleBehavior: 'mentor_promotion_window',
      promoteMentor: true,
      skipIfAlreadySubscribed: true,
    }),
    affiliate: buildLifecycleBehavior('🚀 Розпочати', {
      reminderCadence: 'daily',
      reminderTone: 'warm',
      mentorIntensity: 'silent',
      activationStrategy: 'gift',
      streakStrategy: 'affiliate_activation',
      gamificationStrategy: 'affiliate_momentum',
      roomBehavior: 'affiliate_room_entry',
      lifecycleBehavior: 'affiliate_tracking',
      trackingRequired: true,
    }),
  }

  if (productId === 'stankey') {
    return {
      productId,
      telegramFirst: true,
      roomSwitching: 'shared-bot-room-switch',
      mentorGuardrail: 'support momentum, protect streak, never spam sales while practice is active',
      reminderGuardrail: 'nudge by lifecycle and room context, not by raw timer alone',
      lifecycle: {
        ...sharedLifecycle,
        active: buildLifecycleBehavior('continueLesson', {
          reminderCadence: 'daily',
          reminderTone: 'focused',
          mentorIntensity: 'medium',
          activationStrategy: 'resume',
          streakStrategy: 'daily_practice_streak',
          gamificationStrategy: 'lesson_streak_and_checkpoint_badges',
          upsellStrategy: 'soft cross-sell only after visible wins',
          roomBehavior: 'telegram_first_practice_room',
        }),
      },
    }
  }

  return {
    productId,
    telegramFirst: false,
    roomSwitching: 'shared-bot-room-switch',
    mentorGuardrail: 'be lifecycle-aware and retention-focused without fatigue',
    reminderGuardrail: 'respect access state and current activity before nudging',
    lifecycle: sharedLifecycle,
  }
}

function buildCopy(productId: PlatformProductId): TelegramRoomCopy {
  const product = subscriptionsContent.products[productId]

  if (productId === 'stankey') {
    return {
      welcome: stankeyContent.telegram.product.readyLines,
      activation: stankeyContent.telegram.product.paymentSuccessLines,
      payment: [
        'Щоб не втратити ритм, обери формат доступу, який тобі зараз підходить.',
        'Оплата відкриє той самий потік без втрати контексту.',
      ],
      gift: [
        '🎁 Доступ до STANKEY активовано як gift або bonus.',
        'Відкривай room і продовжуй із потрібного матеріалу.',
      ],
      restore: stankeyContent.telegram.product.pausedStartLines('Твій'),
      reminder: product.retention,
      mentor: product.telegram.continueFlow,
      onboarding: stankeyContent.telegram.onboarding.waitlistLines,
    }
  }

  if (productId === 'focus') {
    return {
      welcome: [
        ...focusContent.telegram.welcome,
        focusContent.welcome.title,
      ],
      activation: [
        ...focusContent.telegram.activation,
        focusContent.nudges.activation.body.join(' '),
      ],
      payment: [
        ...focusContent.telegram.payment,
        focusContent.paywall.primary.body,
      ],
      gift: [
        ...focusContent.telegram.gift,
        'Почни з першого кроку і тримай ритм без перевантаження.',
      ],
      restore: [
        ...focusContent.telegram.restore,
        'Повертаю тебе до останнього зрозумілого кроку.',
      ],
      reminder: [
        ...focusContent.telegram.reminder,
        focusContent.reminders.weekly.body,
      ],
      mentor: [
        ...focusContent.telegram.mentor,
        focusContent.ai.mentor.description,
      ],
      onboarding: [
        ...focusContent.telegram.onboarding,
        ...focusContent.onboarding.steps,
      ],
    }
  }

  return {
    welcome: product.telegram.welcome,
    activation: product.telegram.paymentSuccess,
    payment: product.telegram.subscriptionExpired,
    gift: [
      '🎁 Доступ активовано як подарунок.',
      'Відкривай room і продовжуй без зайвого шуму.',
    ],
    restore: product.winback,
    reminder: product.retention,
    mentor: product.telegram.continueFlow,
    onboarding: product.telegram.trialStarted,
  }
}

function buildMentorModes(productId: PlatformProductId): Record<SubscriptionLifecycleState, TelegramMentorMode> {
  if (productId === 'absystem') {
    return {
      inactive: 'silent',
      trial: 'soft',
      active: 'aggressive',
      paused: 'soft',
      expired: 'medium',
      completed: 'medium',
      winback: 'medium',
      upsellReady: 'aggressive',
    }
  }

  if (productId === 'focus') {
    return {
      inactive: 'silent',
      trial: 'soft',
      active: 'medium',
      paused: 'soft',
      expired: 'medium',
      completed: 'medium',
      winback: 'medium',
      upsellReady: 'soft',
    }
  }

  return {
    inactive: 'silent',
    trial: 'soft',
    active: 'medium',
    paused: 'soft',
    expired: 'medium',
    completed: 'medium',
    winback: 'medium',
    upsellReady: 'aggressive',
  }
}

function buildContext(productId: PlatformProductId): TelegramProductContext {
  const product = getPlatformProductConfig(productId)
  return {
    productId,
    roomId: product.productRoom.id,
    title: product.title,
    route: {
      public: product.routing.publicRoute,
      app: product.routing.appRoute,
      dashboard: product.routing.dashboardRoute,
      miniApp: product.routing.miniAppRoute,
    },
    room: product.productRoom,
    access: {
      entryProducts: product.access.entryProducts,
      includedProducts: product.access.includedProducts,
      recommendedUpsells: product.access.recommendedUpsells,
      lifecycleStates: product.access.lifecycleStates as SubscriptionLifecycleState[],
    },
    cta: CTA,
    copy: buildCopy(productId),
    reminder: {
      enabled: product.cronReminderFlags.reminders,
      streak: product.cronReminderFlags.streak,
      scheduledJobs: product.cronReminderFlags.scheduledJobs,
    },
    mentorModes: buildMentorModes(productId),
    behaviorPolicy: buildBehaviorPolicy(productId),
    paymentUrl: product.paymentUrl,
    navigation: product.routing,
    relationMap: product.relationMap,
  }
}

export const telegramProductContext = {
  focus: buildContext('focus'),
  stankey: buildContext('stankey'),
  absystem: buildContext('absystem'),
} satisfies Record<PlatformProductId, TelegramProductContext>

export function getTelegramProductContext(productId: PlatformProductId): TelegramProductContext {
  return telegramProductContext[productId]
}

export function resolveTelegramProductBehavior(
  productId: PlatformProductId,
  lifecycleState: TelegramBehaviorLifecycleState,
): TelegramLifecycleBehavior {
  return getTelegramProductContext(productId).behaviorPolicy.lifecycle[lifecycleState]
}

export function getTelegramProductIntent(raw: string | null | undefined): TelegramProductIntent | null {
  const normalized = String(raw ?? '').trim().toLowerCase()
  if (!normalized) return null

  const match = normalized.match(/^(paid|gift|gifted|bonus|restore|onboard|onboarding)_(focus|stankey|absystem)$/)
  if (!match) return null

  const [, actionRaw, productId] = match
  const actionMap: Record<string, TelegramProductIntent['action']> = {
    paid: 'paid',
    gift: 'gifted',
    gifted: 'gifted',
    bonus: 'bonus',
    restore: 'restore',
    onboard: 'onboarding',
    onboarding: 'onboarding',
  }

  return {
    action: actionMap[actionRaw] ?? 'onboarding',
    productId: productId as PlatformProductId,
    raw: normalized,
  }
}
