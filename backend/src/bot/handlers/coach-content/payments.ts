import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  FOCUS_PRODUCT_CODES,
  buildActiveFocusSubscriptionWhere,
} from '../../../modules/subscriptions/payments/focus-access.js'
import {
  buildExpertScopeWhere,
  coachPanelContent,
  formatKyivDateTime,
  replyOrEditPanelMessage,
  resolveCoachAccess,
  safeText,
} from './shared.js'

type PaymentScreenSection = 'overview' | 'history' | 'issues'

const PENDING_CHECKOUT_STATUSES = ['CREATED', 'OPENED', 'PROCESSING'] as const

function buildPaymentsKeyboard(input: {
  hasHistory: boolean
  hasIssues: boolean
  canGoBack: boolean
}) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = []

  if (input.hasHistory) {
    rows.push([Markup.button.callback(coachPanelContent.payments.actions.history, 'coach-content:payments:history')])
  }

  if (input.hasIssues) {
    rows.push([Markup.button.callback(coachPanelContent.payments.actions.issues, 'coach-content:payments:issues')])
  }

  if (input.canGoBack) {
    rows.push([Markup.button.callback(coachPanelContent.payments.actions.back, 'coach-content:payments')])
  }

  return rows.length > 0 ? Markup.inlineKeyboard(rows) : undefined
}

function formatAmount(amount: number, currency: string): string {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: Number.isInteger(normalizedAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(normalizedAmount)

  return `${formatted} ${safeText(currency, 'UAH')}`
}

function formatPurchaseAmount(amountCents: number, currency: string): string {
  return formatAmount(amountCents / 100, currency)
}

function formatParticipantName(input: {
  firstName?: string | null
  lastName?: string | null
}): string {
  const value = [input.firstName, input.lastName]
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return value || 'Учасниця'
}

function productCodeFilter() {
  return { in: [...FOCUS_PRODUCT_CODES] }
}

function productRelationFilter() {
  return {
    OR: FOCUS_PRODUCT_CODES.map((code) => ({
      code: { equals: code, mode: 'insensitive' as const },
    })),
  }
}

function buildScopedUserWhere(coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>) {
  return {
    deletedAt: null,
    ...buildExpertScopeWhere(coach),
  }
}

function startOfKyivDay(now = new Date()): Date {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
  kyivNow.setHours(0, 0, 0, 0)
  return new Date(kyivNow.toISOString())
}

function endOfKyivDay(now = new Date()): Date {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
  kyivNow.setHours(23, 59, 59, 999)
  return new Date(kyivNow.toISOString())
}

async function loadPaymentOverview(
  coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>,
) {
  const userScopeWhere = buildScopedUserWhere(coach)
  const now = new Date()
  const [activeSubscriptions, newPaymentsToday, pendingCheckouts, recentPayments] = await Promise.all([
    prisma.productSubscription.count({
      where: {
        user: { is: userScopeWhere },
        product: { is: productRelationFilter() },
        ...buildActiveFocusSubscriptionWhere(now),
      },
    }),
    prisma.purchaseHistory.count({
      where: {
        createdAt: { gte: startOfKyivDay(), lte: endOfKyivDay() },
        user: { is: userScopeWhere },
        product: { is: productRelationFilter() },
      },
    }),
    prisma.checkoutSession.count({
      where: {
        status: { in: [...PENDING_CHECKOUT_STATUSES] },
        productCode: productCodeFilter(),
        user: { is: userScopeWhere },
      },
    }),
    prisma.purchaseHistory.findMany({
      where: {
        user: { is: userScopeWhere },
        product: { is: productRelationFilter() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        amountCents: true,
        currency: true,
        createdAt: true,
        product: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ])

  return {
    activeSubscriptions,
    newPaymentsToday,
    pendingCheckouts,
    recentPayments,
  }
}

async function loadPaymentHistory(
  coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>,
) {
  return prisma.purchaseHistory.findMany({
    where: {
      user: { is: buildScopedUserWhere(coach) },
      product: { is: productRelationFilter() },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      amountCents: true,
      currency: true,
      createdAt: true,
      product: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

async function loadProblemPayments(
  coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>,
) {
  return prisma.checkoutSession.findMany({
    where: {
      status: { in: [...PENDING_CHECKOUT_STATUSES] },
      productCode: productCodeFilter(),
      user: { is: buildScopedUserWhere(coach) },
    },
    orderBy: [
      { paymentIssueReportedAt: 'desc' },
      { lastOpenedAt: 'desc' },
      { openedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
    select: {
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      paymentIssueReportedAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

function renderPaymentsOverview(input: {
  activeSubscriptions: number
  newPaymentsToday: number
  pendingCheckouts: number
}): string {
  return [
    coachPanelContent.payments.title,
    '',
    coachPanelContent.payments.focus,
    '',
    `${coachPanelContent.payments.labels.activeSubscriptions}: ${input.activeSubscriptions}`,
    `${coachPanelContent.payments.labels.newToday}: ${input.newPaymentsToday}`,
    `${coachPanelContent.payments.labels.pendingReview}: ${input.pendingCheckouts}`,
  ].join('\n')
}

function renderPaymentHistoryList(items: Array<{
  amountCents: number
  currency: string
  createdAt: Date
  product: { name: string | null } | null
  user: { firstName: string | null; lastName: string | null }
}>): string {
  if (items.length === 0) {
    return [coachPanelContent.payments.title, '', coachPanelContent.payments.historyTitle, '', coachPanelContent.payments.noData].join('\n')
  }

  return [
    coachPanelContent.payments.title,
    '',
    coachPanelContent.payments.historyTitle,
    '',
    ...items.map((item) => [
      formatParticipantName(item.user),
      safeText(item.product?.name, coachPanelContent.payments.focus),
      formatPurchaseAmount(item.amountCents, item.currency),
      'оплачено',
      formatKyivDateTime(item.createdAt),
    ].join('\n')),
  ].join('\n\n')
}

function mapCheckoutStatus(status: string, paymentIssueReportedAt: Date | null): string {
  if (paymentIssueReportedAt) return 'помилка оплати'
  if (status === 'OPENED' || status === 'CREATED' || status === 'PROCESSING') return 'очікує підтвердження'
  return 'очікує підтвердження'
}

function renderProblemPayments(items: Array<{
  amount: number
  currency: string
  status: string
  createdAt: Date
  paymentIssueReportedAt: Date | null
  user: { firstName: string | null; lastName: string | null }
}>): string {
  if (items.length === 0) {
    return [coachPanelContent.payments.title, '', coachPanelContent.payments.issuesTitle, '', coachPanelContent.payments.noIssues].join('\n')
  }

  return [
    coachPanelContent.payments.title,
    '',
    coachPanelContent.payments.issuesTitle,
    '',
    ...items.map((item) => [
      formatParticipantName(item.user),
      coachPanelContent.payments.focus,
      formatAmount(item.amount, item.currency),
      mapCheckoutStatus(item.status, item.paymentIssueReportedAt),
      formatKyivDateTime(item.paymentIssueReportedAt ?? item.createdAt),
    ].join('\n')),
  ].join('\n\n')
}

export async function handleCoachPaymentsCommand(
  ctx: Context,
  section: PaymentScreenSection = 'overview',
): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const overview = await loadPaymentOverview(coach)
  const hasHistory = overview.recentPayments.length > 0
  const hasIssues = overview.pendingCheckouts > 0

  if (section === 'history') {
    const history = await loadPaymentHistory(coach)
    await replyOrEditPanelMessage(
      ctx,
      renderPaymentHistoryList(history),
      buildPaymentsKeyboard({ hasHistory, hasIssues, canGoBack: true }),
    )
    return true
  }

  if (section === 'issues') {
    const issues = await loadProblemPayments(coach)
    await replyOrEditPanelMessage(
      ctx,
      renderProblemPayments(issues),
      buildPaymentsKeyboard({ hasHistory, hasIssues, canGoBack: true }),
    )
    return true
  }

  await replyOrEditPanelMessage(
    ctx,
    renderPaymentsOverview(overview),
    buildPaymentsKeyboard({ hasHistory, hasIssues, canGoBack: false }),
  )
  return true
}
