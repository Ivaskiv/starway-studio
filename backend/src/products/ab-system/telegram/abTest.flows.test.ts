import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  sendStateMenuMock,
  handleAIMentorMock,
  resendFocusAccessTelegramMessageMock,
  hasActiveFocusSubscriptionMock,
  buildCheckoutSessionMock,
  resolveContextUserIdMock,
  planAckMock,
  alertCoachAboutPaymentIssueMock,
  findRelevantFocusCheckoutSessionMock,
  isTestPaymentEnabledMock,
  isValidEmailMock,
  scheduleFollowupsMock,
  getDevTestPaymentButtonMock,
  sendTelegramContentChunkMock,
  renderAbTestPostEmailSubmitSequenceMock,
  loadAbTestProgressMock,
  saveAbTestProgressMock,
  zoomSectionMock,
  buildAbTestProgressPatchMock,
  normalizeAbTestProgressMock,
  sendOpsTelegramMessageMock,
  coachSendPhotoMock,
  coachSendDocumentMock,
  onTestCompletedMock,
} = vi.hoisted(() => ({
  sendStateMenuMock: vi.fn(),
  handleAIMentorMock: vi.fn(),
  resendFocusAccessTelegramMessageMock: vi.fn(),
  hasActiveFocusSubscriptionMock: vi.fn(),
  buildCheckoutSessionMock: vi.fn(),
  resolveContextUserIdMock: vi.fn(),
  planAckMock: vi.fn(async () => undefined),
  alertCoachAboutPaymentIssueMock: vi.fn(),
  findRelevantFocusCheckoutSessionMock: vi.fn(),
  isTestPaymentEnabledMock: vi.fn(() => false),
  isValidEmailMock: vi.fn(() => true),
  scheduleFollowupsMock: vi.fn(async (_userId: string, progress: unknown) => progress),
  getDevTestPaymentButtonMock: vi.fn(() => null),
  sendTelegramContentChunkMock: vi.fn(),
  renderAbTestPostEmailSubmitSequenceMock: vi.fn(),
  loadAbTestProgressMock: vi.fn(),
  saveAbTestProgressMock: vi.fn(),
  zoomSectionMock: vi.fn(),
  buildAbTestProgressPatchMock: vi.fn(),
  normalizeAbTestProgressMock: vi.fn(),
  sendOpsTelegramMessageMock: vi.fn(),
  coachSendPhotoMock: vi.fn(),
  coachSendDocumentMock: vi.fn(),
  onTestCompletedMock: vi.fn(async () => undefined),
}))

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    checkoutSession: { findFirst: vi.fn() },
    paymentLog: { findFirst: vi.fn() },
    productSubscription: { findFirst: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../../../core/state-machine/abTestFoundation.js', () => ({
  buildAbTestProgressPatch: buildAbTestProgressPatchMock,
  normalizeAbTestProgress: normalizeAbTestProgressMock,
}))

vi.mock('../content/abTest.focus.js', () => ({
  FOCUS_PAYMENT_ISSUE_COACH_MSG: vi.fn(() => ''),
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
 sendTelegramContentChunk: sendTelegramContentChunkMock,
 renderAbTestPostEmailSubmitSequence: renderAbTestPostEmailSubmitSequenceMock,
}))

vi.mock('./abTest.progress.js', () => ({
 loadAbTestProgress: loadAbTestProgressMock,
 saveAbTestProgress: saveAbTestProgressMock,
}))

vi.mock('./abTest.callback.js', () => ({
 escapeHtml: vi.fn(),
 isTestPaymentEnabled: isTestPaymentEnabledMock,
 formatSubscriptionDate: vi.fn(),
 resolveContextUserId: resolveContextUserIdMock,
 deactivateCallbackMarkup: vi.fn(async () => undefined),
 isValidEmail: isValidEmailMock,
}))

vi.mock('../../../modules/telegram-mentor/keyboards.js', () => ({
 getDevTestPaymentButton: getDevTestPaymentButtonMock,
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
 scheduleFollowups: scheduleFollowupsMock,
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
 testOrchestrator: {
 onTestCompleted: onTestCompletedMock,
 },
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
 alertCoachAboutPaymentIssue: alertCoachAboutPaymentIssueMock,
 findRelevantFocusCheckoutSession: findRelevantFocusCheckoutSessionMock,
}))

vi.mock('../../../lib/telegram.js', () => ({
 coachBot: {
 telegram: {
 sendMessage: vi.fn(),
 sendPhoto: coachSendPhotoMock,
 sendDocument: coachSendDocumentMock,
 },
 },
 sendOpsTelegramMessage: sendOpsTelegramMessageMock,
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
 zoomSection: zoomSectionMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/start.menu.js', () => ({
 sendStateMenu: sendStateMenuMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/aiMentor.js', () => ({
 handleAIMentor: handleAIMentorMock,
}))

vi.mock('../../../modules/telegram-mentor/handlers/status.js', () => ({
 handleStatus: vi.fn(),
}))

import { prisma } from '../../../db/client.js'
import { clearSession, getSession, updateSession } from '../../../modules/telegram-mentor/session.js'
import {
 handleAbTestEmailCaptureText,
 handleFocusPaymentAction,
 handleFocusPaymentIssue,
 handlePendingFocusPaymentEvidenceAttachment,
 handlePendingFocusPaymentEvidenceText,
 handleResendFocusBlock12,
 resolveFocusShortcutCallback,
} from './abTest.flows.js'

function createCtx() {
 return {
 chat: { id: 42 },
 from: { id: 99 },
 telegram: {
 sendMessage: vi.fn(async () => undefined),
 getFileLink: vi.fn(async () => new URL('https://files.example/check.jpg')),
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
 handleAIMentorMock.mockResolvedValue(undefined)
 buildCheckoutSessionMock.mockResolvedValue({ checkoutUrl: 'https://checkout.example' })
 resolveContextUserIdMock.mockResolvedValue('user-1')
 alertCoachAboutPaymentIssueMock.mockResolvedValue(undefined)
 findRelevantFocusCheckoutSessionMock.mockResolvedValue({
 token: 'checkout-token',
 orderReference: 'focus_order',
 amount: 1000,
 })
 isValidEmailMock.mockReturnValue(true)
 loadAbTestProgressMock.mockResolvedValue(null)
 saveAbTestProgressMock.mockResolvedValue(undefined)
 scheduleFollowupsMock.mockImplementation(async (_userId: string, progress: unknown) => progress)
 buildAbTestProgressPatchMock.mockImplementation((current, patch) => ({ ...(current ?? {}), ...(patch ?? {}) }))
 normalizeAbTestProgressMock.mockImplementation((value) => value ?? { focus_opened_at: null })
 sendOpsTelegramMessageMock.mockResolvedValue(true)
 coachSendPhotoMock.mockResolvedValue(undefined)
 coachSendDocumentMock.mockResolvedValue(undefined)
 vi.mocked(updateSession).mockResolvedValue(undefined as never)
 vi.mocked(clearSession).mockResolvedValue(undefined as never)
 zoomSectionMock.mockResolvedValue({
 text: 'ФОКУС ДІМ',
 buttons: [[{ text: 'КАЛЕНДАР ФОКУСУ', callback_data: 'focus:next_zoom' }]],
    })
    vi.mocked(prisma.paymentLog.findFirst).mockResolvedValue({ id: 'pay-1' } as never)
    vi.mocked(prisma.productSubscription.findFirst).mockResolvedValue({ id: 'sub-1' } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'user-1' } as never)
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

  it('shows the permanent trial Zoom button for a completed user without Focus access and does not mark them paid', async () => {
    const ctx = createCtx()
    hasActiveFocusSubscriptionMock.mockResolvedValue(false)

    const handled = await handleFocusPaymentAction(ctx as never, 'user-1', 42)

    expect(handled).toBe(true)
    expect(sendTelegramContentChunkMock).toHaveBeenCalledWith(
      ctx,
      42,
      '',
      expect.any(Array),
      expect.objectContaining({
        inlineKeyboard: {
          inline_keyboard: [
            [{ text: '1m', url: 'https://checkout.example' }],
            [{ text: '3m', url: 'https://checkout.example' }],
            [{ text: 'ПРОБНИЙ ZOOM — 1 ГРН', url: 'https://checkout.example' }],
            [{ text: 'ПРОБЛЕМА З ОПЛАТОЮ', callback_data: 'focus:payment_issue' }],
          ],
        },
      }),
    )
    expect(vi.mocked(prisma.productSubscription.updateMany)).not.toHaveBeenCalled()
    expect(resendFocusAccessTelegramMessageMock).not.toHaveBeenCalled()
    expect(sendStateMenuMock).not.toHaveBeenCalled()
  })

  it('renders the 1 UAH test payment button under the paid CTAs when enabled', async () => {
    const ctx = createCtx()
    hasActiveFocusSubscriptionMock.mockResolvedValue(false)
    isTestPaymentEnabledMock.mockReturnValue(true)
    getDevTestPaymentButtonMock.mockReturnValue({
      text: 'ТЕСТ 1 ГРН',
      url: 'https://secure.wayforpay.com/button/bcd1a02457187',
    })

    const handled = await handleFocusPaymentAction(ctx as never, 'user-1', 42)

    expect(handled).toBe(true)
    expect(sendTelegramContentChunkMock).toHaveBeenCalledWith(
      ctx,
      42,
      '',
      expect.any(Array),
      expect.objectContaining({
        inlineKeyboard: {
          inline_keyboard: [
            [{ text: '1m', url: 'https://checkout.example' }],
            [{ text: '3m', url: 'https://checkout.example' }],
            [{ text: 'ПРОБНИЙ ZOOM — 1 ГРН', url: 'https://checkout.example' }],
            [{ text: 'ТЕСТ 1 ГРН', url: 'https://secure.wayforpay.com/button/bcd1a02457187' }],
            [{ text: 'ПРОБЛЕМА З ОПЛАТОЮ', callback_data: 'focus:payment_issue' }],
          ],
        },
      }),
    )
  })

  it('omits the trial Zoom CTA after the user has already used it', async () => {
    const ctx = createCtx()
    hasActiveFocusSubscriptionMock.mockResolvedValue(false)
    isTestPaymentEnabledMock.mockReturnValue(false)
    buildCheckoutSessionMock
      .mockResolvedValueOnce({ checkoutUrl: 'https://checkout.example' })
      .mockResolvedValueOnce({ checkoutUrl: 'https://checkout.example' })
      .mockRejectedValueOnce(new Error('TRIAL_ZOOM_ALREADY_USED'))

    const handled = await handleFocusPaymentAction(ctx as never, 'user-1', 42)

    expect(handled).toBe(true)
    expect(sendTelegramContentChunkMock).toHaveBeenCalledWith(
      ctx,
      42,
      '',
      expect.any(Array),
      expect.objectContaining({
        inlineKeyboard: {
          inline_keyboard: [
            [{ text: '1m', url: 'https://checkout.example' }],
            [{ text: '3m', url: 'https://checkout.example' }],
            [{ text: 'ПРОБЛЕМА З ОПЛАТОЮ', callback_data: 'focus:payment_issue' }],
          ],
        },
      }),
    )
  })

  it('sends ops alert for payment issue even when no checkout exists yet', async () => {
    const ctx = createCtx()
    process.env.STARWAY_OPS_CHAT_ID = 'ops-chat'
    vi.mocked(prisma.productSubscription.updateMany).mockResolvedValue({ count: 0 } as never)
    findRelevantFocusCheckoutSessionMock.mockResolvedValue(null)

    const handled = await handleFocusPaymentIssue(ctx as never, 'user-1')

    expect(handled).toBe(true)
    expect(ctx.telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateSession)).toHaveBeenCalledWith(
      'user-1',
      '42',
      'chat',
      expect.objectContaining({
        paymentIssueAwaitingEvidence: true,
      }),
      0,
    )
    expect(alertCoachAboutPaymentIssueMock).toHaveBeenCalledWith({
      bot: expect.any(Object),
      coachChatId: 'ops-chat',
      userId: 'user-1',
      checkoutToken: null,
      orderReference: 'unknown',
      amount: 0,
      reason: '',
      scenario: 'E',
    })
  })

  it('returns to Focus home after post-zoom insight instead of sending an ABSystem upsell', async () => {
    const ctx = createCtx()
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      data: { postZoomInsightAwaiting: true },
    } as never)

    const handled = await handleAbTestEmailCaptureText(ctx as never, 'user-1', 'мій інсайт')

    expect(handled).toBe(true)
    expect(vi.mocked(clearSession)).toHaveBeenCalledWith('user-1', '42')
    expect(zoomSectionMock).toHaveBeenCalledWith('user-1')
    expect(ctx.telegram.sendMessage).toHaveBeenNthCalledWith(
      2,
      '42',
      'ФОКУС ДІМ',
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: 'КАЛЕНДАР ФОКУСУ', callback_data: 'focus:next_zoom' }]] },
      },
    )
  })

  it('routes email capture through the canonical S3 sender with persisted user state', async () => {
    const ctx = createCtx()
    const { attachEmailToUser } = await import('../../../modules/user/identity.service.js')
    const { generateDeepLink, buildWebDeepLink } = await import('../../../modules/deeplinks/service.js')
    const { sendMagicLoginEmail } = await import('../../../modules/auth/mail.service.js')

    vi.mocked(getSession).mockResolvedValue(null as never)
    vi.mocked(attachEmailToUser).mockResolvedValue({ userId: 'user-42' } as never)
    vi.mocked(generateDeepLink).mockResolvedValue({ token: 'magic', path: '/onboarding/continue' } as never)
    vi.mocked(buildWebDeepLink).mockReturnValue('https://app.example/magic')
    vi.mocked(sendMagicLoginEmail).mockResolvedValue(true as never)
    loadAbTestProgressMock.mockResolvedValue({
      status: 'completed',
      stage: 'S3_TEST_RESULT',
      result_key: 'action',
      email_stage: 'pending',
      started_at: '2026-08-04T09:00:00.000Z',
    })
    saveAbTestProgressMock.mockResolvedValue(undefined)

    const handled = await handleAbTestEmailCaptureText(
      ctx as never,
      'user-1',
      'vira@example.com',
    )

    expect(handled).toBe(true)
    expect(renderAbTestPostEmailSubmitSequenceMock).toHaveBeenCalledTimes(1)
    expect(renderAbTestPostEmailSubmitSequenceMock).toHaveBeenCalledWith(
      ctx,
      'user-42',
      expect.objectContaining({
        result_key: 'action',
        email_stage: 'captured',
      }),
      {
        notifyOps: false,
        trigger: 'email_capture',
      },
    )
  })

  it('forwards text payment evidence to OPS and clears pending state', async () => {
    const ctx = createCtx()
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      data: { paymentIssueAwaitingEvidence: true },
    } as never)

    const handled = await handlePendingFocusPaymentEvidenceText(
      ctx as never,
      'user-1',
      'Є чек, дата 28.07, 15 євро, картка 1234',
    )

    expect(handled).toBe(true)
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('Є чек, дата 28.07, 15 євро, картка 1234'),
      undefined,
      expect.objectContaining({
        messageType: 'focus_payment_evidence',
      }),
    )
    expect(vi.mocked(clearSession)).toHaveBeenCalledWith('user-1', '42')
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      expect.stringContaining('Чек і деталі платежу передано'),
    )
  })

  it('forwards photo payment evidence to OPS and clears pending state', async () => {
    const ctx = {
      ...createCtx(),
      message: {
        photo: [{ file_id: 'small' }, { file_id: 'large' }],
        caption: 'Ось чек',
      },
    }
    process.env.STARWAY_OPS_CHAT_ID = '3829747010'
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      data: { paymentIssueAwaitingEvidence: true },
    } as never)

    const handled = await handlePendingFocusPaymentEvidenceAttachment(
      ctx as never,
      'user-1',
    )

    expect(handled).toBe(true)
    expect(sendOpsTelegramMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('Тип: photo'),
      undefined,
      expect.objectContaining({
        messageType: 'focus_payment_evidence',
      }),
    )
    expect(ctx.telegram.getFileLink).toHaveBeenCalledWith('large')
    expect(coachSendPhotoMock).toHaveBeenCalledWith(
      '-1003829747010',
      'https://files.example/check.jpg',
      { caption: 'Ось чек' },
    )
    expect(vi.mocked(clearSession)).toHaveBeenCalledWith('user-1', '42')
  })
})
