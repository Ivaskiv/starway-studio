import { Markup } from 'telegraf'

import type { TelegramAccessSource } from '@/content/telegram.product-context.js'
import { focusManifest } from '@/products/focus/product.manifest.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import { getPlatformProductConfig } from '@starway/shared/platform.registry'
import { prisma } from '../../../../db/client.js'
import { getMediaById,getNextLesson } from '../../../../products/stankey/media/catalog.js'
import { resolveStankeyProgressSnapshot } from '../../../../products/stankey/progress.service.js'
import { resolveUserLifecycle } from '../../../flow-control/service.js'
import type { UserLifecycleSnapshot } from '../../../flow-control/types.js'
import { resolveCentralLifecycleSnapshot,type CentralLifecycleSnapshot } from '../../../lifecycle/service.js'
import { getUserAccessState, type UserAccessState } from '../../../subscriptions/payments/focus-access.js'
import { getTelegramAppUrl,withDevTestPaymentButton } from '../../keyboards.js'
import {
resolveTelegramProductRoom,
type TelegramProductRoom,
} from './room.js'

type ProductState = 'active' | 'trial' | 'paused' | 'onboarding-started' | 'inactive'
type ProductKey = 'ABsystem' | 'STANKEY' | 'FOCUS'
type SummaryButton = TelegramProductRoom['buttons'][number][number]

type SubscriptionLike = {
  productId: string | null
  product: {
    code: string
  } | null
  status: string
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  planCode: string | null
  createdAt: Date
}

type ProductSummaryBlock = {
  key: ProductKey
  title: string
  state: ProductState
  selectedFlow: string
  lines: string[]
  buttons: TelegramProductRoom['buttons']
  visible: boolean
  roomId: string
  accessSource: TelegramAccessSource
  mentorMode: TelegramProductRoom['mentorMode']
  activationState: TelegramProductRoom['activationState']
  progressState: TelegramProductRoom['progressState']
  reminderState: TelegramProductRoom['reminderState']
  gamificationState: TelegramProductRoom['gamificationState']
  behaviorPolicy: TelegramProductRoom['behaviorPolicy']
  behaviorState: TelegramProductRoom['behaviorState']
  upsellState: TelegramProductRoom['upsellState']
  retentionState: TelegramProductRoom['retentionState']
  paymentUrl: string | null
  openUrl: string | null
  progressUrl: string | null
}

type ProductSummaryResult = {
  lines: string[]
  reply_markup: ReturnType<typeof Markup.inlineKeyboard>['reply_markup']
  activeProducts: ProductKey[]
  trialProducts: ProductKey[]
  pausedProducts: ProductKey[]
  inactiveProducts: ProductKey[]
  products: ProductSummaryBlock[]
  allProducts: ProductSummaryBlock[]
  webRooms: ReturnType<typeof buildWebRoomSnapshot>[]
  primary: ProductSummaryBlock | null
  progress: {
    streak: number
    completedLessons: number
    currentLesson: string | null
    currentStep: string | null
    lastActivityAt: Date | null
    paymentStatus: 'paid' | 'trial' | 'paused' | 'unpaid'
  }
  hasStankeyPurchase: boolean
  hasCorePurchase: boolean
}

function statusIcon(state: ProductState): string {
  switch (state) {
    case 'active':
      return '✅ у ритмі'
    case 'trial':
      return '🟡 пробний доступ'
    case 'paused':
      return '⏸ на паузі'
    case 'onboarding-started':
      return '🟦 рух триває'
    default:
      return '❌ ще не активовано'
  }
}

function isInternalStep(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toUpperCase()
  return !normalized || normalized === 'LINK_TELEGRAM'
}

function friendlyStageLabel(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized.toUpperCase() === 'LINK_TELEGRAM') {
    return null
  }

  const upper = normalized.toUpperCase()
  const map: Record<string, string> = {
    START_FLOW: 'початок курсу',
    PAYWALL: 'оплата',
    TRIAL_OFFER: 'пробний доступ',
    ENTRY: 'вхід',
    ACTIVE: 'активний',
    INACTIVE: 'доступ на паузі',
    ONBOARDING: 'вхід у рух',
  }

  if (map[upper]) {
    return map[upper]
  }

  if (/^TRIAL_DAY_\d+$/i.test(normalized)) {
    return normalized.replace('_', ' ').toLowerCase()
  }

  if (/^lead_step_\d+$/i.test(normalized)) {
    return normalized.replace('_', ' ').toLowerCase()
  }

  return normalized.replaceAll('_', ' ').toLowerCase()
}

function latestSubscriptionByFilter(
  subscriptions: SubscriptionLike[],
  predicate: (subscription: SubscriptionLike) => boolean,
): SubscriptionLike | null {
  return subscriptions.find(predicate) ?? null
}

function safeGetMediaTitle(mediaId: string | null | undefined): string | null {
  if (!mediaId) return null
  try {
    return getMediaById(mediaId)?.title ?? null
  } catch (error) {
    console.warn('[TELEGRAM_PRODUCT_SUMMARY] stankey_catalog_unavailable', {
      operation: 'getMediaById',
      mediaId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function safeGetNextLessonTitle(mediaId: string | null | undefined): string | null {
  try {
    return getNextLesson(mediaId ?? null)?.title ?? null
  } catch (error) {
    console.warn('[TELEGRAM_PRODUCT_SUMMARY] stankey_catalog_unavailable', {
      operation: 'getNextLesson',
      mediaId: mediaId ?? null,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function hasCorePurchase(purchaseHistory: Array<{ metadata: unknown }>): boolean {
  return purchaseHistory.some((item) => {
    const metadata = item.metadata as Record<string, unknown> | null
    return metadata?.kind === 'core_subscription'
      || metadata?.productId === focusManifest.slug
      || metadata?.productId === null
  })
}

function hasStankeyPurchase(purchaseHistory: Array<{ metadata: unknown }>): boolean {
  return purchaseHistory.some((item) => {
    const metadata = item.metadata as Record<string, unknown> | null
    return metadata?.kind === 'stankey_subscription'
      || metadata?.productId === stankeyManifest.productId
  })
}

const focusProductConfig = getPlatformProductConfig('focus')
const stankeyProductConfig = getPlatformProductConfig('stankey')

function buildButtonRows(productKey: ProductKey, state: ProductState, urls: { openUrl?: string; progressUrl?: string; paymentUrl?: string }, nextLessonTitle?: string | null): SummaryButton[][] {
  switch (productKey) {
    case 'STANKEY':
      if (state === 'active' || state === 'trial' || state === 'onboarding-started') {
        return [[
          ...(urls.openUrl ? [{ text: nextLessonTitle ? `▶️ ${String(nextLessonTitle).toUpperCase()}` : '▶️ ПРОДОВЖИТИ ПРАКТИКУ', web_app: { url: urls.openUrl } }] : []),
          ...(urls.progressUrl ? [{ text: 'МІЙ ОГЛЯД', web_app: { url: urls.progressUrl } }] : []),
        ]]
      }

      if (state === 'paused') {
        return withDevTestPaymentButton([[
          ...(urls.paymentUrl ? [{ text: 'ВІДНОВИТИ ДОСТУП', url: urls.paymentUrl }] : []),
          ...(urls.progressUrl ? [{ text: 'МІЙ ОГЛЯД', web_app: { url: urls.progressUrl } }] : []),
        ]])
      }

      return withDevTestPaymentButton([[
        ...(urls.paymentUrl ? [{ text: 'АКТИВУВАТИ', url: urls.paymentUrl }] : []),
      ]])
    case 'ABsystem':
      if (state === 'active' || state === 'trial' || state === 'onboarding-started') {
        return [[
          ...(urls.openUrl ? [{ text: 'ВІДКРИТИ ABSYSTEM', web_app: { url: urls.openUrl } }] : []),
          ...(urls.progressUrl ? [{ text: 'МОЯ СТАТИСТИКА', web_app: { url: urls.progressUrl } }] : []),
        ]]
      }

      if (state === 'paused') {
        return withDevTestPaymentButton([[
          ...(urls.paymentUrl ? [{ text: 'ВІДНОВИТИ ДОСТУП', url: urls.paymentUrl }] : []),
          ...(urls.progressUrl ? [{ text: 'МОЯ СТАТИСТИКА', web_app: { url: urls.progressUrl } }] : []),
        ]])
      }

      return withDevTestPaymentButton([[
        ...(urls.paymentUrl ? [{ text: 'АКТИВУВАТИ', url: urls.paymentUrl }] : []),
      ]])
    case 'FOCUS':
    default:
      if (state === 'active' || state === 'trial' || state === 'onboarding-started') {
        return [[
          ...(urls.openUrl ? [{ text: 'ВІДКРИТИ FOCUS', callback_data: 'open_focus_portal' }] : []),
          ...(urls.progressUrl ? [{ text: 'МІЙ ОГЛЯД', web_app: { url: urls.progressUrl } }] : []),
        ]]
      }

      if (state === 'paused') {
        return withDevTestPaymentButton([[
          ...(urls.paymentUrl ? [{ text: 'ВІДНОВИТИ ДОСТУП', url: urls.paymentUrl }] : []),
          ...(urls.progressUrl ? [{ text: 'МІЙ ОГЛЯД', web_app: { url: urls.progressUrl } }] : []),
        ]])
      }

      return withDevTestPaymentButton([[
        ...(urls.paymentUrl ? [{ text: 'АКТИВУВАТИ', url: urls.paymentUrl }] : []),
      ]])
  }
}

function buildStankeyLines(state: ProductState, progress: Awaited<ReturnType<typeof resolveStankeyProgressSnapshot>>, stageLabel: string | null): string[] {
  const lessonTitle = safeGetMediaTitle(progress.currentLesson)
  const nextLessonTitle = safeGetNextLessonTitle(progress.currentLesson) ?? lessonTitle ?? null

  const lines: string[] = ['Практикум', statusIcon(state)]

  if (state === 'active' || state === 'trial' || state === 'onboarding-started') {
    if (lessonTitle) {
      lines.push(`Зараз у фокусі: ${lessonTitle}`)
    } else if (nextLessonTitle) {
      lines.push(`Почнемо з: ${nextLessonTitle}`)
    }
    lines.push('Твій рух уже збережено.')
    return lines
  }

  if (state === 'paused') {
    lines.push('Твій рух і історія збережені.')
    lines.push('Можемо повернутись з останнього місця.')
    return lines
  }

  if (state === 'inactive') {
    lines.push('Можемо повернутись до твого ритму.')
  }

  return lines
}

function buildGenericLines(key: ProductKey, state: ProductState, stageLabel: string | null, progress: Awaited<ReturnType<typeof resolveStankeyProgressSnapshot>>): string[] {
  const lines: string[] = [key === 'ABsystem' ? 'ABsystem' : key === 'STANKEY' ? 'Практикум' : 'FOCUS', statusIcon(state)]

  if (state === 'active' || state === 'trial' || state === 'onboarding-started') {
    if (progress.currentLesson) {
      lines.push(`Зараз у фокусі: ${progress.currentLesson}`)
    }
    lines.push('Тут збережено твою історію.')
    return lines
  }

  if (state === 'paused') {
    lines.push('Твій рух і історія збережені.')
    lines.push('Повернемось з останнього місця.')
    return lines
  }

  lines.push('Повернемось до твого ритму.')
  return lines
}

function buildProductBlock(params: {
  key: ProductKey
  title: string
  subscription: SubscriptionLike | null
  canonicalState?: ProductState | null
  userLifecycle: UserLifecycleSnapshot
  lifecycle: CentralLifecycleSnapshot
  touched: boolean
  paymentUrl: string | undefined
  progress: Awaited<ReturnType<typeof resolveStankeyProgressSnapshot>>
  stageLabel: string | null
  openUrl?: string
  progressUrl?: string
  onboardingAllowed?: boolean
  purchaseHistory: Array<{ metadata: unknown; createdAt: Date; productId: string | null }>
  productAccesses: Array<{ product: string; role: string; createdAt: Date }>
}): ProductSummaryBlock | null {
  const touched = params.touched || params.lifecycle.state !== 'guest'
  const state: ProductState | null = params.canonicalState
    ?? (params.lifecycle.roomState === 'active'
    ? 'active'
    : params.lifecycle.roomState === 'trial'
      ? 'trial'
      : params.lifecycle.roomState === 'paused'
        ? 'paused'
        : params.lifecycle.roomState === 'onboarding-started'
          ? 'onboarding-started'
          : touched
            ? 'inactive'
            : null)

  if (!state) {
    return null
  }

  const nextLessonTitle = params.key === 'STANKEY'
    ? safeGetNextLessonTitle(params.progress.currentLesson)
    : null
  const room = resolveTelegramProductRoom({
    productId: params.key === 'STANKEY'
      ? 'stankey'
      : params.key === 'ABsystem'
        ? 'absystem'
        : 'focus',
    productKey: params.key,
    title: params.title,
    state,
    canonicalState: params.canonicalState ?? undefined,
    lifecycle: params.userLifecycle,
    subscription: params.subscription,
    purchaseHistory: params.purchaseHistory,
    productAccesses: params.productAccesses,
    progress: params.progress,
    stageLabel: params.stageLabel,
    openUrl: params.openUrl,
    progressUrl: params.progressUrl,
    paymentUrl: params.paymentUrl,
    onboardingAllowed: params.onboardingAllowed,
    nextLessonTitle,
  })

  const lines = params.key === 'STANKEY'
    ? buildStankeyLines(state, params.progress, params.stageLabel)
    : buildGenericLines(params.key, state, params.stageLabel, params.progress)

  return {
    key: params.key,
    title: params.title,
    state: room.state,
    selectedFlow: room.selectedFlow,
    lines,
    buttons: room.buttons,
    visible: true,
    roomId: room.roomId,
    accessSource: room.accessSource,
    mentorMode: room.mentorMode,
    activationState: room.activationState,
    progressState: room.progressState,
    reminderState: room.reminderState,
    gamificationState: room.gamificationState,
    behaviorPolicy: room.behaviorPolicy,
    behaviorState: room.behaviorState,
    upsellState: room.upsellState,
    retentionState: room.retentionState,
    paymentUrl: room.paymentUrl,
    openUrl: room.openUrl,
    progressUrl: room.progressUrl,
  }
}

function resolveCanonicalFocusRoomState(accessState: UserAccessState): ProductState {
  if (accessState.state === 'FOCUS_ACTIVE') {
    return 'active'
  }

  if (accessState.state === 'PREMIUM' || accessState.state === 'FREE_WEEK1') {
    return 'trial'
  }

  return 'inactive'
}

function buildWebRoomSnapshot(product: ProductSummaryBlock) {
  return {
    key: product.key,
    title: product.title,
    state: product.state,
    selectedFlow: product.selectedFlow,
    roomId: product.roomId,
    accessSource: product.accessSource,
    mentorMode: product.mentorMode,
    activationState: product.activationState,
    progressState: product.progressState,
    reminderState: product.reminderState,
    gamificationState: product.gamificationState,
    behaviorPolicy: product.behaviorPolicy,
    behaviorState: product.behaviorState,
    upsellState: product.upsellState,
    retentionState: product.retentionState,
    paymentUrl: product.paymentUrl,
    openUrl: product.openUrl,
    progressUrl: product.progressUrl,
  }
}

/** @deprecated-split: web snapshot to be extracted in STEP 43 */
export async function resolveTelegramProductSummary(userId: string): Promise<ProductSummaryResult> {
  const [user, subscriptions, purchaseHistory, progress, lifecycle, focusAccessState] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
                currentStep: true,
        onboardingStartedAt: true,
        productAccesses: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            product: true,
            role: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        productId: true,
        product: {
          select: {
            code: true,
          },
        },
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        planCode: true,
        createdAt: true,
      },
    }),
    prisma.purchaseHistory.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        productId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    resolveStankeyProgressSnapshot(userId),
    resolveUserLifecycle(userId),
    getUserAccessState(userId),
  ])

  const coreSubscription = latestSubscriptionByFilter(subscriptions, (item) => item.productId == null)
  const stankeySubscription = latestSubscriptionByFilter(
    subscriptions,
    (item) => item.product?.code?.toLowerCase() === stankeyManifest.productId.toLowerCase(),
  )
  const focusSubscription = latestSubscriptionByFilter(
    subscriptions,
    (item) => item.product?.code?.toLowerCase() === focusManifest.slug.toLowerCase(),
  )
  const lifecycleSnapshot = resolveCentralLifecycleSnapshot({
    userLifecycle: lifecycle,
    accessSource: lifecycle.state === 'trial' ? 'trial' : lifecycle.state === 'paid' ? 'payment' : lifecycle.state === 'expired' ? 'restore' : 'unknown',
    progress,
    onboardingStarted: Boolean(user?.onboardingStartedAt),
    onboardingCompleted: Boolean(progress.completedLessons > 0),
  })

  const stankeyTouched = Boolean(
    stankeySubscription
    || hasStankeyPurchase(purchaseHistory)
    || progress.currentLesson
    || progress.completedLessons > 0
    || progress.streak > 0
    || user?.onboardingStartedAt
  )

  const coreTouched = Boolean(coreSubscription || hasCorePurchase(purchaseHistory))
  const focusTouched = Boolean(focusSubscription || purchaseHistory.some((item) => {
    const metadata = item.metadata as Record<string, unknown> | null
    return metadata?.productId === focusManifest.slug
  })) || focusAccessState.state !== 'NO_ACCESS'

  const stankeyStageLabel = friendlyStageLabel(user?.currentStep ?? user?.currentStep ?? null)
  const coreStageLabel = friendlyStageLabel(user?.currentStep ?? user?.currentStep ?? null)
  const focusStageLabel = friendlyStageLabel(user?.currentStep ?? user?.currentStep ?? null)

  const blocks: Array<ProductSummaryBlock | null> = [
    buildProductBlock({
      key: 'STANKEY',
      title: stankeyManifest.name,
      subscription: stankeySubscription,
      userLifecycle: lifecycle,
      lifecycle: lifecycleSnapshot,
      touched: stankeyTouched,
      paymentUrl: stankeyProductConfig.paymentUrl ?? undefined,
      progress,
      stageLabel: stankeyStageLabel,
      openUrl: getTelegramAppUrl('/miniapp/library') ?? undefined,
      progressUrl: getTelegramAppUrl('/app/dashboard/progress') ?? undefined,
      onboardingAllowed: true,
      purchaseHistory,
      productAccesses: user?.productAccesses ?? [],
    }),
    buildProductBlock({
      key: 'ABsystem',
      title: 'ABsystem',
      subscription: coreSubscription,
      userLifecycle: lifecycle,
      lifecycle: lifecycleSnapshot,
      touched: coreTouched,
      paymentUrl: focusProductConfig.paymentUrl ?? undefined,
      progress,
      stageLabel: coreStageLabel,
      openUrl: getTelegramAppUrl('/app/dashboard') ?? undefined,
      progressUrl: getTelegramAppUrl('/app/dashboard/progress') ?? undefined,
      onboardingAllowed: false,
      purchaseHistory,
      productAccesses: user?.productAccesses ?? [],
    }),
    buildProductBlock({
      key: 'FOCUS',
      title: focusManifest.name,
      subscription: focusSubscription,
      canonicalState: resolveCanonicalFocusRoomState(focusAccessState),
      userLifecycle: lifecycle,
      lifecycle: lifecycleSnapshot,
      touched: focusTouched,
      paymentUrl: focusProductConfig.paymentUrl ?? undefined,
      progress,
      stageLabel: focusStageLabel,
      openUrl: getTelegramAppUrl('/focus') ?? undefined,
      progressUrl: getTelegramAppUrl('/app/dashboard/progress') ?? undefined,
      onboardingAllowed: false,
      purchaseHistory,
      productAccesses: user?.productAccesses ?? [],
    }),
  ]

  const visibleBlocks = blocks.filter((block): block is ProductSummaryBlock => Boolean(block))
  const orderedBlocks = visibleBlocks.sort((a, b) => {
    if (a.key === 'STANKEY' && b.key !== 'STANKEY') return -1
    if (b.key === 'STANKEY' && a.key !== 'STANKEY') return 1

    const statePriority: Record<ProductState, number> = {
      active: 0,
      paused: 1,
      trial: 2,
      'onboarding-started': 3,
      inactive: 4,
    }
    if (statePriority[a.state] !== statePriority[b.state]) {
      return statePriority[a.state] - statePriority[b.state]
    }

    const productPriority: Record<ProductKey, number> = {
      STANKEY: 0,
      ABsystem: 1,
      FOCUS: 2,
    }

    return productPriority[a.key] - productPriority[b.key]
  })

  const renderBlocks = orderedBlocks.filter((block) => block.state !== 'inactive')
  const hiddenBlocks = orderedBlocks.filter((block) => block.state === 'inactive')
  const webRooms = orderedBlocks.map((product) => buildWebRoomSnapshot(product))

  const lines = renderBlocks.flatMap((block, index) => [
    ...block.lines,
    index < renderBlocks.length - 1 ? '' : '',
  ])

  const keyboardRows = renderBlocks.flatMap((block) => block.buttons).filter((row) => row.length > 0)

  const activeProducts = renderBlocks.filter((block) => block.state === 'active').map((block) => block.key)
  const trialProducts = renderBlocks.filter((block) => block.state === 'trial').map((block) => block.key)
  const pausedProducts = renderBlocks.filter((block) => block.state === 'paused').map((block) => block.key)
  const inactiveProducts = hiddenBlocks.map((block) => block.key)

  console.info('[TELEGRAM_PRODUCT_SUMMARY]', {
    userId,
    activeProducts,
    pausedProducts,
    inactiveProducts,
  })

  return {
    lines,
    reply_markup: Markup.inlineKeyboard(keyboardRows).reply_markup,
    activeProducts,
    trialProducts,
    pausedProducts,
    inactiveProducts,
    products: renderBlocks,
    allProducts: orderedBlocks,
    webRooms,
    primary: renderBlocks[0] ?? null,
    progress: {
      streak: progress.streak,
      completedLessons: progress.completedLessons,
      currentLesson: progress.currentLesson,
      currentStep: isInternalStep(user?.currentStep) ? friendlyStageLabel(user?.currentStep ?? null) : friendlyStageLabel(user?.currentStep ?? null),
      lastActivityAt: progress.lastActivityAt,
      paymentStatus: progress.paymentStatus,
    },
    hasStankeyPurchase: hasStankeyPurchase(purchaseHistory),
    hasCorePurchase: hasCorePurchase(purchaseHistory),
  }
}
