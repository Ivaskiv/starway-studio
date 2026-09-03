import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildActiveFocusSubscriptionWhere } from '../../../../../src/modules/subscriptions/payments/focus-access.ts'

const { replyOrEditPanelMessage, resolveCoachAccess } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
  resolveCoachAccess: vi.fn(async () => ({
    id: 'coach-user-id',
    role: 'EXPERT',
    expertId: 'expert-1',
  })),
}))

const mockProductSubscriptionCount = vi.fn()
const mockPurchaseHistoryCount = vi.fn()
const mockCheckoutSessionCount = vi.fn()
const mockPurchaseHistoryFindMany = vi.fn()
const mockCheckoutSessionFindMany = vi.fn()
const mockPurchaseHistoryCreate = vi.fn()
const mockCheckoutSessionUpdate = vi.fn()
const mockProductSubscriptionUpdate = vi.fn()

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    productSubscription: {
      count: (...args: unknown[]) => mockProductSubscriptionCount(...args),
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
    purchaseHistory: {
      count: (...args: unknown[]) => mockPurchaseHistoryCount(...args),
      findMany: (...args: unknown[]) => mockPurchaseHistoryFindMany(...args),
      create: (...args: unknown[]) => mockPurchaseHistoryCreate(...args),
    },
    checkoutSession: {
      count: (...args: unknown[]) => mockCheckoutSessionCount(...args),
      findMany: (...args: unknown[]) => mockCheckoutSessionFindMany(...args),
      update: (...args: unknown[]) => mockCheckoutSessionUpdate(...args),
    },
  },
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.ts', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/bot/handlers/coach-content/shared.ts')
  >('../../../../../src/bot/handlers/coach-content/shared.ts')

  return {
    ...actual,
    replyOrEditPanelMessage,
    resolveCoachAccess,
  }
})

import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { handleCoachPaymentsCommand } from '../../../../../src/bot/handlers/coach-content/payments.ts'

function createCtx() {
  return {
    chat: { id: 12345 },
    reply: vi.fn(async () => undefined),
    callbackQuery: null,
  }
}

describe('coach payments workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:15:00.000Z'))
    mockProductSubscriptionCount.mockResolvedValue(12)
    mockPurchaseHistoryCount.mockResolvedValue(3)
    mockCheckoutSessionCount.mockResolvedValue(1)
    mockPurchaseHistoryFindMany.mockResolvedValue([
      {
        amountCents: 120000,
        currency: 'UAH',
        createdAt: new Date('2026-09-03T10:15:00.000Z'),
        product: { name: 'ФОКУС' },
        user: { firstName: 'Анна', lastName: 'Іваненко' },
      },
    ])
    mockCheckoutSessionFindMany.mockResolvedValue([
      {
        amount: 1200,
        currency: 'UAH',
        status: 'OPENED',
        createdAt: new Date('2026-09-03T09:15:00.000Z'),
        paymentIssueReportedAt: null,
        user: { firstName: 'Марія', lastName: 'Коваль' },
      },
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders professional overview with existing focus metrics only and no user paywall cta', async () => {
    const ctx = createCtx()

    const handled = await handleCoachPaymentsCommand(ctx as never)

    expect(handled).toBe(true)
    expect(replyOrEditPanelMessage).toHaveBeenCalledTimes(1)
    const [,, extra] = replyOrEditPanelMessage.mock.calls[0]
    const text = replyOrEditPanelMessage.mock.calls[0][1]

    expect(text).toContain(coachBotContent.payments.title)
    expect(text).toContain(coachBotContent.payments.focus)
    expect(text).toContain(`${coachBotContent.payments.labels.activeSubscriptions}: 12`)
    expect(text).toContain(`${coachBotContent.payments.labels.newToday}: 3`)
    expect(text).toContain(`${coachBotContent.payments.labels.pendingReview}: 1`)
    expect(text).not.toContain('Payments')
    expect(text).not.toContain('Оформити підписку')
    expect(text).not.toContain('Купити ФОКУС')
    expect(text).not.toContain('paywall')
    expect(JSON.stringify(extra.reply_markup.inline_keyboard)).toContain(coachBotContent.payments.actions.history)
    expect(JSON.stringify(extra.reply_markup.inline_keyboard)).toContain(coachBotContent.payments.actions.issues)
    expect(JSON.stringify(extra.reply_markup.inline_keyboard)).not.toContain(coachBotContent.payments.actions.back)
  })

  it('reuses canonical active focus subscription semantics and expert cohort scope', async () => {
    const ctx = createCtx()

    await handleCoachPaymentsCommand(ctx as never)

    expect(mockProductSubscriptionCount).toHaveBeenCalledTimes(1)
    expect(mockProductSubscriptionCount).toHaveBeenCalledWith({
      where: {
        user: { is: { expertId: 'expert-1', deletedAt: null } },
        product: {
          is: {
            OR: [
              { code: { equals: 'focus', mode: 'insensitive' } },
              { code: { equals: 'FOCUS', mode: 'insensitive' } },
            ],
          },
        },
        ...buildActiveFocusSubscriptionWhere(new Date('2026-09-03T10:15:00.000Z')),
      },
    })
  })

  it('counts daily payments only from purchase history and only pending checkout statuses', async () => {
    const ctx = createCtx()

    await handleCoachPaymentsCommand(ctx as never)

    expect(mockPurchaseHistoryCount).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
        user: { is: { expertId: 'expert-1', deletedAt: null } },
        product: {
          is: {
            OR: [
              { code: { equals: 'focus', mode: 'insensitive' } },
              { code: { equals: 'FOCUS', mode: 'insensitive' } },
            ],
          },
        },
      },
    })
    expect(mockCheckoutSessionCount).toHaveBeenCalledWith({
      where: {
        status: { in: ['CREATED', 'OPENED', 'PROCESSING'] },
        productCode: { in: ['focus', 'FOCUS'] },
        user: { is: { expertId: 'expert-1', deletedAt: null } },
      },
    })
  })

  it('renders payment history with human fields only and preserves amount currency', async () => {
    const ctx = createCtx()

    await handleCoachPaymentsCommand(ctx as never, 'history')

    const text = replyOrEditPanelMessage.mock.calls[0][1]
    const keyboard = JSON.stringify(replyOrEditPanelMessage.mock.calls[0][2]?.reply_markup?.inline_keyboard ?? [])

    expect(text).toContain(coachBotContent.payments.historyTitle)
    expect(text).toContain('Анна Іваненко')
    expect(text).toContain('ФОКУС')
    expect(text).toContain('1 200 UAH')
    expect(text).toContain('оплачено')
    expect(text).not.toContain('userId')
    expect(text).not.toContain('subscriptionId')
    expect(text).not.toContain('orderReference')
    expect(text).not.toContain('merchantAccount')
    expect(keyboard).toContain(coachBotContent.payments.actions.back)
  })

  it('renders problematic payments only when existing unresolved checkout owner supports them', async () => {
    const ctx = createCtx()

    await handleCoachPaymentsCommand(ctx as never, 'issues')

    const text = replyOrEditPanelMessage.mock.calls[0][1]

    expect(text).toContain(coachBotContent.payments.issuesTitle)
    expect(text).toContain('Марія Коваль')
    expect(text).toContain('ФОКУС')
    expect(text).toContain('1 200 UAH')
    expect(text).toContain('очікує підтвердження')
    expect(text).not.toContain('paymentId')
    expect(text).not.toContain('orderReference')
    expect(text).not.toContain('raw')
  })

  it('hides unsupported actions when there is no history and no unresolved checkout data', async () => {
    const ctx = createCtx()
    mockPurchaseHistoryFindMany.mockResolvedValue([])
    mockCheckoutSessionCount.mockResolvedValue(0)

    await handleCoachPaymentsCommand(ctx as never)

    const text = replyOrEditPanelMessage.mock.calls[0][1]
    const keyboard = replyOrEditPanelMessage.mock.calls[0][2]

    expect(text).toContain(`${coachBotContent.payments.labels.pendingReview}: 0`)
    expect(keyboard).toBeUndefined()
  })

  it('keeps the presentation owner read-only', async () => {
    const ctx = createCtx()

    await handleCoachPaymentsCommand(ctx as never, 'issues')

    expect(mockPurchaseHistoryCreate).not.toHaveBeenCalled()
    expect(mockCheckoutSessionUpdate).not.toHaveBeenCalled()
    expect(mockProductSubscriptionUpdate).not.toHaveBeenCalled()
  })
})
