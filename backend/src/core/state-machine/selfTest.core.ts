import {
  buildBehavioralAnalyticsSnapshot,
  enrichBehavioralEvent,
  validateBehavioralAnalyticsLayer,
} from '../../modules/analytics/behavioral.js'
import {
  processEcosystemPayment,
  schedulePostZoomBridge,
  scheduleUpgradeOffer,
  simulateFocusActivation,
} from '../../modules/subscriptions/payments/business.js'
import { processPaymentWebhook } from '../../modules/subscriptions/payments/callback.js'
import { aiSellerContent } from '../../products/ab-system/config/aiSeller.content.js'
import { detectStateInstability } from '../../products/ab-system/telegram/abTest.service.js'
import {
  absystemContent,
  getBillingMessage,
} from '../../products/absystem/config/absystem.content.js'
import { validateFeatureFlagFoundation } from '../governance/featureFlags.js'
import {
  validateLaunchGovernanceFoundation,
  validateOperatorGovernanceFoundation,
  validateProductIntelligenceFoundation,
} from '../governance/productIntelligence.js'
import { validateReleaseGovernanceFoundation } from '../governance/releaseGovernance.js'
import { validateRelationshipMemoryLayer } from '../memory/relationshipMemory.js'
import { validateRuntimeIdempotencyFoundation } from '../runtime/runtimeIdempotency.js'
import { validateRuntimeResilienceFoundation } from '../runtime/runtimeResilience.js'
import { validateAbTestFoundation } from './abTestFoundation.js'
import { validateCanonicalCtaMessageFoundation } from './ctaFoundation.js'
import { validateCanonicalFlowOrchestrationFoundation } from './flowOrchestrationFoundation.js'
import { validateCanonicalFlowTimingFoundation } from './flowTimingFoundation.js'
import { validateCanonicalSecurityFoundation } from './securityFoundation.js'
import { validateCanonicalTestFoundation } from './testFoundation.js'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

type PaymentWebhookTestState = {
  users: Map<
    string,
    { id: string; expertId: string | null; lifecycleState: string }
  >
  products: Map<string, { id: string; code: string; durationDays: number }>
  productSubscriptions: Map<
    string,
    {
      userId: string
      productId: string
      status: string
      expiresAt: Date | null
      paidAt: Date | null
      amount: number | null
      createdAt: Date
      updatedAt: Date
    }
  >
  subscriptions: Map<
    string,
    {
      id: string
      userId: string
      productId: string | null
      status: string
      planCode: string
      startsAt: Date | null
      currentPeriodEnd: Date | null
      autoRenew: boolean
      trialEndsAt: Date | null
      createdAt: Date
      updatedAt: Date
    }
  >
  paymentLogs: Map<
    string,
    {
      id: string
      orderReference: string | null
      userId: string
      expertId: string
      amountCents: number
      currency: string
      status: string
      processedAt: Date | null
      metadata: Record<string, unknown>
      createdAt: Date
    }
  >
}

function createPaymentWebhookTestDb(
  overrides?: Partial<PaymentWebhookTestState>
) {
  const state: PaymentWebhookTestState = {
    users: new Map(),
    products: new Map(),
    productSubscriptions: new Map(),
    subscriptions: new Map(),
    paymentLogs: new Map(),
    ...overrides,
  }

  const db = {
    user: {
      async findUnique({ where }: { where: { id: string } }) {
        return state.users.get(where.id) ?? null
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: { lifecycleState?: string }
      }) {
        const existing = state.users.get(where.id)
        if (!existing) throw new Error('USER_NOT_FOUND')
        const next = {
          ...existing,
          ...(data.lifecycleState
            ? { lifecycleState: data.lifecycleState }
            : {}),
        }
        state.users.set(where.id, next)
        return next
      },
    },
    product: {
      async findUnique({ where }: { where: { code: string } }) {
        for (const product of state.products.values()) {
          if (product.code === where.code) return product
        }
        return null
      },
    },
    productSubscription: {
      async findFirst({
        where,
      }: {
        where: { userId: string; productId: string; status?: string }
      }) {
        const rows = [...state.productSubscriptions.values()].filter(
          (item) =>
            item.userId === where.userId &&
            item.productId === where.productId &&
            (where.status ? item.status === where.status : true)
        )
        return (
          rows.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          )[0] ?? null
        )
      },
      async upsert({
        where,
        create,
        update,
      }: {
        where: { userId_productId: { userId: string; productId: string } }
        create: {
          userId: string
          productId: string
          status: string
          expiresAt: Date | null
          paidAt: Date | null
          amount: number | null
        }
        update: {
          status: string
          expiresAt: Date | null
          paidAt: Date | null
          amount: number | null
        }
      }) {
        const key = `${where.userId_productId.userId}:${where.userId_productId.productId}`
        const existing = state.productSubscriptions.get(key)
        const now = new Date()
        if (existing) {
          const next = {
            ...existing,
            ...update,
            updatedAt: now,
          }
          state.productSubscriptions.set(key, next)
          return next
        }
        const next = {
          ...create,
          createdAt: now,
          updatedAt: now,
        }
        state.productSubscriptions.set(key, next)
        return next
      },
    },
    subscription: {
      async findFirst({
        where,
      }: {
        where: { userId: string; productId?: string | null }
      }) {
        const rows = [...state.subscriptions.values()].filter(
          (item) =>
            item.userId === where.userId &&
            (where.productId !== undefined
              ? item.productId === where.productId
              : true)
        )
        return (
          rows.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )[0] ?? null
        )
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: Partial<
          PaymentWebhookTestState['subscriptions'] extends Map<
            string,
            infer Row
          >
            ? Row
            : never
        >
      }) {
        const existing = [...state.subscriptions.values()].find(
          (item) => item.id === where.id
        )
        if (!existing) throw new Error('SUBSCRIPTION_NOT_FOUND')
        const next = { ...existing, ...data, updatedAt: new Date() }
        state.subscriptions.set(where.id, next)
        return next
      },
      async create({
        data,
      }: {
        data: {
          userId: string
          productId?: string | null
          status: string
          planCode: string
          startsAt: Date | null
          currentPeriodEnd: Date | null
          autoRenew: boolean
          trialEndsAt?: Date | null
        }
      }) {
        const row = {
          id: `sub-${state.subscriptions.size + 1}`,
          userId: data.userId,
          productId: data.productId ?? null,
          status: data.status,
          planCode: data.planCode,
          startsAt: data.startsAt,
          currentPeriodEnd: data.currentPeriodEnd,
          autoRenew: data.autoRenew,
          trialEndsAt: data.trialEndsAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        state.subscriptions.set(row.id, row)
        return row
      },
    },
    paymentLog: {
      async findUnique({ where }: { where: { orderReference: string } }) {
        return (
          [...state.paymentLogs.values()].find(
            (item) => item.orderReference === where.orderReference
          ) ?? null
        )
      },
      async create({
        data,
      }: {
        data: {
          orderReference: string
          userId: string
          expertId: string
          amountCents: number
          currency: string
          status: string
          metadata: Record<string, unknown>
        }
      }) {
        const duplicate = [...state.paymentLogs.values()].find(
          (item) => item.orderReference === data.orderReference
        )
        if (duplicate) {
          const error = new Error('duplicate')
          ;(error as Error & { code?: string }).code = 'P2002'
          throw error
        }
        const row = {
          id: `pay-${state.paymentLogs.size + 1}`,
          orderReference: data.orderReference,
          userId: data.userId,
          expertId: data.expertId,
          amountCents: data.amountCents,
          currency: data.currency,
          status: data.status,
          processedAt: null,
          metadata: data.metadata,
          createdAt: new Date(),
        }
        state.paymentLogs.set(row.id, row)
        return { id: row.id }
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: {
          status?: string
          processedAt?: Date | null
          metadata?: Record<string, unknown>
        }
      }) {
        const existing = state.paymentLogs.get(where.id)
        if (!existing) throw new Error('PAYMENT_LOG_NOT_FOUND')
        const next = { ...existing, ...data }
        state.paymentLogs.set(where.id, next)
        return next
      },
    },
  }

  return {
    db: db as unknown as typeof import('../../db/client.js').prisma,
    state,
  }
}

function createStateInstabilityTestDb(input: {
  lifecycleState: string
  dailyEntries: Array<{ content: Record<string, unknown> }>
  microTasks: Array<{ title: string }>
  weeklyReports: Array<{ summaryText: string | null }>
}) {
  return {
    user: {
      async findUnique() {
        return {
          lifecycleState: input.lifecycleState,
          dailyEntries: input.dailyEntries,
          microTasks: input.microTasks,
          weeklyReports: input.weeklyReports,
        }
      },
    },
  } as unknown as typeof import('../../db/client.js').prisma
}

export async function runCoreTests() {
  const testFoundation = validateCanonicalTestFoundation()
  assert(
    testFoundation.ok,
    `canonical test foundation invalid: ${testFoundation.errors.join(',')}`
  )

  const behavioralValidation = validateBehavioralAnalyticsLayer()
  assert(
    behavioralValidation.ok,
    `behavioral analytics layer invalid: ${behavioralValidation.errors.join(',')}`
  )

  const ctaValidation = validateCanonicalCtaMessageFoundation()
  assert(
    ctaValidation.ok,
    `cta/message foundation invalid: ${ctaValidation.errors.join(',')}`
  )

  const flowValidation = validateCanonicalFlowOrchestrationFoundation()
  assert(
    flowValidation.ok,
    `canonical flow orchestration invalid: ${flowValidation.errors.join(',')}`
  )

  const timingValidation = validateCanonicalFlowTimingFoundation()
  assert(
    timingValidation.ok,
    `canonical flow timing invalid: ${timingValidation.errors.join(',')}`
  )

  const abTestValidation = validateAbTestFoundation()
  assert(
    abTestValidation.ok,
    `ab test foundation invalid: ${abTestValidation.errors.join(',')}`
  )

  const securityValidation = validateCanonicalSecurityFoundation()
  assert(
    securityValidation.ok,
    `canonical security foundation invalid: ${securityValidation.errors.join(',')}`
  )

  const runtimeValidation = validateRuntimeIdempotencyFoundation()
  assert(
    runtimeValidation.ok,
    `runtime idempotency foundation invalid: ${runtimeValidation.errors.join(',')}`
  )

  const resilienceValidation = validateRuntimeResilienceFoundation()
  assert(
    resilienceValidation.ok,
    `runtime resilience foundation invalid: ${resilienceValidation.errors.join(',')}`
  )

  const featureFlagValidation = validateFeatureFlagFoundation()
  assert(
    featureFlagValidation.ok,
    `feature flag foundation invalid: ${featureFlagValidation.errors.join(',')}`
  )

  const productIntelligenceValidation = validateProductIntelligenceFoundation()
  assert(
    productIntelligenceValidation.ok,
    `product intelligence foundation invalid: ${productIntelligenceValidation.errors.join(',')}`
  )

  const operatorGovernanceValidation = validateOperatorGovernanceFoundation()
  assert(
    operatorGovernanceValidation.ok,
    `operator governance foundation invalid: ${operatorGovernanceValidation.errors.join(',')}`
  )

  const launchGovernanceValidation = validateLaunchGovernanceFoundation()
  assert(
    launchGovernanceValidation.ok,
    `launch governance foundation invalid: ${launchGovernanceValidation.errors.join(',')}`
  )

  const releaseGovernanceValidation = validateReleaseGovernanceFoundation()
  assert(
    releaseGovernanceValidation.ok,
    `release governance foundation invalid: ${releaseGovernanceValidation.errors.join(',')}`
  )

  const relationshipMemoryValidation = validateRelationshipMemoryLayer()
  assert(
    relationshipMemoryValidation.ok,
    `relationship memory foundation invalid: ${relationshipMemoryValidation.errors.join(',')}`
  )

  aiSellerContent.FORBIDDEN_PHRASES.forEach((phrase) => {
    const fullContent = JSON.stringify(aiSellerContent)
    assert(!fullContent.includes(phrase), `Forbidden phrase found: ${phrase}`)
  })
  assert(
    getBillingMessage('FOCUS_PAID') === absystemContent.BILLING.FOCUS_PAID,
    'billing message focus paid failed'
  )
  assert(
    getBillingMessage('SUB_EXPIRED').text.includes('збережені'),
    'billing message expired copy failed'
  )

  const paymentTestDb = createPaymentWebhookTestDb()
  paymentTestDb.state.users.set('user-test', {
    id: 'user-test',
    expertId: 'expert-test',
    lifecycleState: 'new',
  })
  paymentTestDb.state.products.set('focus', {
    id: 'product-focus',
    code: 'focus',
    durationDays: 30,
  })

  const firstWebhook = await processPaymentWebhook(
    {
      order_reference: 'wayforpay_test_001',
      amount: 780,
      currency: 'UAH',
      product_name: ['FOCUS'],
      clientAccountId: 'user-test',
      transaction_status: 'Approved',
      transaction_id: 'tx-test-1',
    },
    paymentTestDb.db
  )
  assert(
    firstWebhook.duplicate === false,
    'payment webhook first call should process'
  )
  assert(
    paymentTestDb.state.users.get('user-test')?.lifecycleState ===
      'focus_active',
    'payment webhook focus lifecycle update failed'
  )

  const focusActivationPlan = simulateFocusActivation('user-test', {
    nextZoomAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    channelInviteLink: process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? 'https://t.me/focus-channel',
  })
  assert(
    focusActivationPlan.welcomeMessageSent === true,
    'focus activation welcome message plan failed'
  )

  const postZoomBridge = schedulePostZoomBridge('user-test', {
    zoomCount: 1,
    lifecycleState: 'focus_active',
    bridgeSentAt: null,
  })
  assert(
    postZoomBridge.scheduled === true,
    'post zoom bridge should schedule for first zoom'
  )

  const hardUpgradeOffer = scheduleUpgradeOffer('user-test', {
    zoomCount: 4,
    lifecycleState: 'focus_active',
    bridgeSentAt: new Date().toISOString(),
    hardBridgeSentAt: null,
  })
  assert(
    hardUpgradeOffer.scheduled === true,
    'hard upgrade offer should schedule at 4th zoom'
  )

  const stateInstabilityPositiveDb = createStateInstabilityTestDb({
    lifecycleState: 'platform_active',
    dailyEntries: [
      { content: { morning: { state: 'виснажена' } } },
      { content: { morning: { state: 'хаос' } } },
      { content: { morning: { state: 'тривога' } } },
    ],
    microTasks: [],
    weeklyReports: [],
  })
  assert(
    await detectStateInstability('user-test', stateInstabilityPositiveDb),
    'state instability must be true for three negative morning entries'
  )

  const ecosystemDb = createPaymentWebhookTestDb()
  ecosystemDb.state.users.set('user-focus', {
    id: 'user-focus',
    expertId: 'expert-test',
    lifecycleState: 'focus_active',
  })
  ecosystemDb.state.productSubscriptions.set('user-focus:product-focus', {
    userId: 'user-focus',
    productId: 'product-focus',
    status: 'active',
    expiresAt: new Date(Date.now() + 10 * 86400000),
    paidAt: new Date(),
    amount: 780,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await processEcosystemPayment(
    'absystem_ai',
    '1month_upgrade',
    'user-focus',
    {
      amount: 1120,
      currency: 'UAH',
      payRef: 'upgrade-test-001',
      orderReference: 'upgrade-test-001',
    },
    ecosystemDb.db
  )

  assert(
    ecosystemDb.state.users.get('user-focus')?.lifecycleState ===
      'platform_active',
    'ecosystem upgrade must advance lifecycle'
  )

  const behavioralEvent = enrichBehavioralEvent({
    type: 'QUESTION_ANSWERED',
    payload: {
      question_index: 2,
      answer_latency_ms: 840,
    },
  })
  assert(
    behavioralEvent.payload.question_index === 2,
    'behavioral question index enrichment failed'
  )

  const behavioralSnapshot = buildBehavioralAnalyticsSnapshot([
    {
      userId: 'u-1',
      type: 'TEST_STARTED',
      state: 'S0_TRAFFIC',
      payload: { behavioral: { canonical_event: 'TEST_STARTED' } },
      createdAt: new Date(),
    },
    {
      userId: 'u-1',
      type: 'TEST_COMPLETED',
      state: 'S2_TEST_QUESTIONS',
      payload: {
        behavioral: { canonical_event: 'TEST_COMPLETED' },
        result_type: 'focus',
      },
      createdAt: new Date(),
    },
  ])
  assert(
    behavioralSnapshot.metrics.test_completion_rate === 100,
    'behavioral completion rate snapshot failed'
  )
}