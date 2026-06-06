import type { PlatformProductId } from '@starway/shared/platform.registry'

import { getProductCronProfile } from '@/platform/cron.registry.js'
import type { UserLifecycleSnapshot } from '../../flow-control/types.js'
import { logLifecycleSnapshot, resolveCentralLifecycleSnapshot, type CentralLifecycleSnapshot, type CentralLifecycleState } from '../../lifecycle/service.js'
import {
  getTelegramProductContext,
  getTelegramProductIntent,
  resolveTelegramProductBehavior,
  type TelegramAccessSource,
  type TelegramBehaviorLifecycleState,
  type TelegramLifecycleBehavior,
  type TelegramMentorMode,
  type TelegramProductIntent,
  type TelegramProductContext,
} from '@/content/telegram.product-context.js'
import { withDevTestPaymentButton } from '../keyboards.js'

export type TelegramRoomState = 'active' | 'trial' | 'paused' | 'onboarding-started' | 'inactive'
export type TelegramProductKey = 'FOCUS' | 'STANKEY' | 'ABsystem'

export type TelegramRoomButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; web_app: { url: string } }

export type TelegramProductRoom = {
  productId: PlatformProductId
  productKey: TelegramProductKey
  roomId: string
  title: string
  state: TelegramRoomState
  selectedFlow: string
  accessSource: TelegramAccessSource
  mentorMode: TelegramMentorMode
  onboardingState: string | null
  activationState: 'inactive' | 'trial' | 'active' | 'paused' | 'gifted' | 'bonus' | 'manual' | 'affiliate' | 'restore' | 'upsell' | 'onboarding-started'
  progressState: {
    currentLesson: string | null
    completedLessons: number
    streak: number
    lastActivityAt: Date | null
  }
  reminderState: {
    enabled: boolean
    streak: boolean
    scheduledJobs: boolean
    productScoped: boolean
    roomScoped: boolean
    lifecycleScoped: boolean
  }
  gamificationState: {
    streak: number
    completedLessons: number
    checkpoints: string[]
  }
  behaviorPolicy: TelegramLifecycleBehavior
  behaviorState: TelegramBehaviorLifecycleState
  upsellState: 'none' | 'soft' | 'ready'
  retentionState: 'none' | 'warm' | 'watch' | 'restore'
  paymentUrl: string | null
  openUrl: string | null
  progressUrl: string | null
  copy: TelegramProductContext['copy']
  buttons: TelegramRoomButton[][]
}

export type TelegramRoomLaunch = {
  productId: PlatformProductId
  selectedFlow: string
  text: string
  buttons: TelegramRoomButton[][]
}

function toTelegramProductKey(productId: PlatformProductId): TelegramProductKey {
  if (productId === 'stankey') {
    return 'STANKEY'
  }

  if (productId === 'absystem') {
    return 'ABsystem'
  }

  return 'FOCUS'
}

export type TelegramProductRoomInput = {
  productId: PlatformProductId
  productKey: TelegramProductKey
  title: string
  state: TelegramRoomState
  lifecycle?: UserLifecycleSnapshot | null
  subscription: {
    status: string
    trialEndsAt: Date | null
    currentPeriodEnd: Date | null
    createdAt: Date
  } | null
  purchaseHistory: Array<{
    productId: string | null
    metadata: unknown
    createdAt: Date
  }>
  productAccesses?: Array<{
    product: string
    role: string
    createdAt: Date
  }>
  progress: {
    currentLesson: string | null
    completedLessons: number
    streak: number
    lastActivityAt: Date | null
  }
  stageLabel: string | null
  openUrl?: string
  progressUrl?: string
  paymentUrl?: string
  onboardingAllowed?: boolean
  nextLessonTitle?: string | null
  explicitWaitlist?: boolean
  rolloutEnabled?: boolean
  payload?: string | null
}

export type TelegramAccessOrchestrationInput = {
  summary: {
    activeProducts: TelegramProductKey[]
    trialProducts: TelegramProductKey[]
    pausedProducts: TelegramProductKey[]
    products: Array<{
      key: TelegramProductKey
      state: TelegramRoomState
      accessSource?: TelegramAccessSource
    }>
    primary: {
      key: TelegramProductKey
      state: TelegramRoomState
    } | null
  }
  explicitWaitlist: boolean
  rolloutEnabled: boolean
  payload: string | null
}

export type TelegramAccessOrchestration = {
  selectedFlow: string
  primaryProduct: TelegramProductKey | null
  hasPaidAccess: boolean
  hasTrialAccess: boolean
  hasPausedAccess: boolean
  hasOnboardingAccess: boolean
  hasGiftAccess: boolean
  hasBonusAccess: boolean
  accessSource: TelegramAccessSource
  mentorMode: TelegramMentorMode
  roomIntent: TelegramProductIntent | null
}

function normalizeMetadataValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function resolveAccessSourceFromMetadata(metadata: unknown): TelegramAccessSource | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const raw = metadata as Record<string, unknown>
  const candidate = normalizeMetadataValue(raw.accessSource ?? raw.source ?? raw.kind ?? raw.type)
  switch (candidate) {
    case 'payment':
    case 'paid':
    case 'subscription':
      return 'payment'
    case 'gift':
    case 'gifted':
      return 'gifted'
    case 'bonus':
      return 'bonus'
    case 'trial':
      return 'trial'
    case 'manual':
      return 'manual'
    case 'affiliate':
      return 'affiliate'
    case 'restore':
    case 'restored':
      return 'restore'
    case 'upsell':
      return 'upsell'
    default:
      return null
  }
}

function resolveMentorMode(
  productId: PlatformProductId,
  state: TelegramRoomState,
  accessSource: TelegramAccessSource,
): TelegramMentorMode {
  if (state === 'inactive') {
    return accessSource === 'gifted' || accessSource === 'bonus' ? 'soft' : 'silent'
  }

  if (state === 'paused') {
    return 'soft'
  }

  if (state === 'trial' || state === 'onboarding-started') {
    return 'soft'
  }

  if (productId === 'absystem') {
    return accessSource === 'upsell' ? 'aggressive' : 'medium'
  }

  return 'medium'
}

function resolveRoomState(input: TelegramProductRoomInput): TelegramRoomState {
  const now = new Date()
  const subscription = input.subscription

  if (subscription?.status === 'ACTIVE' && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)) {
    return 'active'
  }

  if (subscription?.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt > now) {
    return 'trial'
  }

  if (subscription?.status === 'PAUSED' || subscription?.status === 'CANCELLED') {
    return 'paused'
  }

  if (input.state === 'onboarding-started') {
    return 'onboarding-started'
  }

  return input.state
}

function resolveSelectedFlow(input: TelegramProductRoomInput, state: TelegramRoomState, accessSource: TelegramAccessSource): string {
  const intent = getTelegramProductIntent(input.payload)
  const isRestoreSource = String(accessSource) === 'restore'

  if (intent?.action === 'gifted') {
    return 'gifted_access'
  }

  if (intent?.action === 'bonus') {
    return 'bonus_access'
  }

  if (intent?.action === 'restore') {
    return 'restore_access'
  }

  if (intent?.action === 'onboarding') {
    return 'onboarding_room'
  }

  if (intent?.action === 'paid') {
    return 'product_ready'
  }

  if (state === 'active') {
    return 'product_ready'
  }

  if (state === 'trial') {
    return 'active_trial'
  }

  if (state === 'paused' || isRestoreSource) {
    return 'paused_access'
  }

  if (state === 'onboarding-started') {
    return 'onboarding_started'
  }

  if (accessSource === 'gifted') {
    return 'gifted_access'
  }

  if (accessSource === 'bonus') {
    return 'bonus_access'
  }

  if (isRestoreSource) {
    return 'restore_access'
  }

  if (input.explicitWaitlist || input.rolloutEnabled === false) {
    return 'early_access'
  }

  return 'offer_paywall'
}

function resolveRoomStateFromCentralLifecycle(
  input: TelegramProductRoomInput,
  accessSource: TelegramAccessSource,
): {
  roomState: TelegramRoomState
  lifecycleState: CentralLifecycleState
  mentorMode: TelegramMentorMode
  activationState: TelegramProductRoom['activationState']
  reminderState: TelegramProductRoom['reminderState']
  retentionState: TelegramProductRoom['retentionState']
  ctaState: string
  behaviorState: TelegramBehaviorLifecycleState
} | null {
  if (!input.lifecycle) {
    return null
  }

  const snapshot = resolveCentralLifecycleSnapshot({
    userLifecycle: input.lifecycle,
    productId: input.productId,
    accessSource,
    progress: input.progress,
    onboardingStarted: input.onboardingAllowed ? Boolean(input.lifecycle.currentStep || input.lifecycle.hasLeadMagnetFlow) : false,
    onboardingCompleted: input.onboardingAllowed ? input.lifecycle.hasCompletedLeadMagnet : false,
  })

  return {
    roomState: snapshot.roomState,
    lifecycleState: snapshot.state,
    mentorMode: snapshot.mentorState.mode,
    activationState: snapshot.activationState,
    reminderState: {
      enabled: snapshot.reminderState.eligible,
      streak: snapshot.reminderState.eligible,
      scheduledJobs: snapshot.reminderState.eligible,
      productScoped: snapshot.reminderState.eligible,
      roomScoped: snapshot.reminderState.eligible,
      lifecycleScoped: snapshot.reminderState.eligible,
    },
    retentionState: snapshot.retentionState === 'winback' ? 'restore' : snapshot.retentionState,
    ctaState: snapshot.ctaState,
    behaviorState: snapshot.state,
  }
}

function resolveBehaviorState(
  input: TelegramProductRoomInput,
  roomState: TelegramRoomState,
  accessSource: TelegramAccessSource,
): TelegramBehaviorLifecycleState {
  const hasMentorAccess = (input.productAccesses ?? []).some((access) => access.product === 'AI_MENTOR')
  const daysSinceLastActivity = input.progress.lastActivityAt
    ? Math.max(0, Math.floor((Date.now() - input.progress.lastActivityAt.getTime()) / 86400000))
    : null

  if (accessSource === 'affiliate') return 'affiliate'
  if (
    (accessSource === 'gifted' || accessSource === 'bonus' || accessSource === 'manual')
    && input.onboardingAllowed
    && input.progress.completedLessons === 0
    && !input.progress.currentLesson
  ) {
    return 'onboarding'
  }
  if (accessSource === 'gifted') return 'gifted'
  if (accessSource === 'bonus') return 'bonus'

  if (roomState === 'active' && input.progress.completedLessons >= 5) {
    return 'upsell_ready'
  }

  if ((roomState === 'active' || roomState === 'trial' || roomState === 'onboarding-started') && !hasMentorAccess && input.progress.completedLessons >= 1) {
    return 'mentor_candidate'
  }

  if (roomState === 'active' && (input.progress.streak >= 5 || input.progress.completedLessons >= 3)) {
    return 'high_engagement'
  }

  if ((roomState === 'active' || roomState === 'trial') && (daysSinceLastActivity === null || daysSinceLastActivity >= 2)) {
    return 'low_activity'
  }

  if (roomState === 'onboarding-started' && daysSinceLastActivity !== null && daysSinceLastActivity >= 2) {
    return 'low_activity'
  }

  if (roomState === 'active') return 'active'
  if (roomState === 'trial') return 'trial'
  if (roomState === 'paused') return accessSource === 'restore' ? 'winback' : 'paused'
  if (roomState === 'onboarding-started') return 'onboarding'
  return 'inactive'
}

function buildRoomButtons(input: {
  productId: PlatformProductId
  state: TelegramRoomState
  accessSource: TelegramAccessSource
  behavior: TelegramLifecycleBehavior
  paymentUrl: string | null
  openUrl: string | null
  progressUrl: string | null
  nextLessonTitle?: string | null
}): TelegramRoomButton[][] {
  const cta = getTelegramProductContext(input.productId).cta
  const primaryCta = input.behavior.primaryCta
  const openCtaLabel = typeof primaryCta === 'string' && primaryCta in cta
    ? cta[primaryCta as keyof typeof cta]
    : String(primaryCta)
  const openLabel = primaryCta === 'continueLesson' && input.productId === 'stankey' && input.nextLessonTitle
    ? `▶️ ${input.nextLessonTitle}`
    : openCtaLabel
  const openButton = input.openUrl
    ? { text: openLabel,
      web_app: { url: input.openUrl } }
    : null

  const progressButton = input.progressUrl
    ? { text: input.productId === 'stankey' ? '📊 Мій прогрес' : input.productId === 'absystem' ? '📈 Моя статистика' : '📈 Мій прогрес', web_app: { url: input.progressUrl } }
    : null

  if (primaryCta === 'activateGift') {
    return [[
      { text: cta.activateGift, callback_data: 'restart_flow' },
      ...(progressButton ? [progressButton] : []),
    ]]
  }

  // FIX(18.05.2026): Focus payment buttons must generate per-user dynamic checkout — Claude
  // Static paymentUrl from platform.registry has no userId — replaced with callback
  const focusPaymentButton: TelegramRoomButton | null =
    input.productId === 'focus'
      ? { text: cta.buy, callback_data: 'open_focus_payment' }
      : null
  const focusRestoreButton: TelegramRoomButton | null =
    input.productId === 'focus'
      ? { text: cta.restore, callback_data: 'open_focus_payment' }
      : null

  if (primaryCta === 'restore') {
    const restoreBtn = focusRestoreButton ?? (input.paymentUrl ? { text: cta.restore, url: input.paymentUrl } : null)
    console.log('[PAYMENT FLOW] restore button', { productId: input.productId, source: focusRestoreButton ? 'callback:open_focus_payment' : 'static_url' })
    return withDevTestPaymentButton([[
      ...(restoreBtn ? [restoreBtn] : []),
      ...(progressButton ? [progressButton] : []),
    ]])
  }

  if (input.state === 'active' || input.state === 'trial' || input.state === 'onboarding-started') {
    return [[
      ...(openButton ? [openButton] : []),
      ...(progressButton ? [progressButton] : []),
    ]]
  }

  if (input.state === 'paused') {
    const restoreBtn = focusRestoreButton ?? (input.paymentUrl ? { text: cta.restore, url: input.paymentUrl } : null)
    console.log('[PAYMENT FLOW] paused button', { productId: input.productId, source: focusRestoreButton ? 'callback:open_focus_payment' : 'static_url' })
    return withDevTestPaymentButton([[
      ...(restoreBtn ? [restoreBtn] : []),
      ...(progressButton ? [progressButton] : []),
    ]])
  }

  const buyBtn = focusPaymentButton ?? (input.paymentUrl ? { text: cta.buy, url: input.paymentUrl } : null)
  console.log('[PAYMENT FLOW] inactive/default button', { productId: input.productId, source: focusPaymentButton ? 'callback:open_focus_payment' : 'static_url' })
  return withDevTestPaymentButton([[
    ...(buyBtn ? [buyBtn] : []),
    ...(progressButton ? [progressButton] : []),
  ]])
}

export function resolveTelegramProductRoom(input: TelegramProductRoomInput): TelegramProductRoom {
  const context = getTelegramProductContext(input.productId)
  const intent = getTelegramProductIntent(input.payload)
  const accessSource =
    (intent?.action === 'gifted'
      ? 'gifted'
      : intent?.action === 'bonus'
        ? 'bonus'
        : intent?.action === 'restore'
          ? 'restore'
          : intent?.action === 'paid'
            ? 'payment'
            : intent?.action === 'onboarding'
              ? 'manual'
              : null)
    ?? resolveAccessSourceFromMetadata(input.purchaseHistory[0]?.metadata)
    ?? (input.productAccesses?.length ? 'manual' : null)
    ?? (input.state === 'trial' ? 'trial' : null)
    ?? (input.state === 'active' ? 'payment' : null)
    ?? (input.state === 'paused' ? 'restore' : null)
    ?? 'unknown'

  const reminderProfile = getProductCronProfile(input.productId)
  const centralLifecycle = resolveRoomStateFromCentralLifecycle(input, accessSource)
  if (centralLifecycle && (centralLifecycle.roomState !== input.state || centralLifecycle.activationState !== input.state)) {
    logLifecycleSnapshot('room_sync', {
      state: centralLifecycle.lifecycleState,
      roomState: centralLifecycle.roomState,
      activationState: centralLifecycle.activationState,
      subscriptionState: centralLifecycle.roomState === 'trial'
        ? 'trial'
        : centralLifecycle.roomState === 'active'
          ? 'active'
          : centralLifecycle.roomState === 'paused'
            ? 'paused'
            : 'inactive',
      onboardingState: centralLifecycle.roomState === 'onboarding-started' ? 'started' : 'not_started',
      retentionState: centralLifecycle.retentionState,
      mentorState: {
        mode: centralLifecycle.mentorMode,
        eligible: centralLifecycle.mentorMode !== 'silent',
      },
      reminderState: centralLifecycle.reminderState.enabled
        ? { eligible: true, reason: null }
        : { eligible: false, reason: 'sync_only' },
      progressionState: input.progress,
      accessSource,
      ctaState: centralLifecycle.ctaState as CentralLifecycleSnapshot['ctaState'],
      productId: input.productId,
      debug: {
        hasSubscription: input.state === 'active' || input.state === 'trial',
        hasTrial: input.state === 'trial',
        hasExpiredAccess: input.state === 'paused',
        hasOnboarding: input.state === 'onboarding-started',
        hasCompleted: false,
      },
    }, {
      inputState: input.state,
      computedState: centralLifecycle.lifecycleState,
    })
  }
  const state = centralLifecycle?.roomState ?? resolveRoomState(input)
  const behaviorState = resolveBehaviorState(input, state, accessSource)
  const behaviorPolicy = resolveTelegramProductBehavior(input.productId, behaviorState)
  const mentorMode = behaviorPolicy.mentorIntensity ?? centralLifecycle?.mentorMode ?? resolveMentorMode(input.productId, state, accessSource)
  const selectedFlow = resolveSelectedFlow(input, state, accessSource)
  const paymentUrl = input.paymentUrl ?? context.paymentUrl
  const activationState = centralLifecycle?.activationState
    ?? (accessSource === 'gifted' || accessSource === 'bonus' || accessSource === 'manual' || accessSource === 'affiliate' || accessSource === 'restore' || accessSource === 'upsell'
      ? accessSource
      : state)
  const reminderState = centralLifecycle?.reminderState ?? {
    enabled: reminderProfile.reminders,
    streak: reminderProfile.streak,
    scheduledJobs: reminderProfile.scheduledJobs,
    productScoped: reminderProfile.scheduledJobs,
    roomScoped: reminderProfile.reminders,
    lifecycleScoped: reminderProfile.scheduledJobs,
  }
  const retentionState = centralLifecycle?.retentionState
    ?? (state === 'active'
      ? 'warm'
      : state === 'paused'
        ? 'restore'
        : state === 'trial'
          ? 'watch'
          : 'none')

  return {
    productId: input.productId,
    productKey: input.productKey,
    roomId: context.roomId,
    title: input.title,
    state,
    selectedFlow,
    accessSource,
    mentorMode,
    onboardingState: input.onboardingAllowed ? (state === 'onboarding-started' ? 'started' : state === 'active' || state === 'trial' ? 'activated' : 'not_started') : null,
    activationState,
    progressState: input.progress,
    reminderState,
    gamificationState: {
      streak: input.progress.streak,
      completedLessons: input.progress.completedLessons,
      checkpoints: input.progress.currentLesson ? [input.progress.currentLesson] : [],
    },
    behaviorPolicy,
    behaviorState,
    upsellState: state === 'active' && context.relationMap.recommendedUpsells.length > 0
      ? 'ready'
      : state === 'trial'
        ? 'soft'
        : 'none',
    retentionState,
    paymentUrl,
    openUrl: input.openUrl ?? (input.productId === 'focus' ? context.navigation.publicRoute : context.navigation.miniAppRoute ?? context.navigation.appRoute),
    progressUrl: input.progressUrl ?? context.navigation.dashboardRoute,
    copy: context.copy,
    buttons: buildRoomButtons({
      productId: input.productId,
      state,
      accessSource,
      behavior: behaviorPolicy,
      paymentUrl,
      openUrl: input.openUrl ?? (input.productId === 'focus' ? context.navigation.publicRoute : context.navigation.miniAppRoute ?? context.navigation.appRoute),
      progressUrl: input.progressUrl ?? context.navigation.dashboardRoute,
      nextLessonTitle: input.nextLessonTitle,
    }),
  }
}

export function resolveTelegramAccessOrchestration(input: TelegramAccessOrchestrationInput): TelegramAccessOrchestration {
  const roomIntent = getTelegramProductIntent(input.payload)
  const primaryProductKey = input.summary.primary?.key
    ?? input.summary.activeProducts[0]
    ?? input.summary.trialProducts[0]
    ?? input.summary.pausedProducts[0]
    ?? null
  const accessSource = roomIntent?.action === 'gifted'
    ? 'gifted'
    : roomIntent?.action === 'bonus'
      ? 'bonus'
      : roomIntent?.action === 'restore'
        ? 'restore'
      : roomIntent?.action === 'paid'
          ? 'payment'
          : roomIntent?.action === 'onboarding'
            ? 'manual'
            : input.summary.products.find(product => product.key === primaryProductKey && product.accessSource)?.accessSource
              ?? input.summary.products.find(product => product.key === 'STANKEY' && product.accessSource)?.accessSource
              ?? input.summary.products.find(product => product.key === 'ABsystem' && product.accessSource)?.accessSource
              ?? input.summary.products.find(product => product.key === 'FOCUS' && product.accessSource)?.accessSource
              ?? 'unknown'

  const hasPaidAccess = input.summary.activeProducts.length > 0
  const hasTrialAccess = input.summary.trialProducts.length > 0
  const hasPausedAccess = input.summary.pausedProducts.length > 0
  const hasOnboardingAccess = input.summary.products.some((product) => product.state === 'onboarding-started')
  const hasGiftAccess = accessSource === 'gifted'
  const hasBonusAccess = accessSource === 'bonus'
  const primaryProduct = roomIntent?.productId ? toTelegramProductKey(roomIntent.productId) : primaryProductKey ?? null
  const mentorMode: TelegramMentorMode = hasPaidAccess ? 'medium' : hasTrialAccess ? 'soft' : hasPausedAccess ? 'soft' : 'silent'

  const selectedFlow = roomIntent?.action === 'gifted'
    ? 'gifted_access'
    : roomIntent?.action === 'bonus'
      ? 'bonus_access'
      : roomIntent?.action === 'restore'
        ? 'restore_access'
        : roomIntent?.action === 'onboarding'
          ? 'onboarding_room'
          : input.summary.activeProducts.length > 0
            ? 'product_ready'
            : input.summary.trialProducts.length > 0
              ? 'active_trial'
              : input.summary.pausedProducts.length > 0
                ? 'paused_access'
                : hasOnboardingAccess
                  ? 'onboarding_started'
                  : input.explicitWaitlist || input.rolloutEnabled === false
                    ? 'early_access'
                    : 'offer_paywall'

  return {
    selectedFlow,
    primaryProduct,
    hasPaidAccess,
    hasTrialAccess,
    hasPausedAccess,
    hasOnboardingAccess,
    hasGiftAccess,
    hasBonusAccess,
    accessSource,
    mentorMode,
    roomIntent,
  }
}

export function resolveTelegramRoomLaunch(
  input: {
    payload: string | null
    summary: TelegramAccessOrchestrationInput['summary']
    firstName: string
  },
): TelegramRoomLaunch | null {
  const intent = getTelegramProductIntent(input.payload)
  if (!intent) {
    return null
  }

  const summaryRoom = input.summary.products.find((product) => product.key === (intent.productId === 'stankey' ? 'STANKEY' : intent.productId === 'absystem' ? 'ABsystem' : 'FOCUS'))
  const context = getTelegramProductContext(intent.productId)
  const state = summaryRoom?.state ?? (intent.action === 'restore' ? 'paused' : intent.action === 'gifted' || intent.action === 'bonus' ? 'inactive' : intent.action === 'paid' ? 'active' : 'onboarding-started')
  const productKey = toTelegramProductKey(intent.productId)
  const room = resolveTelegramProductRoom({
    productId: intent.productId,
    productKey,
    title: context.title,
    state,
    subscription: null,
    purchaseHistory: [],
    productAccesses: [],
    progress: {
      currentLesson: null,
      completedLessons: 0,
      streak: 0,
      lastActivityAt: null,
    },
    stageLabel: null,
    openUrl: intent.action === 'paid'
      ? context.navigation.miniAppRoute ?? context.navigation.appRoute
      : intent.action === 'restore'
        ? context.navigation.appRoute
        : intent.action === 'gifted' || intent.action === 'bonus'
          ? context.navigation.appRoute
          : context.navigation.appRoute,
    progressUrl: context.navigation.dashboardRoute ?? undefined,
    paymentUrl: context.paymentUrl ?? undefined,
    onboardingAllowed: true,
    payload: input.payload,
  })

  const copy =
    intent.action === 'gifted' || intent.action === 'bonus'
      ? room.copy.gift
      : intent.action === 'restore'
        ? room.copy.restore
        : intent.action === 'paid'
          ? room.copy.activation
          : room.copy.onboarding

  const buttons = room.buttons

  return {
    productId: intent.productId,
    selectedFlow:
      intent.action === 'gifted'
        ? 'gifted_access'
        : intent.action === 'bonus'
          ? 'bonus_access'
          : intent.action === 'restore'
            ? 'restore_access'
            : intent.action === 'paid'
              ? 'product_ready'
              : 'onboarding_room',
    text: copy.join('\n'),
    buttons,
  }
}
