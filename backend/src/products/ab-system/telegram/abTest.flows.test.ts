import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  sendStateMenuMock,
  handleStartMock,
  handleAIMentorMock,
  resendFocusAccessTelegramMessageMock,
  hasActiveFocusSubscriptionMock,
  buildCheckoutSessionMock,
  resolveContextUserIdMock,
  planAckMock,
} = vi.hoisted(() => ({
  sendStateMenuMock: vi.fn(),
  handleStartMock: vi.fn(),
  handleAIMentorMock: vi.fn(),
  resendFocusAccessTelegramMessageMock: vi.fn(),
  hasActiveFocusSubscriptionMock: vi.fn(),
  buildCheckoutSessionMock: vi.fn(),
  resolveContextUserIdMock: vi.fn(),
  planAckMock: vi.fn(async () => undefined),
}))

vi.mock('../../../db/client.js', () => ({
  prisma: {
    paymentLog: { findFirst: vi.fn() },
    productSubscription: { findFirst: vi.fn() },
  },
}))

vi.mock('../../../core/state-machine/abTestFoundation.js', () => ({
  buildAbTestProgressPatch: vi.fn(),
  normalizeAbTestProgress: vi.fn(),
}))

vi.mock('../content/abTest.focus.js', () => ({
  FOCUS_PAYMENT_ISSUE_COACH_MSG: '',
  FOCUS_PAYMENT_ISSUE_NO_USER_MSG: '',
  FOCUS_PAYMENT_ISSUE_USER_MSG: '',
  FOCUS_RESEND_MISSING_USER_MSG: 'missing',
  FOCUS_RESEND_NO_SUB_MSG: 'no-sub',
}))

vi.mock('../content/abTest.shared.js', () => ({
  AB_TEST_FOCUS_PAYMENT_CTA_1M: '1m',
  AB_TEST_FOCUS_PAYMENT_CTA_3M: '3m',
  AB_TEST_FOCUS_PRICE_1M: '1m-price',
  AB_TEST_FOCUS_PRICE_3M: '3m-price',
  AB_TEST_FOCUS_REAL_SITUATION_HEADER: 'header',
  AB_TEST_FOCUS_REAL_SITUATION_LINES: ['line'],
  AB_TEST_FOCUS_TARIFF_HEADER: 'tariff',
  AB_TEST_FOCUS_TITLE: 'title',
  AB_TEST_FOCUS_WEEKLY_TEXT: 'weekly',
}))

vi.mock('../content/abTest.results.js', () => ({
  BLOCK10_FOCUS: { text: '', blocks: [] },
}))

vi.mock('./abTest.views.js', () => ({
  splitTelegramContentBlocks: vi.fn(),
  sendTelegramContentChunk: vi.fn(),
}))

vi.mock('./abTest.progress.js', () => ({
  loadAbTestProgress: vi.fn(),
  saveAbTestProgress: vi.fn(),
}))

vi.mock('./abTest.callback.js', () => ({
  escapeHtml: vi.fn(),
  isTestPaymentEnabled: vi.fn(() => false),
  formatSubscriptionDate: vi.fn(),
  resolveContextUserId: resolveContextUserIdMock,
  deactivateCallbackMarkup: vi.fn(async () => undefined),
  isValidEmail: vi.fn(),
}))

vi.mock('../../../modules/user/identity.service.js', () => ({
  attachEmailToUser: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/services/linking.service.js', () => ({
  upsertTelegramBinding: vi.fn(),
}))

vi.mock('../../../modules/deeplinks/service.js', () => ({
  buildWebDeepLink: vi.fn(),
  generateDeepLink: vi.fn(),
}))

vi.mock('../../../modules/auth/mail.service.js', () => ({
  sendMagicLoginEmail: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/services/pendingIdentity.service.js', () => ({
  clearPendingTelegramIdentity: vi.fn(),
}))

vi.mock('@/modules/telegram-mentor/services/ctaInteraction.service.js', () => ({
  hasTelegramCtaInteraction: vi.fn(),
}))

vi.mock('./abTest.scheduler.js', () => ({
  scheduleFollowups: vi.fn(),
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {},
}))

vi.mock('../../../modules/subscriptions/payments/business.js', () => ({
  buildEcosystemPaymentCheckoutSession: buildCheckoutSessionMock,
}))

vi.mock('@/modules/subscriptions/payments/focus.access.js', () => ({
  hasActiveFocusSubscription: hasActiveFocusSubscriptionMock,
}))

vi.mock('@/modules/subscriptions/payments/callback.notifications.js', () => ({
  resendFocusAccessTelegramMessage: resendFocusAccessTelegramMessageMock,
}))

vi.mock('@/modules/subscriptions/payments/coachAlert.service.js', () => ({
  alertCoachAboutPaymentIssue: vi.fn(),
}))

vi.mock('../../../lib/telegram.js', () => ({
  coachBot: { telegram: { sendMessage: vi.fn() } },
}))

vi.mock('@/modules/events/service.js', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({
  planMessage: vi.fn(),
  planAck: planAckMock,
}))

vi.mock('@/packages/abTestActions.js', () => ({
  AB_TEST_ACTIONS: {},
}))

vi.mock('../../../modules/telegram-mentor/session.js', () => ({
  clearSession: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/handlers/abTest.start.js', () => ({
  postZoomAbsystemCtaMessage: vi.fn(),
}))

vi.mock('../../../modules/telegram-mentor/handlers/start.menu.js', () => ({
  sendStateMenu: sendStateMenuMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/start.js', () => ({
  handleStart: handleStartMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/aiMentor.js', () => ({
  handleAIMentor: handleAIMentorMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/status.js', () => ({
  handleStatus: vi.fn(),
}))

import { prisma } from '../../../db/client.js'
import { handleFocusPaymentAction, handleResendFocusBlock12, resolveFocusShortcutCallback } from './abTest.flows.js'

function createCtx() {
  return {
    chat: { id: 42 },
    from: { id: 99 },
    telegram: {
      sendMessage: vi.fn(async () => undefined),
    },
    answerCbQuery: vi.fn(async () => undefined),
  }
}

describe('legacy focus callbacks for active users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasActiveFocusSubscriptionMock.mockResolvedValue(true)
    resendFocusAccessTelegramMessageMock.mockResolvedValue(true)
    sendStateMenuMock.mockResolvedValue(undefined)
    handleStartMock.mockResolvedValue(undefined)
    handleAIMentorMock.mockResolvedValue(undefined)
    buildCheckoutSessionMock.mockResolvedValue({ checkoutUrl: 'https://checkout.example' })
    resolveContextUserIdMock.mockResolvedValue('user-1')
    vi.mocked(prisma.paymentLog.findFirst).mockResolvedValue({ id: 'pay-1' } as never)
    vi.mocked(prisma.productSubscription.findFirst).mockResolvedValue({ id: 'sub-1' } as never)
  })

  it('routes legacy open_focus_payment to the current state menu for active users', async () => {
    const ctx = createCtx()

    const handled = await handleFocusPaymentAction(ctx as never, 'user-1', 42)

    expect(handled).toBe(true)
    expect(sendStateMenuMock).toHaveBeenCalledWith(ctx, 'user-1')
    expect(resendFocusAccessTelegramMessageMock).not.toHaveBeenCalled()
    expect(buildCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('routes legacy "already paid" callback to the current state menu for active users', async () => {
    const ctx = createCtx()

    const handled = await handleResendFocusBlock12(ctx as never)

    expect(handled).toBe(true)
    expect(sendStateMenuMock).toHaveBeenCalledWith(ctx, 'user-1')
    expect(resendFocusAccessTelegramMessageMock).not.toHaveBeenCalled()
    expect(planAckMock).toHaveBeenCalled()
  })

  it('routes focus:menu to canonical /start owner for active users', async () => {
    const ctx = createCtx()

    const handled = await resolveFocusShortcutCallback(ctx as never, 'focus:menu', 'focus-user')

    expect(handled).toBe(true)
    expect(handleStartMock).toHaveBeenCalledTimes(1)
    expect(handleStartMock).toHaveBeenCalledWith(ctx)
    expect(sendStateMenuMock).not.toHaveBeenCalled()
    expect(handleAIMentorMock).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
  })

  it('routes focus:menu to canonical /start owner for completed users without access', async () => {
    const ctx = createCtx()

    const handled = await resolveFocusShortcutCallback(ctx as never, 'focus:menu', 'completed-user')

    expect(handled).toBe(true)
    expect(handleStartMock).toHaveBeenCalledTimes(1)
    expect(sendStateMenuMock).not.toHaveBeenCalled()
    expect(handleAIMentorMock).not.toHaveBeenCalled()
  })

  it('answers with a controlled error when focus payment checkout has no resolved user', async () => {
    const ctx = createCtx()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    hasActiveFocusSubscriptionMock.mockResolvedValue(false)
    resolveContextUserIdMock.mockResolvedValue(null)

    const handled = await handleFocusPaymentAction(ctx as never, null, 42)

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Не вдалося відкрити ФОКУС. Спробуй ще раз.')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[FOCUS_PAY] missing_user_id_for_checkout')
    expect(buildCheckoutSessionMock).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
