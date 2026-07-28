import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  parseAbTestCallbackMock,
  resolveContextUserIdMock,
  logCallbackReceivedMock,
  logCallbackHandledMock,
  logAbTestStartDebugMock,
  loadAbTestProgressMock,
  handleShowResultMock,
  resolveFocusShortcutCallbackMock,
} = vi.hoisted(() => ({
  parseAbTestCallbackMock: vi.fn(),
  resolveContextUserIdMock: vi.fn(),
  logCallbackReceivedMock: vi.fn(),
  logCallbackHandledMock: vi.fn(),
  logAbTestStartDebugMock: vi.fn(),
  loadAbTestProgressMock: vi.fn(),
  handleShowResultMock: vi.fn(),
  resolveFocusShortcutCallbackMock: vi.fn(),
}))

vi.mock('../../../db/client.js', () => ({
  prisma: {},
}))

vi.mock('../../../core/state-machine/abTestFoundation.js', () => ({
  buildAbTestProgressPatch: vi.fn(),
  cloneAbTestProgress: vi.fn(),
  resolveAbTestNextQuestion: vi.fn(),
  resolveAbTestQuestionOrder: vi.fn(() => []),
  validateAbTestProgress: vi.fn(() => ({ resumable: true })),
}))

vi.mock('./abTest.progress.js', () => ({
  loadAbTestProgress: loadAbTestProgressMock,
  saveAbTestProgress: vi.fn(),
}))

vi.mock('./abTest.views.js', () => ({
  renderCurrentView: vi.fn(),
  formatAbTestTelegramCard: vi.fn(),
  sendQuestionDirect: vi.fn(),
  splitTelegramContentBlocks: vi.fn(),
  sendTelegramContentChunk: vi.fn(),
}))

vi.mock('./abTest.callback.js', () => ({
  parseAbTestCallback: parseAbTestCallbackMock,
  logCallbackReceived: logCallbackReceivedMock,
  logCallbackHandled: logCallbackHandledMock,
  logAbTestStartDebug: logAbTestStartDebugMock,
  logFlowStart: vi.fn(),
  logFlowResume: vi.fn(),
  logFlowRender: vi.fn(),
  logMessageSent: vi.fn(),
  resolveContextUserId: resolveContextUserIdMock,
}))

vi.mock('./abTest.analytics.js', () => ({
  trackAbTestEvent: vi.fn(),
}))

vi.mock('./abTest.scheduler.js', () => ({
  scheduleFollowups: vi.fn(),
}))

vi.mock('../../../core/transport/telegramTransport.js', () => ({
  deliverTelegramFlow: vi.fn(),
}))

vi.mock('@/products/absystem/config/absystem.content.js', () => ({
  absystemButtons: {},
  absystemContent: {
    START_BLOCK1: { MSG1: '' },
  },
}))

vi.mock('../../../modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({
  planMessage: vi.fn(),
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {},
}))

vi.mock('./abTest.handlers.core.js', () => ({
  handleAbTestAnswer: vi.fn(),
  handleAbTestRestart: vi.fn(),
  handleShowResult: handleShowResultMock,
  handleSkipEmail: vi.fn(),
  handleConfirmEmail: vi.fn(),
  handleChangeEmail: vi.fn(),
  handleShowInside: vi.fn(),
  handleTestDrive: vi.fn(),
}))

vi.mock('./abTest.handlers.ui.js', () => ({
  handleAbTestStart: vi.fn(),
  handleRestore: vi.fn(),
  handleMenu: vi.fn(),
  handleSubscription: vi.fn(),
  handleEdit: vi.fn(),
  handleOpenFaq: vi.fn(),
  handleFaqItem: vi.fn(async () => false),
  handleFocusInfo: vi.fn(),
  handlePlayAudio: vi.fn(),
  handleQ1Direct: vi.fn(),
  handleStartWheel: vi.fn(),
}))

vi.mock('./abTest.flows.js', () => ({
  handleAbTestEmailCaptureText: vi.fn(),
  resolveFocusShortcutCallback: resolveFocusShortcutCallbackMock,
  handleFocusPaymentAction: vi.fn(),
  handleResendFocusBlock12: vi.fn(),
  handleFocusPaymentIssue: vi.fn(),
}))

vi.mock('@/modules/telegram-mentor/core/advertisingGuard.js', () => ({
  canSendAdvertising: vi.fn(),
}))

vi.mock('../content/abTest.results.js', () => ({
  BLOCK9_POST_RESULT: {},
}))

import { handleAbTestCallback } from './abTest.service.js'

function createCtx(userId: string | null = null) {
  return {
    chat: { id: 42 },
    from: { id: 99 },
    state: { userId },
    answerCbQuery: vi.fn(async () => undefined),
  }
}

describe('handleAbTestCallback show_result user recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseAbTestCallbackMock.mockReturnValue({ kind: 'show_result' })
    loadAbTestProgressMock.mockResolvedValue({
      stage: 'S1_TEST_STARTED',
      status: 'idle',
      answers: [],
    })
    resolveFocusShortcutCallbackMock.mockResolvedValue(false)
    handleShowResultMock.mockResolvedValue(true)
  })

  it('uses ctx.state.userId directly when present', async () => {
    const ctx = createCtx('user-1')

    const handled = await handleAbTestCallback(ctx as never, 'ab_test:show_result')

    expect(handled).toBe(true)
    expect(resolveContextUserIdMock).not.toHaveBeenCalled()
    expect(handleShowResultMock).toHaveBeenCalledTimes(1)
    expect(handleShowResultMock).toHaveBeenCalledWith(ctx, 'user-1')
  })

  it('recovers userId from identity when ctx.state.userId is absent', async () => {
    const ctx = createCtx(null)
    resolveContextUserIdMock.mockResolvedValue('user-2')

    const handled = await handleAbTestCallback(ctx as never, 'ab_test:show_result')

    expect(handled).toBe(true)
    expect(resolveContextUserIdMock).toHaveBeenCalledTimes(1)
    expect(handleShowResultMock).toHaveBeenCalledTimes(1)
    expect(handleShowResultMock).toHaveBeenCalledWith(ctx, 'user-2')
    expect(ctx.state.userId).toBe('user-2')
  })

  it('answers with a controlled error when identity is missing', async () => {
    const ctx = createCtx(null)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resolveContextUserIdMock.mockResolvedValue(null)

    const handled = await handleAbTestCallback(ctx as never, 'ab_test:show_result')

    expect(handled).toBe(true)
    expect(handleShowResultMock).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Не вдалося відкрити результат. Спробуй ще раз.')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[AB_TEST_CALLBACK_MISSING_USER_ID]', {
      action: 'ab_test:show_result',
      chatId: '42',
      fromId: '99',
    })
    expect(logCallbackHandledMock).toHaveBeenCalledWith({
      action: 'ab_test:show_result',
      handled: true,
      reason: 'missing_user_id',
    })

    consoleErrorSpy.mockRestore()
  })
})

describe('handleAbTestCallback focus payment user recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseAbTestCallbackMock.mockReturnValue(null)
    loadAbTestProgressMock.mockResolvedValue({
      stage: 'S1_TEST_STARTED',
      status: 'idle',
      answers: [],
    })
    resolveFocusShortcutCallbackMock.mockResolvedValue(false)
  })

  it('answers with a controlled error when focus payment user identity is missing', async () => {
    const ctx = createCtx(null)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    resolveContextUserIdMock.mockResolvedValue(null)

    const handled = await handleAbTestCallback(ctx as never, 'open_focus_payment')

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Не вдалося відкрити ФОКУС. Спробуй ще раз.')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[AB_TEST_CALLBACK_MISSING_USER_ID]', {
      action: 'open_focus_payment',
      chatId: '42',
      fromId: '99',
    })
    expect(logCallbackHandledMock).toHaveBeenCalledWith({
      action: 'open_focus_payment',
      handled: true,
      reason: 'missing_user_id',
    })

    consoleErrorSpy.mockRestore()
  })
})
