import { abTestFocusContent } from '@/products/ab-system/content/abTest.focus.js'
import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import { prisma } from '../../../db/client.js'
import { invalidateFunnelStage } from '../../../lib/funnel/getUserFunnelStage.js'
import { syncLifecycleForUser } from '../../flow-control/service.js'
import type { PaymentData, PaymentResult } from '../types.js'
import { buildPaymentRequest } from './wayforpay.js'
import { buildShortWayForPayCheckoutUrl } from './wayforpay.checkout.js'

const CORE_SUBSCRIPTION_DURATIONS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
  yearly_plus: 365,
}

const STANKEY_SUBSCRIPTION_DURATIONS = Object.fromEntries(
  stankeyManifest.pricing.plans.map((plan) => [plan.id, plan.durationDays])
) as Record<string, number | null>

export type EcosystemPaymentProduct = 'focus' | 'absystem_ai'
export type EcosystemPaymentPlanId =
  | '1month'
  | '1month_upgrade'
  | '3month'
  | '6month'
  | '1year'

type EcosystemPlanDefinition = {
  amount: number
  durationDays: number
  dbProductCodes: readonly string[]
  lifecycleState: 'focus_active' | 'platform_active'
}

const ECOSYSTEM_PAYMENT_CATALOG: Record<
  EcosystemPaymentProduct,
  Partial<Record<EcosystemPaymentPlanId, EcosystemPlanDefinition>>
> = {
  focus: {
    '1month': {
      amount: 780,
      durationDays: 30,
      dbProductCodes: ['focus'],
      lifecycleState: 'focus_active',
    },
    '3month': {
      amount: 1990,
      durationDays: 90,
      dbProductCodes: ['focus'],
      lifecycleState: 'focus_active',
    },
  },
  absystem_ai: {
    '1month': {
      amount: 1900,
      durationDays: 30,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
    '1month_upgrade': {
      amount: 1120,
      durationDays: 30,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
    '6month': {
      amount: 9900,
      durationDays: 180,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
    '1year': {
      amount: 18000,
      durationDays: 365,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
  },
}

const LIFECYCLE_STATE_ORDER = new Map<string, number>([
  ['new', 0],
  ['test_started', 1],
  ['test_completed', 2],
  ['result_opened', 3],
  ['focus_offer_opened', 4],
  ['payment_started', 5],
  ['focus_active', 6],
  ['platform_active', 7],
  ['expired', 8],
])

export const FOCUS_DOJIM_TIMER_IDS = [
  'RESULT_DOJIM_24H',
  'RESULT_DOJIM_48H',
  'RESULT_DOJIM_72H',
  'RESULT_DOJIM_5D',
  'RESULT_DOJIM_7D',
] as const

export type FocusActivationDojimTimerId = (typeof FOCUS_DOJIM_TIMER_IDS)[number]

export type FocusActivationPlan = {
  userId: string
  lifecycleState: 'focus_active'
  welcomeMessageSent: true
  welcomeText: string
  welcomeCtaText: string
  channelInviteLink: string
  channelLinkPresent: boolean
  preZoomScheduled: boolean
  preZoomReminders: Array<{
    timerId: 'ZOOM_REMINDER_24H' | 'ZOOM_REMINDER_2H'
    sendAt: Date
    body: string
    ctaText: string
  }>
  dojimsCancelled: readonly FocusActivationDojimTimerId[]
}

export type PostZoomBridgePlan = {
  userId: string
  scheduled: boolean
  delayMs: number
  ctaText: string
  paymentUrl: string
}

export type UpgradeOfferPlan = {
  userId: string
  scheduled: boolean
  text: string
  ctaText: string
  paymentUrl: string
  delayMs: number
}

export type EcosystemPaymentCheckoutSession = {
  checkoutUrl: string
  orderReference: string
}

export function resolveFocusChannelInviteLink(input?: string | null) {
  const link =
    input?.trim() ||
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ||
    process.env.FOCUS_CHANNEL_INVITE_URL?.trim() ||
    process.env.TELEGRAM_FOCUS_CHANNEL_INVITE_URL?.trim() ||
    process.env.FOCUS_TELEGRAM_INVITE_URL?.trim() ||
    process.env.TELEGRAM_FOCUS_INVITE_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'https://t.me/'

  if (!link || link === 'https://t.me/') {
    console.warn(
      '🚨 [PAYMENT:INVITE] Resolved invite link is empty or root domain. Check environment variables.'
    )
  }

  return link
}

function getBackendBaseUrl() {
  return (
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '') ||
    // FIX: Never use APP_URL or FRONTEND_URL as backend base
    // If PUBLIC_API_URL is missing, fall back to port-based local
    process.env.TELEGRAM_WEBHOOK_URL?.trim()?.replace(/\/api\/telegram.*$/, '') ||
    (process.env.PORT
      ? `http://127.0.0.1:${process.env.PORT}`
      : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
}

export function buildEcosystemPaymentCheckoutUrl(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string
) {
  return buildEcosystemPaymentCheckoutSession(productId, planId, userId)
    .checkoutUrl
}

export function buildEcosystemPaymentCheckoutSession(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string
): EcosystemPaymentCheckoutSession {
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    throw new Error('invalid_ecosystem_plan')
  }

  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT?.trim() || process.env.WAYFORPAY_MERCHANT?.trim() || ''
  const merchantDomain = process.env.WAYFORPAY_MERCHANT_DOMAIN?.trim() || ''
  const merchantSecret = process.env.WAYFORPAY_SECRET_KEY?.trim() || process.env.WAYFORPAY_SECRET?.trim() || ''

  if (!merchantAccount || !merchantDomain || !merchantSecret) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Missing WayForPay credentials', {
      hasMerchantAccount: Boolean(merchantAccount),
      hasMerchantDomain: Boolean(merchantDomain),
      hasSecret: Boolean(merchantSecret),
    })
    throw new Error('WAYFORPAY_CREDENTIALS_MISSING')
  }

  const payRef = `${productId}_${planId}_${userId}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId,
    productId,
    amount: plan.amount,
    currency: 'UAH',
    payRef,
    product_name: [productId === 'focus' ? 'FOCUS' : 'ABSystem AI'],
    product_count: [1],
    product_price: [plan.amount],
  })

  const frontendBaseUrl = (
    process.env.FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '')

  if (frontendBaseUrl) {
    payment.returnUrl = `${frontendBaseUrl}/miniapp?startapp=billing-success`
  }

  const backendBase = getBackendBaseUrl()
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction && (backendBase.includes('127.0.0.1') || backendBase.includes('localhost'))) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Backend base URL is localhost in production:', backendBase)
    throw new Error('WAYFORPAY_INVALID_BACKEND_URL')
  }

  const checkoutUrl = buildShortWayForPayCheckoutUrl(backendBase, payment, {
    product: productId,
    plan: planId,
  })

  // FIX(18.05.2026): dynamic Focus payment buttons — Claude
  console.log('[WAYFORPAY_CHECKOUT] ✅ Checkout URL built', {
    productId,
    planId,
    payRef,
    amount: plan.amount,
    currency: 'UAH',
    hasReturnUrl: Boolean(frontendBaseUrl),
    hasServiceUrl: Boolean(process.env.WAYFORPAY_CALLBACK_URL?.trim()),
    checkoutUrlPrefix: checkoutUrl.slice(0, 80),
  })

  console.log('[DYNAMIC CHECKOUT]', {
    userId,
    planId,
    generatedOrderReference: payRef,
    generatedCheckoutUrl: checkoutUrl,
  })

  return {
    checkoutUrl,
    orderReference: payRef,
  }
}

export function buildAbsystemAiUpgradeCheckoutUrl(userId: string) {
  return buildEcosystemPaymentCheckoutUrl(
    'absystem_ai',
    '1month_upgrade',
    userId
  )
}

function parseOptionalDate(input?: string | Date | null): Date | null {
  if (!input) {
    return null
  }

  const date =
    input instanceof Date ? new Date(input.getTime()) : new Date(input)
  return Number.isFinite(date.getTime()) ? date : null
}

export function simulateFocusActivation(
  userId: string,
  input: {
    nextZoomAt?: string | Date | null
    channelInviteLink?: string | null
  } = {}
): FocusActivationPlan {
  const nextZoomAt = parseOptionalDate(input.nextZoomAt)
  const channelInviteLink = resolveFocusChannelInviteLink(
    input.channelInviteLink
  )
  const preZoomReminders = nextZoomAt
    ? [
        {
          timerId: 'ZOOM_REMINDER_24H' as const,
          sendAt: new Date(nextZoomAt.getTime() - 24 * 60 * 60 * 1000),
          body: abTestZoomContent.reminders.preZoom24h,
          ctaText: abTestZoomContent.cta,
        },
        {
          timerId: 'ZOOM_REMINDER_2H' as const,
          sendAt: new Date(nextZoomAt.getTime() - 2 * 60 * 60 * 1000),
          body: abTestZoomContent.reminders.preZoom2h,
          ctaText: abTestZoomContent.cta,
        },
      ]
    : []

  return {
    userId,
    lifecycleState: 'focus_active',
    welcomeMessageSent: true,
    welcomeText: abTestFocusContent.welcome.body,
    welcomeCtaText: abTestFocusContent.welcome.cta,
    channelInviteLink,
    channelLinkPresent: Boolean(channelInviteLink),
    preZoomScheduled: Boolean(nextZoomAt),
    preZoomReminders,
    dojimsCancelled: FOCUS_DOJIM_TIMER_IDS,
  }
}

export function schedulePostZoomBridge(
  userId: string,
  input: {
    zoomCount: number
    lifecycleState: string | null | undefined
    bridgeSentAt?: string | Date | null
    productKey?: string | null
  }
): PostZoomBridgePlan {
  const paymentUrl = buildAbsystemAiUpgradeCheckoutUrl(userId)
  const canBridge =
    input.productKey !== 'STANKEY' &&
    input.lifecycleState === 'focus_active' &&
    !input.bridgeSentAt &&
    input.zoomCount >= 1 &&
    input.zoomCount <= 2

  return {
    userId,
    scheduled: canBridge,
    delayMs: 24 * 60 * 60 * 1000,
    ctaText: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_CTA,
    paymentUrl,
  }
}

export function scheduleUpgradeOffer(
  userId: string,
  input: {
    zoomCount: number
    lifecycleState: string | null | undefined
    bridgeSentAt?: string | Date | null
    hardBridgeSentAt?: string | Date | null
    productKey?: string | null
  }
): UpgradeOfferPlan {
  const paymentUrl = buildAbsystemAiUpgradeCheckoutUrl(userId)
  const scheduled =
    input.productKey !== 'STANKEY' &&
    input.lifecycleState === 'focus_active' &&
    Boolean(input.bridgeSentAt) &&
    !input.hardBridgeSentAt &&
    input.zoomCount >= 4

  return {
    userId,
    scheduled,
    text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD,
    ctaText: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_CTA,
    paymentUrl,
    delayMs: 0,
  }
}

function resolveLifecycleUpgrade(
  current: string | null | undefined,
  target: string
): string {
  const currentRank = LIFECYCLE_STATE_ORDER.get((current ?? 'new').trim()) ?? 0
  const targetRank = LIFECYCLE_STATE_ORDER.get(target.trim()) ?? currentRank
  return currentRank >= targetRank ? (current ?? 'new') : target
}

export function resolveEcosystemPaymentPlan(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId
): EcosystemPlanDefinition | null {
  return ECOSYSTEM_PAYMENT_CATALOG[productId]?.[planId] ?? null
}

export function resolveEcosystemPaymentTarget(amount: number): {
  productId: EcosystemPaymentProduct
  planId: EcosystemPaymentPlanId
} | null {
  for (const [productId, plans] of Object.entries(
    ECOSYSTEM_PAYMENT_CATALOG
  ) as Array<
    [
      EcosystemPaymentProduct,
      Partial<Record<EcosystemPaymentPlanId, EcosystemPlanDefinition>>,
    ]
  >) {
    for (const [planId, plan] of Object.entries(plans) as Array<
      [EcosystemPaymentPlanId, EcosystemPlanDefinition]
    >) {
      if (plan.amount === amount) {
        return { productId, planId }
      }
    }
  }

  return null
}

function resolveEcosystemProductCode(
  productId: EcosystemPaymentProduct
): string[] {
  return productId === 'focus' ? ['focus'] : ['absystem_ai', 'absystem']
}

async function resolveProductByCodeCandidates(
  db: typeof prisma,
  productCodes: readonly string[]
) {
  for (const code of productCodes) {
    const product = await db.product.findUnique({
      where: { code },
      select: { id: true, code: true, durationDays: true },
    })

    if (product) {
      return product
    }
  }

  return null
}

async function upsertLegacySubscription(
  db: typeof prisma,
  input: {
    userId: string
    productId: string
    planCode: string
    expiresAt: Date
  }
) {
  const now = new Date()
  const existing = await db.subscription.findFirst({
    where: {
      userId: input.userId,
      productId: input.productId,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        planCode: input.planCode,
        startsAt: now,
        currentPeriodEnd: input.expiresAt,
        autoRenew: true,
        productId: input.productId,
        trialEndsAt: null,
      },
    })
    return
  }

  await db.subscription.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      status: 'ACTIVE',
      planCode: input.planCode,
      startsAt: now,
      currentPeriodEnd: input.expiresAt,
      autoRenew: true,
    },
  })
}

export async function processEcosystemPayment(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string,
  input: {
    amount?: number
    currency?: string
    payRef?: string
    orderReference?: string
  } = {},
  db: typeof prisma = prisma
): Promise<PaymentResult> {
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    return { status: 'failed', userId, reason: 'INVALID_ECOSYSTEM_PLAN' }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      expertId: true,
      lifecycleState: true,
    },
  })

  if (!user) {
    return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }
  }

  const product = await resolveProductByCodeCandidates(
    db,
    resolveEcosystemProductCode(productId)
  )
  if (!product) {
    return { status: 'failed', userId, reason: 'PRODUCT_NOT_FOUND' }
  }

  const now = new Date()
  const currentProductSubscription = await db.productSubscription.findFirst({
    where: {
      userId,
      productId: product.id,
      status: 'active',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      expiresAt: true,
    },
  })

  const nextExpiresAtBase =
    currentProductSubscription?.expiresAt &&
    currentProductSubscription.expiresAt > now
      ? currentProductSubscription.expiresAt
      : now
  const focusProduct =
    productId === 'absystem_ai'
      ? await resolveProductByCodeCandidates(db, ['focus'])
      : null
  const focusSubscription = focusProduct
    ? await db.productSubscription.findFirst({
        where: {
          userId,
          productId: focusProduct.id,
          status: 'active',
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          expiresAt: true,
        },
      })
    : null

  const focusCarryOverMs =
    productId === 'absystem_ai' &&
    focusSubscription?.expiresAt &&
    focusSubscription.expiresAt > now
      ? focusSubscription.expiresAt.getTime() - now.getTime()
      : 0
  const expiresAt = new Date(
    nextExpiresAtBase.getTime() +
      plan.durationDays * 86400000 +
      focusCarryOverMs
  )
  const amount = input.amount ?? plan.amount
  const planCode = `${productId}:${planId}`

  await db.productSubscription.upsert({
    where: {
      userId_productId: {
        userId,
        productId: product.id,
      },
    },
    update: {
      status: 'active',
      expiresAt,
      paidAt: now,
      amount,
    },
    create: {
      userId,
      productId: product.id,
      status: 'active',
      expiresAt,
      paidAt: now,
      amount,
    },
  })

  console.log('📝 [PAYMENT:ECOSYSTEM] Subscription updated', {
    userId,
    productId,
    expiresAt,
  })

  await upsertLegacySubscription(db, {
    userId,
    productId: product.id,
    planCode,
    expiresAt,
  })

  const newLifecycleState = resolveLifecycleUpgrade(user.lifecycleState, plan.lifecycleState)
  await db.user.update({
    where: { id: userId },
    data: { lifecycleState: newLifecycleState },
  })

  // TEMP(18.05.2026): access activation trace — Claude
  console.log('[ACCESS] Subscription activated', {
    userId,
    productId,
    planId,
    expiresAt,
    lifecycleState: newLifecycleState,
    durationDays: plan.durationDays,
  })

  return {
    status: 'approved',
    userId,
    productId,
    enrollmentId: null,
    expertId: user.expertId ?? null,
  }
}

/** Upsert enrollment + активація підписки після підтвердження платежу */
export async function processPayment({
  userId,
  productId,
  amount,
  payRef,
  currency,
}: PaymentData): Promise<PaymentResult> {
  if (productId.startsWith(`${stankeyManifest.productId}:`)) {
    // STANKEY: isolated product — not ecosystem
    const planCode = productId.slice(`${stankeyManifest.productId}:`.length)
    if (!(planCode in STANKEY_SUBSCRIPTION_DURATIONS)) {
      return { status: 'failed', userId, reason: 'INVALID_STANKEY_PLAN' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })

    if (!user) return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }

    const now = new Date()
    const durationDays = STANKEY_SUBSCRIPTION_DURATIONS[planCode]
    const periodEnd =
      typeof durationDays === 'number'
        ? new Date(now.getTime() + durationDays * 86400000)
        : null
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planCode,
          startsAt: now,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
          expertId: user.expertId ?? undefined,
          productId: stankeyManifest.productId,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          expertId: user.expertId ?? undefined,
          productId: stankeyManifest.productId,
          status: 'ACTIVE',
          planCode,
          startsAt: now,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
        },
      })
    }

    await prisma.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: Math.round(amount * 100),
        currency: currency ?? stankeyManifest.pricing.currency,
        metadata: {
          kind: 'stankey_subscription',
          provider: 'wayforpay',
          productId: stankeyManifest.productId,
          planCode,
          payRef,
        },
      },
    })

    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    return {
      status: 'approved',
      userId,
      productId: stankeyManifest.productId,
      enrollmentId: null,
      expertId: user.expertId ?? null,
    }
  }

  if (productId in CORE_SUBSCRIPTION_DURATIONS) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })

    if (!user) return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }

    const now = new Date()
    const periodEnd = new Date(
      now.getTime() + CORE_SUBSCRIPTION_DURATIONS[productId] * 86400000
    )
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          expertId: user.expertId ?? undefined,
          productId: null,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          expertId: user.expertId ?? undefined,
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      })
    }

    await prisma.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: Math.round(amount * 100),
        currency: 'EUR',
        metadata: {
          kind: 'core_subscription',
          planCode: productId,
          payRef,
        },
      },
    })

    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    return {
      status: 'approved',
      userId,
      productId,
      enrollmentId: null,
      expertId: user.expertId ?? null,
    }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, durationDays: true, ownerId: true },
  })
  if (!product) return { status: 'failed', userId, reason: 'PRODUCT_NOT_FOUND' }

  // Upsert enrollment — purchased = true після оплати
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_productId: { userId, productId } },
    update: { purchased: true },
    create: { userId, productId, purchased: true },
    select: { id: true, enrolledAt: true, trialEnd: true },
  })

  // Активація або продовження підписки
  const existingSub = await prisma.subscription.findFirst({
    where: { userId, expertId: product.ownerId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const now = new Date()
  const periodEnd = new Date(now.getTime() + product.durationDays * 86400000)

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    })
  } else {
    await prisma.subscription.create({
      data: {
        expertId: product.ownerId,
        userId,
        status: 'ACTIVE',
        planCode: payRef,
        currentPeriodEnd: periodEnd,
        startsAt: now,
      },
    })
  }

  await syncLifecycleForUser(userId)
  await invalidateFunnelStage(userId)

  return {
    status: 'approved',
    userId,
    productId,
    enrollmentId: enrollment.id,
    expertId: product.ownerId,
  }
}
