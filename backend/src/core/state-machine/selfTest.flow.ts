import { resolveAIMentorEntry } from '../../modules/telegram-mentor/handlers/aiMentor.js'
import {
  resolveComeback,
  resolveStartScenario,
} from '../../modules/telegram-mentor/handlers/start.js'
import { resolveAiSellerMode } from '../../products/ab-system/telegram/service.js'
import {
  aiSellerLeadFollowup3dCron,
  scheduleBillingExpiryWarning,
  scheduleWinbackNotification,
} from '../../services/scheduler/index.js'
import {
  resolveCanonicalCtaId,
  resolveCanonicalMessageKeyByCtaId,
  resolveCanonicalMessageKeyByTestEvent,
} from './ctaFoundation.js'
import { resolveCanonicalFlowOrchestration } from './flowOrchestrationFoundation.js'
import { applyTransition } from './service.js'
import { transition } from './stateMachine.js'
import { resolveCanonicalTestTransition } from './testFoundation.js'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

type BillingSchedulerTestState = {
  productSubscriptions: Map<
    string,
    {
      id: string
      userId: string
      amount: number | null
      expiresAt: Date | null
      status: string
      createdAt: Date
      product: { code: string }
    }
  >
  users: Map<
    string,
    {
      id: string
      lifecycleState: string
      email?: string
      deletedAt?: Date | null
      updatedAt?: Date
      settings?: Record<string, unknown>
      notificationPreference: {
        telegramEnabled: boolean
        subscriptionEnabled: boolean
        aiRemindersEnabled?: boolean
      }
    }
  >
  weeklyReports: Array<{
    userId: string
    summaryText: string | null
    createdAt: Date
  }>
  dailyCycleLogs: Array<{
    userId: string
    choice: 'CONFIRMED_OLD' | 'CHOSE_NEW' | 'PENDING'
    date: Date
  }>
  scheduled: Array<{
    event: string
    userId: string
    payload?: Record<string, unknown>
  }>
}

function createBillingSchedulerTestDb() {
  const state: BillingSchedulerTestState = {
    productSubscriptions: new Map(),
    users: new Map(),
    weeklyReports: [],
    dailyCycleLogs: [],
    scheduled: [],
  }

  const db = {
    productSubscription: {
      async findMany({
        where,
      }: {
        where: {
          status: string
          expiresAt?: { lte?: Date; lt?: Date; gte?: Date; gt?: Date }
          createdAt?: { lte?: Date; lt?: Date; gte?: Date; gt?: Date }
          product?: { code?: { in?: string[] } }
        }
      }) {
        return [...state.productSubscriptions.values()]
          .filter((subscription) => {
            if (subscription.status !== where.status) return false
            if (
              where.product?.code?.in &&
              !where.product.code.in.includes(subscription.product.code)
            )
              return false
            if (
              where.createdAt?.lte &&
              subscription.createdAt > where.createdAt.lte
            )
              return false
            if (
              where.createdAt?.gte &&
              subscription.createdAt < where.createdAt.gte
            )
              return false
            if (
              where.createdAt?.lt &&
              subscription.createdAt >= where.createdAt.lt
            )
              return false
            if (
              where.createdAt?.gt &&
              subscription.createdAt <= where.createdAt.gt
            )
              return false
            if (
              where.expiresAt?.lte &&
              subscription.expiresAt &&
              subscription.expiresAt > where.expiresAt.lte
            )
              return false
            if (
              where.expiresAt?.gte &&
              subscription.expiresAt &&
              subscription.expiresAt < where.expiresAt.gte
            )
              return false
            if (
              where.expiresAt?.lt &&
              subscription.expiresAt &&
              subscription.expiresAt >= where.expiresAt.lt
            )
              return false
            if (
              where.expiresAt?.gt &&
              subscription.expiresAt &&
              subscription.expiresAt <= where.expiresAt.gt
            )
              return false
            return Boolean(subscription.expiresAt)
          })
          .map((subscription) => ({
            ...subscription,
            user: {
              settings: state.users.get(subscription.userId)?.settings ?? {},
              notificationPreference: state.users.get(subscription.userId)
                ?.notificationPreference ?? {
                telegramEnabled: false,
                subscriptionEnabled: false,
                aiRemindersEnabled: false,
              },
            },
          }))
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: { status?: string }
      }) {
        const existing = state.productSubscriptions.get(where.id)
        if (!existing) throw new Error('PRODUCT_SUBSCRIPTION_NOT_FOUND')
        const next = { ...existing, ...data }
        state.productSubscriptions.set(where.id, next)
        return next
      },
    },
    user: {
      async findMany({
        where,
      }: {
        where?: {
          lifecycleState?: string
          deletedAt?: null
          NOT?: { email?: { startsWith?: string } }
        }
      }) {
        return [...state.users.values()]
          .filter((user) => {
            if (
              where?.lifecycleState &&
              user['lifecycleState' as keyof typeof user] !== where.lifecycleState
            )
              return false
            if (
              where?.deletedAt === null &&
              user.deletedAt !== null &&
              typeof user.deletedAt !== 'undefined'
            )
              return false
            const startsWith = where?.NOT?.email?.startsWith
            if (startsWith && (user.email ?? '').startsWith(startsWith))
              return false
            return true
          })
          .map((user) => {
            const activeSubscriptions = [...state.productSubscriptions.values()]
              .filter(
                (subscription) =>
                  subscription.userId === user.id &&
                  ['ACTIVE', 'TRIAL'].includes(subscription.status)
              )
              .map((subscription) => ({ id: subscription.id }))
            return {
              id: user.id,
              settings: user.settings ?? {},
              updatedAt: user.updatedAt ?? new Date(),
              notificationPreference: user.notificationPreference,
              subscriptions: activeSubscriptions,
            }
          })
      },
      async update({
        where,
        data,
      }: {
        where: { id: string }
        data: { lifecycleState?: string; settings?: Record<string, unknown> }
      }) {
        const existing = state.users.get(where.id)
        if (!existing) throw new Error('USER_NOT_FOUND')
        const next = {
          ...existing,
          ...(data.lifecycleState
            ? { lifecycleState: data.lifecycleState }
            : {}),
          ...(data.settings ? { settings: data.settings } : {}),
        }
        state.users.set(where.id, next)
        return next
      },
      async findUnique({ where }: { where: { id: string } }) {
        return state.users.get(where.id) ?? null
      },
    },
    weeklyReport: {
      async findMany({
        where,
        orderBy,
        take,
      }: {
        where: {
          userId: string
          createdAt?: { gte?: Date }
          summaryText?: { not?: null }
        }
        orderBy?: { createdAt?: 'asc' | 'desc' }
        take?: number
      }) {
        const rows = state.weeklyReports.filter((report) => {
          if (report.userId !== where.userId) return false
          if (where.createdAt?.gte && report.createdAt < where.createdAt.gte)
            return false
          if (where.summaryText?.not === null && report.summaryText === null)
            return false
          return true
        })
        rows.sort((left, right) =>
          orderBy?.createdAt === 'asc'
            ? left.createdAt.getTime() - right.createdAt.getTime()
            : right.createdAt.getTime() - left.createdAt.getTime()
        )
        return typeof take === 'number' ? rows.slice(0, take) : rows
      },
    },
    dailyCycleLog: {
      async count({
        where,
      }: {
        where: {
          userId: string
          choice?: 'CONFIRMED_OLD' | 'CHOSE_NEW' | 'PENDING'
        }
      }) {
        return state.dailyCycleLogs.filter((log) => {
          if (log.userId !== where.userId) return false
          if (where.choice && log.choice !== where.choice) return false
          return true
        }).length
      },
    },
  }

  const notifier = {
    async schedule(
      event: string,
      userId: string,
      _runAt: Date,
      payload?: Record<string, unknown>
    ) {
      state.scheduled.push({ event, userId, payload })
      return { event, userId, payload }
    },
  }

  return {
    db: db as unknown as typeof import('../../db/client.js').prisma,
    notifier,
    state,
  }
}

export async function runFlowTests() {
  const linked = transition('NEW', 'TELEGRAM_LINKED')
  assert(linked?.state === 'TELEGRAM_LINKED', 'NEW -> TELEGRAM_LINKED failed')
  assert(linked?.step === 'START_FLOW', 'NEW -> START_FLOW failed')

  const started = transition('TELEGRAM_LINKED', 'FLOW_STARTED')
  assert(started?.state === 'TRIAL_DAY_1', 'FLOW_STARTED state failed')
  assert(started?.step === 'WHEEL', 'FLOW_STARTED step failed')

  const completedWheel = applyTransition(
    { currentState: 'TRIAL_DAY_1', currentStep: 'WHEEL' },
    'WHEEL_COMPLETED'
  )
  assert(completedWheel.state === 'TRIAL_DAY_2', 'WHEEL_COMPLETED state failed')
  assert(completedWheel.step === 'DAILY_MORNING', 'WHEEL_COMPLETED step failed')

  assert(
    resolveCanonicalTestTransition('S0_TRAFFIC', 'TEST_STARTED') ===
      'S1_TEST_STARTED',
    'S0_TRAFFIC + TEST_STARTED transition failed'
  )
  assert(
    resolveCanonicalTestTransition('S2_TEST_QUESTIONS', 'TEST_COMPLETED') ===
      'S3_TEST_RESULT',
    'S2_TEST_QUESTIONS + TEST_COMPLETED transition failed'
  )

  assert(
    resolveCanonicalCtaId('pay_stankey_monthly') === 'PAY_FOCUS_1M',
    'canonical cta resolver failed'
  )
  assert(
    resolveCanonicalMessageKeyByCtaId('OPEN_PLATFORM') ===
      'PLATFORM_INVITE_AFTER_ZOOM',
    'canonical cta message mapping failed'
  )
  assert(
    resolveCanonicalMessageKeyByTestEvent('TEST_COMPLETED') ===
      'TEST_RESULT_DECISION',
    'canonical message key mapping failed'
  )
  assert(
    resolveStartScenario({ lifecycle: 'new', testResultType: null }) ===
      'FIRST_TIME_USER',
    'start scenario first time user failed'
  )
  assert(
    resolveStartScenario({
      lifecycle: 'focus_active',
      testResultType: 'STATE',
    }) === 'FOCUS_PARTICIPANT',
    'start scenario focus participant failed'
  )

  assert(
    resolveComeback({
      lastActivityDays: 10,
      lifecycle: 'platform_active',
    }) === 'GAP_7_14',
    'resolveComeback gap 7_14 failed'
  )

  const aiMentorFirstEntry = await resolveAIMentorEntry({
    conversationCount: 0,
  })
  assert(
    aiMentorFirstEntry.scenario === 'FIRST_ENTRY',
    'AI mentor first entry failed'
  )

  assert(
    resolveAiSellerMode({
      lifecycle: 'result_opened',
      testResultType: 'STATE',
      zoomCount: 0,
      daysToExpiry: null,
      platformDays: 0,
    }) === 'LEAD',
    'ai seller mode lead failed'
  )

  const aiSellerLeadDb = createBillingSchedulerTestDb()
  const now = new Date()
  aiSellerLeadDb.state.users.set('user-lead-ok', {
    id: 'user-lead-ok',
    lifecycleState: 'result_opened',
    email: 'lead-ok@example.com',
    deletedAt: null,
    updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    settings: {},
    notificationPreference: {
      telegramEnabled: true,
      subscriptionEnabled: true,
      aiRemindersEnabled: true,
    },
  })
  const leadSentTo: string[] = []
  await aiSellerLeadFollowup3dCron({
    db: aiSellerLeadDb.db,
    now,
    skipAvailabilityCheck: true,
    sender: async (userId) => {
      leadSentTo.push(userId)
      return true
    },
  })
  assert(
    leadSentTo.includes('user-lead-ok'),
    'scheduler LEAD_FOLLOWUP_3D should fire for eligible result_opened user'
  )

  const billingSchedulerWarningDb = createBillingSchedulerTestDb()
  billingSchedulerWarningDb.state.productSubscriptions.set('sub-1', {
    id: 'sub-1',
    userId: 'user-billing',
    amount: 780,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    product: { code: 'focus' },
  })
  billingSchedulerWarningDb.state.users.set('user-billing', {
    id: 'user-billing',
    lifecycleState: 'focus_active',
    notificationPreference: {
      telegramEnabled: true,
      subscriptionEnabled: true,
    },
  })
  await scheduleBillingExpiryWarning({
    db: billingSchedulerWarningDb.db,
    notifier: billingSchedulerWarningDb.notifier,
    now: new Date(),
    skipAvailabilityCheck: true,
  })
  assert(
    billingSchedulerWarningDb.state.scheduled.some(
      (entry) => entry.event === 'SUBSCRIPTION_EXPIRING'
    ),
    'billing expiry warning scheduler failed'
  )

  const winbackSchedulerDb = createBillingSchedulerTestDb()
  winbackSchedulerDb.state.productSubscriptions.set('sub-winback', {
    id: 'sub-winback',
    userId: 'user-winback',
    amount: 1900,
    expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'expired',
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    product: { code: 'absystem_ai' },
  })
  winbackSchedulerDb.state.users.set('user-winback', {
    id: 'user-winback',
    lifecycleState: 'expired',
    settings: {},
    notificationPreference: {
      telegramEnabled: true,
      subscriptionEnabled: true,
      aiRemindersEnabled: true,
    },
  })
  await scheduleWinbackNotification(3, 'WINBACK_3D', {
    db: winbackSchedulerDb.db,
    notifier: winbackSchedulerDb.notifier,
    now: new Date(),
    skipAvailabilityCheck: true,
  })
  assert(
    winbackSchedulerDb.state.scheduled.some(
      (entry) => entry.payload?.comeback_key === 'WINBACK_3D'
    ),
    'winback 3d scheduler failed'
  )

  const flowDecision = resolveCanonicalFlowOrchestration({
    event: 'PAYMENT_STARTED',
    current_state: 'S5_PAYMENT',
    readiness_level: 'medium',
  })
  assert(
    flowDecision.flow_id === 'PAYMENT_RECOVERY_FLOW',
    'canonical flow orchestration resolver failed'
  )
}
