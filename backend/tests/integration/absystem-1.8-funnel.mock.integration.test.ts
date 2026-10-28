import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  normalizeAbTestProgress,
  type AbTestProgress,
} from '../../src/core/state-machine/abTestFoundation.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const EXPERT_ID = '22222222-2222-4222-8222-222222222222'

type Checkout = {
  token: string
  payload: Record<string, unknown>
  orderReference: string
  amount: number
  currency: string
  productCode: string
  userId: string
  status: string
  createdAt: Date
  expiresAt: Date
  openedAt: Date | null
  completedAt: Date | null
  invalidatedAt: Date | null
  usageCount: number
  lastOpenedAt: Date | null
}

let progress: AbTestProgress
let checkouts: Checkout[]
let paymentLogs = new Map<string, { id: string; status: string }>()
let focusSubscription: { id: string; expiresAt: Date; focusWelcomedAt: Date | null } | null
let legacySubscription: { id: string; currentPeriodEnd: Date } | null
let welcomeJobs: Array<{ key: string; payload: Record<string, unknown> }>
let entitlementWrites: number

const user = {
  id: USER_ID,
  expertId: EXPERT_ID,
  firstName: 'Віра',
  email: 'vira@example.test',
  telegramChatId: '777',
  telegramLinks: [{ chatId: '777' }],
  currentState: null,
  currentStep: null,
  funnelStage: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  settings: {},
}

function findCheckout(where: Record<string, any> = {}) {
  return [...checkouts].reverse().find((checkout) => {
    if (where.token && checkout.token !== where.token) return false
    if (where.orderReference && typeof where.orderReference === 'string' && checkout.orderReference !== where.orderReference) return false
    if (typeof where.orderReference === 'object' && where.orderReference?.startsWith && !checkout.orderReference.startsWith(where.orderReference.startsWith)) return false
    if (where.userId && checkout.userId !== where.userId) return false
    if (where.productCode && checkout.productCode !== where.productCode) return false
    if (where.status?.in && !where.status.in.includes(checkout.status)) return false
    if (where.expiresAt?.gt && checkout.expiresAt <= where.expiresAt.gt) return false
    if (where.invalidatedAt === null && checkout.invalidatedAt !== null) return false
    if (where.completedAt === null && checkout.completedAt !== null) return false
    return true
  }) ?? null
}

function applyCheckoutUpdate(checkout: Checkout, data: Record<string, any>) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in value) {
      ;(checkout as any)[key] += value.increment
    } else {
      ;(checkout as any)[key] = value
    }
  }
}

const db = {
  $queryRaw: async () => [],
  $transaction: async (fn: (tx: typeof db) => Promise<unknown>) => fn(db),
  user: {
    findUnique: async ({ where }: any) => where.id === USER_ID ? user : null,
    findFirst: async ({ where }: any) => where?.id === USER_ID ? { id: USER_ID } : null,
    update: async ({ data }: any) => Object.assign(user, data),
  },
  product: {
    findUnique: async ({ where }: any) => where.code?.toLowerCase() === 'focus'
      ? { id: 'focus-product', code: 'focus', durationDays: 30 }
      : null,
    findFirst: async () => ({ id: 'focus-product', code: 'focus', durationDays: 30, ownerId: EXPERT_ID }),
    upsert: async () => ({ id: 'focus-product', code: 'focus', durationDays: 30 }),
  },
  checkoutSession: {
    findFirst: async ({ where }: any) => findCheckout(where),
    findUnique: async ({ where }: any) => findCheckout(where),
    upsert: async ({ where, update, create }: any) => {
      const current = findCheckout({ token: where.token })
      if (current) {
        applyCheckoutUpdate(current, update)
        return current
      }
      const checkout: Checkout = {
        ...create,
        createdAt: new Date(),
        openedAt: null,
        completedAt: null,
        invalidatedAt: null,
        usageCount: 0,
        lastOpenedAt: null,
      }
      checkouts.push(checkout)
      return checkout
    },
    update: async ({ where, data }: any) => {
      const checkout = findCheckout(where)
      if (!checkout) throw new Error('checkout missing')
      applyCheckoutUpdate(checkout, data)
      return checkout
    },
    updateMany: async ({ where, data }: any) => {
      const matches = checkouts.filter((checkout) => findCheckout({ ...where, token: checkout.token }))
      matches.forEach((checkout) => applyCheckoutUpdate(checkout, data))
      return { count: matches.length }
    },
  },
  paymentLog: {
    findUnique: async ({ where }: any) => paymentLogs.get(where.orderReference) ?? null,
    findFirst: async () => null,
    create: async ({ data }: any) => {
      if (paymentLogs.has(data.orderReference)) {
        throw Object.assign(new Error('duplicate payment'), { code: 'P2002' })
      }
      const payment = { id: `payment-${paymentLogs.size + 1}`, status: data.status }
      paymentLogs.set(data.orderReference, payment)
      return payment
    },
    update: async ({ where, data }: any) => {
      const payment = [...paymentLogs.values()].find((entry) => entry.id === where.id)
      if (payment) Object.assign(payment, data)
      return payment
    },
  },
  productSubscription: {
    findFirst: async ({ where }: any) => {
      if (JSON.stringify(where).includes('trial_zoom')) return null
      return focusSubscription
    },
    findUnique: async () => focusSubscription,
    upsert: async ({ create, update }: any) => {
      entitlementWrites += 1
      const next = focusSubscription ? { ...focusSubscription, ...update } : { id: 'focus-subscription', ...create, focusWelcomedAt: null }
      focusSubscription = next
      return next
    },
    updateMany: async () => ({ count: 1 }),
  },
  subscription: {
    findFirst: async () => legacySubscription,
    create: async ({ data }: any) => {
      legacySubscription = { id: 'legacy-focus-subscription', currentPeriodEnd: data.currentPeriodEnd }
      return legacySubscription
    },
    update: async ({ data }: any) => {
      legacySubscription = { id: legacySubscription?.id ?? 'legacy-focus-subscription', currentPeriodEnd: data.currentPeriodEnd }
      return legacySubscription
    },
  },
  notificationJob: {
    deleteMany: async () => ({ count: 0 }),
  },
} as any

vi.mock('../../src/db/client.js', () => ({ prisma: db }))
vi.mock('@/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: async () => progress,
  saveAbTestProgress: async (_userId: string, next: AbTestProgress) => {
    progress = next
    return next
  },
  getAbTestProfileEmail: async () => null,
  ensureAbTestEmailCapturedFromProfile: async (_userId: string, value: AbTestProgress) => value,
}))
vi.mock('@/products/ab-system/telegram/views.js', () => ({
  sendQuestionDirect: vi.fn(async () => undefined),
  renderCurrentView: vi.fn(async () => undefined),
  renderAbTestEmailGate: vi.fn(async () => undefined),
  renderAbTestPostEmailSubmitSequence: vi.fn(async () => undefined),
  resolveFirstName: () => 'Віра',
  formatAbTestTelegramCard: () => '',
  splitTelegramContentBlocks: (lines: string[]) => lines,
  sendTelegramContentChunk: vi.fn(async () => undefined),
}))
vi.mock('@/products/ab-system/telegram/callback.js', () => ({
  deactivateCallbackMarkup: vi.fn(), logAbTestStartDebug: vi.fn(), logCallbackHandled: vi.fn(),
  logCallbackReceived: vi.fn(), logFlowStart: vi.fn(), logFlowResume: vi.fn(), logFlowRender: vi.fn(), logMessageSent: vi.fn(),
  parseAbTestCallback: vi.fn(), resolveContextUserId: vi.fn(), claimAbTestCallbackInteraction: vi.fn(),
  formatMobileAnswerButtonText: (value: string) => value, resolveQuestionLatency: () => 1,
  isTestPaymentEnabled: () => false,
}))
vi.mock('@/products/ab-system/telegram/analytics.js', () => ({ trackAbTestEvent: vi.fn(async () => undefined) }))
vi.mock('@/products/ab-system/telegram/scheduler.js', () => ({
  scheduleFollowups: vi.fn(async (_userId: string, value: AbTestProgress) => value), cancelPendingAbTestSalesFollowups: vi.fn(async () => undefined),
}))
vi.mock('@/core/orchestrator/testOrchestrator.js', () => ({ testOrchestrator: { recordTestStart: vi.fn(async () => undefined), onTestCompleted: vi.fn(async () => undefined) } }))
vi.mock('@/core/transport/telegramTransport.js', () => ({ deliverTelegramFlow: vi.fn() }))
vi.mock('@/modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({ planAck: vi.fn(), planMessage: vi.fn() }))
vi.mock('@/modules/telegram-mentor/services/identity/pending.js', () => ({ clearPendingTelegramIdentity: vi.fn() }))
vi.mock('@/modules/telegram-mentor/services/engagement/cta.js', () => ({ hasTelegramCtaInteraction: vi.fn(async () => false) }))
vi.mock('@/modules/subscriptions/payments/focus-access.js', () => ({ hasActiveFocusSubscription: vi.fn(async () => false) }))
vi.mock('@/modules/telegram-mentor/session.js', () => ({ clearSession: vi.fn(), getSession: vi.fn(), updateSession: vi.fn() }))
vi.mock('@/lib/telegram.js', () => ({ bot: { telegram: { sendMessage: vi.fn() } }, coachBot: {}, sendOpsTelegramMessage: vi.fn(async () => true) }))
vi.mock('@/lib/telegram/messageFormatter.js', () => ({ sendTelegramMessage: vi.fn(async () => true), sendTelegramDocument: vi.fn(), sendTelegramPhoto: vi.fn() }))
vi.mock('@/modules/events/service.js', () => ({ trackEvent: vi.fn(async () => undefined) }))
vi.mock('@/core/runtime/idempotency.js', () => ({
  buildRuntimeTelemetry: () => ({ runtime_stage: 'payment' }),
  withRuntimeAdvisoryLock: async (_input: unknown, callback: () => Promise<unknown>) => ({ acquired: true, value: await callback() }),
}))
vi.mock('@/core/state-machine/securityFoundation.js', () => ({ buildRequestFingerprint: () => 'mock-fingerprint' }))
vi.mock('@/modules/telegram-mentor/handlers/start.js', () => ({ resolveUserState: vi.fn(async () => null) }))
vi.mock('@/modules/events/contentAttribution.service.js', () => ({ getContentAttributionEventPayload: vi.fn(async () => null) }))
vi.mock('@/modules/subscriptions/payments/callback/post-payment.js', () => ({ schedulePostPaymentAnalysis: vi.fn() }))
vi.mock('@/modules/subscriptions/payments/activation.js', () => ({ activateProductSubscription: vi.fn(async () => undefined) }))
vi.mock('@/modules/flow-control/service.js', () => ({ syncLifecycleForUser: vi.fn(async () => undefined) }))
vi.mock('@/lib/funnel/getUserFunnelStage.js', () => ({ invalidateFunnelStage: vi.fn(async () => undefined) }))
vi.mock('@/modules/ai-mentor/helpers.js', () => ({ ensureUserExpertId: vi.fn(async () => EXPERT_ID) }))
vi.mock('@/modules/subscriptions/payments/callback/notifications.js', () => ({ sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(async () => true) }))
vi.mock('@/modules/admin/notifications/coach.service.js', () => ({ notifyCoachAboutSuccessfulPayment: vi.fn(async () => true) }))
vi.mock('@/modules/zoom/service.js', () => ({ getUpcomingGroupSessions: vi.fn(async () => []) }))
vi.mock('@/services/notifications/NotificationService.js', () => ({ notificationService: { schedule: vi.fn(), emit: vi.fn() } }))
vi.mock('@/services/notifications/services/NotificationJobService.js', () => ({
  notificationJobService: {
    enqueueOnce: async (_type: unknown, job: { payload: Record<string, unknown> }, _runAt: Date, key: string) => {
      if (!welcomeJobs.some((entry) => entry.key === key)) welcomeJobs.push({ key, payload: job.payload })
      return { id: key }
    },
  },
}))

function callbackPayload(orderReference: string, amount: number, signature: string) {
  return {
    order_reference: orderReference,
    amount,
    currency: 'UAH',
    product_name: ['FOCUS'],
    product_count: [1],
    product_price: [amount],
    clientAccountId: USER_ID,
    transaction_status: 'Approved',
    transaction_id: 'provider-transaction-1',
    merchant_signature: signature,
  }
}

function response() {
  return { status: vi.fn(function () { return this }), send: vi.fn(), json: vi.fn() } as any
}

describe('STARWAY 1.8 mock-only cross-owner funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    progress = normalizeAbTestProgress(undefined)
    checkouts = []
    paymentLogs = new Map()
    focusSubscription = null
    legacySubscription = null
    welcomeJobs = []
    entitlementWrites = 0
    user.settings = {}
    process.env.NODE_ENV = 'test'
    process.env.PUBLIC_API_URL = 'https://api.starway.test'
    process.env.WAYFORPAY_MERCHANT = 'starway-test'
    process.env.WAYFORPAY_MERCHANT_DOMAIN = 'starway.test'
    process.env.WAYFORPAY_SECRET = 'starway-secret'
  })

  it('/start → eight answers → Focus checkout → verified callback grants one entitlement and one durable Welcome intent', async () => {
    const { startAbTestFlow } = await import('@/products/ab-system/telegram/service.ts')
    const { handleAbTestAnswer } = await import('@/products/ab-system/telegram/handler.ts')
    const { handleFocusPaymentAction } = await import('@/products/ab-system/telegram/payment.ts')
    const { generateSignature } = await import('@/modules/subscriptions/payments/wayforpay/signature.ts')
    const { wayForPayCallback } = await import('@/modules/subscriptions/payments/callback/handler.ts')

    const ctx = { chat: { id: 777 }, from: { id: 777 }, answerCbQuery: vi.fn(async () => undefined) } as any
    await startAbTestFlow(ctx, USER_ID, '/start')

    for (const questionId of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']) {
      await handleAbTestAnswer(ctx, USER_ID, {
        kind: 'answer', questionId, answerId: 'action', revision: progress.revision,
      })
    }
    expect(progress).toMatchObject({ status: 'completed', result_key: 'action' })
    expect(progress.answers).toHaveLength(8)

    await handleFocusPaymentAction(ctx, USER_ID, 777)
    const focusCheckout = checkouts.find((checkout) => checkout.orderReference.startsWith(`focus_1month_${USER_ID}_`))
    expect(focusCheckout).toMatchObject({ productCode: 'focus', userId: USER_ID, status: 'CREATED' })

    const invalidResponse = response()
    await wayForPayCallback(
      { body: callbackPayload(focusCheckout!.orderReference, focusCheckout!.amount, 'bad-signature'), method: 'POST', path: '/callback', headers: {} } as any,
      invalidResponse,
    )
    expect(invalidResponse.status).toHaveBeenCalledWith(400)
    expect(entitlementWrites).toBe(0)
    expect(welcomeJobs).toHaveLength(0)
    expect(findCheckout({ orderReference: focusCheckout!.orderReference })).not.toBeNull()

    const valid = callbackPayload(focusCheckout!.orderReference, focusCheckout!.amount, '')
    valid.merchant_signature = generateSignature(valid as any)
    const approvedResponse = response()
    await wayForPayCallback({ body: valid, method: 'POST', path: '/callback', headers: {} } as any, approvedResponse)

    expect(approvedResponse.status).toHaveBeenCalledWith(200)
    expect(focusSubscription).toMatchObject({ status: 'active', focusWelcomedAt: null })
    expect(entitlementWrites).toBe(1)
    expect(welcomeJobs).toEqual([
      expect.objectContaining({ key: 'focus-payment-onboarding:focus-subscription' }),
    ])

    const duplicateResponse = response()
    await wayForPayCallback({ body: valid, method: 'POST', path: '/callback', headers: {} } as any, duplicateResponse)
    expect(duplicateResponse.status).toHaveBeenCalledWith(200)
    expect(entitlementWrites).toBe(1)
    expect(welcomeJobs).toHaveLength(1)
  })
})
