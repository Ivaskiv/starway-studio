import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  parseAbTestCallbackMock,
  resolveContextUserIdMock,
  claimAbTestCallbackInteractionMock,
  logCallbackReceivedMock,
  logCallbackHandledMock,
  logAbTestStartDebugMock,
  loadAbTestProgressMock,
  handleShowResultMock,
  handleShowInsideMock,
  handleTestDriveMock,
  resolveFocusShortcutCallbackMock,
} = vi.hoisted(() => ({
  parseAbTestCallbackMock: vi.fn(),
  resolveContextUserIdMock: vi.fn(),
  claimAbTestCallbackInteractionMock: vi.fn(),
  logCallbackReceivedMock: vi.fn(),
  logCallbackHandledMock: vi.fn(),
  logAbTestStartDebugMock: vi.fn(),
  loadAbTestProgressMock: vi.fn(),
  handleShowResultMock: vi.fn(),
  handleShowInsideMock: vi.fn(),
  handleTestDriveMock: vi.fn(),
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
  claimAbTestCallbackInteraction: claimAbTestCallbackInteractionMock,
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
  handleShowInside: handleShowInsideMock,
  handleTestDrive: handleTestDriveMock,
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
    claimAbTestCallbackInteractionMock.mockResolvedValue(true)
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
    claimAbTestCallbackInteractionMock.mockResolvedValue(true)
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

describe('handleAbTestCallback completed test-drive routing and dedupe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveFocusShortcutCallbackMock.mockResolvedValue(false)
    claimAbTestCallbackInteractionMock.mockResolvedValue(true)
    handleShowInsideMock.mockResolvedValue(true)
    handleTestDriveMock.mockResolvedValue(true)
    parseAbTestCallbackMock.mockReturnValue({ kind: 'test_drive' })
    loadAbTestProgressMock.mockResolvedValue({
      stage: 'S3_TEST_RESULT',
      status: 'completed',
      result_key: 'state',
      answers: [{ question_id: 'q1', answer_id: 'state' }],
    })
  })

  it('routes legacy test_drive from a completed result to canonical show_inside without restarting q1', async () => {
    const ctx = createCtx(null)
    resolveContextUserIdMock.mockResolvedValue('user-7')

    const handled = await handleAbTestCallback(ctx as never, 'ab_test:test_drive')

    expect(handled).toBe(true)
    expect(resolveContextUserIdMock).toHaveBeenCalledTimes(1)
    expect(handleShowInsideMock).toHaveBeenCalledTimes(1)
    expect(handleShowInsideMock).toHaveBeenCalledWith(ctx, 'user-7', 'state')
    expect(handleTestDriveMock).not.toHaveBeenCalled()
    expect(ctx.state.userId).toBe('user-7')
  })

  it('dedupes repeated non-conversion callback clicks with ack/no-op', async () => {
    const ctx = createCtx('user-7')
    parseAbTestCallbackMock.mockReturnValue({ kind: 'show_inside', resultKey: 'state' })
    claimAbTestCallbackInteractionMock.mockResolvedValue(false)

    const handled = await handleAbTestCallback(ctx as never, 'show_inside_STATE')

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(handleShowInsideMock).not.toHaveBeenCalled()
    expect(logCallbackHandledMock).toHaveBeenCalledWith({
      action: 'show_inside_STATE',
      handled: true,
      reason: 'duplicate_callback_deduped',
      userId: 'user-7',
    })
  })

  it.each([
    ['show_inside_STATE', 'state'],
    ['show_inside_GOAL', 'goal'],
    ['show_inside_CHOICE', 'choice'],
    ['show_inside_DECISION', 'decision'],
    ['show_inside_ACTION', 'action'],
  ] as const)('routes %s directly to its own inside surface', async (action, resultKey) => {
    const ctx = createCtx('user-7')

    const handled = await handleAbTestCallback(ctx as never, action)

    expect(handled).toBe(true)
    expect(handleShowInsideMock).toHaveBeenCalledTimes(1)
    expect(handleShowInsideMock).toHaveBeenCalledWith(ctx, 'user-7', resultKey)
    expect(parseAbTestCallbackMock).not.toHaveBeenCalled()
    expect(loadAbTestProgressMock).not.toHaveBeenCalled()
  })

  it('does not dedupe payment callbacks through the generic guard', async () => {
    const ctx = createCtx('user-7')
    parseAbTestCallbackMock.mockReturnValue(null)
    claimAbTestCallbackInteractionMock.mockResolvedValue(false)

    const handled = await handleAbTestCallback(ctx as never, 'open_focus_payment')

    expect(Boolean(handled)).toBe(false)
    expect(claimAbTestCallbackInteractionMock).not.toHaveBeenCalled()
  })
})
