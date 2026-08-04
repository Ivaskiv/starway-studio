import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AbTestProgress } from '../../../core/state-machine/abTestFoundation.js'
import { normalizeAbTestProgress } from '../../../core/state-machine/abTestFoundation.js'

let storedProgress: AbTestProgress

const mockSaveAbTestProgress = vi.fn()
const mockSendQuestionDirect = vi.fn()
const mockRenderCurrentView = vi.fn()
const mockRenderAbTestEmailGate = vi.fn()
const mockTrackAbTestEvent = vi.fn()
const mockScheduleFollowups = vi.fn()
const mockOnTestCompleted = vi.fn()
const mockRecordTestStart = vi.fn()
const mockStartAbTestFlow = vi.fn()
const mockUserUpdate = vi.fn()
const mockNotificationJobUpdateMany = vi.fn()
const mockClearPendingTelegramIdentity = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    notificationJob: {
      updateMany: (...args: unknown[]) => mockNotificationJobUpdateMany(...args),
    },
  },
}))

vi.mock('./abTest.progress.js', () => ({
  loadAbTestProgress: vi.fn(async () => storedProgress),
  saveAbTestProgress: (...args: unknown[]) => mockSaveAbTestProgress(...args),
  getAbTestProfileEmail: vi.fn(async () => null),
  ensureAbTestEmailCapturedFromProfile: vi.fn(async (_userId: string, progress: AbTestProgress) => progress),
}))

vi.mock('./abTest.views.js', () => ({
  renderCurrentView: (...args: unknown[]) => mockRenderCurrentView(...args),
  renderAbTestPostEmailSubmitSequence: vi.fn(),
  renderAbTestEmailGate: (...args: unknown[]) => mockRenderAbTestEmailGate(...args),
  resolveFirstName: vi.fn(() => 'Тест'),
}))

vi.mock('./abTest.analytics.js', () => ({
  trackAbTestEvent: (...args: unknown[]) => mockTrackAbTestEvent(...args),
}))

vi.mock('./abTest.scheduler.js', () => ({
  scheduleFollowups: (...args: unknown[]) => mockScheduleFollowups(...args),
}))

vi.mock('./abTest.callback.js', () => ({
  deactivateCallbackMarkup: vi.fn(),
  logAbTestStartDebug: vi.fn(),
  logCallbackHandled: vi.fn(),
  formatMobileAnswerButtonText: vi.fn((value: string) => value),
  resolveQuestionLatency: vi.fn(() => 1000),
}))

vi.mock('../../../modules/telegram-mentor/services/pendingIdentity.service.js', () => ({
  clearPendingTelegramIdentity: (...args: unknown[]) => mockClearPendingTelegramIdentity(...args),
}))

vi.mock('../../../modules/telegram-mentor/conversation/delivery/planDelivery.js', () => ({
  planAck: vi.fn(async () => undefined),
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {
    recordTestStart: (...args: unknown[]) => mockRecordTestStart(...args),
    onTestCompleted: (...args: unknown[]) => mockOnTestCompleted(...args),
  },
}))

vi.mock('./abTest.service.js', () => ({
  startAbTestFlow: (...args: unknown[]) => mockStartAbTestFlow(...args),
}))

vi.mock('./abTest.views.js', async () => {
  const actual = await vi.importActual<typeof import('./abTest.views.js')>('./abTest.views.js')
  return {
    ...actual,
    renderCurrentView: (...args: unknown[]) => mockRenderCurrentView(...args),
    renderAbTestPostEmailSubmitSequence: vi.fn(),
    renderAbTestEmailGate: (...args: unknown[]) => mockRenderAbTestEmailGate(...args),
    resolveFirstName: vi.fn(() => 'Тест'),
    sendQuestionDirect: (...args: unknown[]) => mockSendQuestionDirect(...args),
  }
})

import { handleAbTestAnswer } from './abTest.handlers.core.js'
import { handleAbTestStart } from './abTest.handlers.ui.js'
import { handleAbTestRestart } from './abTest.handlers.core.js'

function createCtx() {
  return {
    chat: { id: 42 },
    from: { id: 42 },
    update: { update_id: 4242 },
    callbackQuery: {
      id: 'cb-1',
      data: 'ab_test:start',
      message: {
        chat: { id: 42 },
        message_id: 7,
      },
    },
    telegram: {
      editMessageReplyMarkup: vi.fn(async () => undefined),
    },
    answerCbQuery: vi.fn(async () => undefined),
  } as any
}

describe('ab test new user completion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storedProgress = normalizeAbTestProgress(undefined)
    mockSaveAbTestProgress.mockImplementation(async (_userId: string, progress: AbTestProgress) => {
      storedProgress = progress
      return progress
    })
    mockScheduleFollowups.mockImplementation(async (_userId: string, progress: AbTestProgress) => progress)
    mockRecordTestStart.mockResolvedValue(undefined)
    mockOnTestCompleted.mockResolvedValue(undefined)
    mockSendQuestionDirect.mockResolvedValue(undefined)
    mockRenderCurrentView.mockResolvedValue(undefined)
    mockRenderAbTestEmailGate.mockResolvedValue(undefined)
    mockTrackAbTestEvent.mockResolvedValue(undefined)
    mockStartAbTestFlow.mockResolvedValue(undefined)
    mockUserUpdate.mockResolvedValue(undefined)
    mockNotificationJobUpdateMany.mockResolvedValue(undefined)
    mockClearPendingTelegramIdentity.mockResolvedValue(undefined)
  })

  it('runs Q1..Q8 once, persists a completed result, and ignores a duplicate final callback', async () => {
    const ctx = createCtx()

    const started = await handleAbTestStart(ctx, 'user-1')

    expect(started).toBe(true)
    expect(storedProgress.status).toBe('active')
    expect(storedProgress.stage).toBe('S2_TEST_QUESTIONS')
    expect(storedProgress.current_question_id).toBe('q1')
    expect(storedProgress.revision).toBe(1)

    const answers = [
      { questionId: 'q1', answerId: 'action' },
      { questionId: 'q2', answerId: 'action' },
      { questionId: 'q3', answerId: 'action' },
      { questionId: 'q4', answerId: 'action' },
      { questionId: 'q5', answerId: 'action' },
      { questionId: 'q6', answerId: 'action' },
      { questionId: 'q7', answerId: 'action' },
      { questionId: 'q8', answerId: 'action' },
    ] as const

    for (const answer of answers) {
      const revision = storedProgress.revision
      ctx.callbackQuery.data = `ab_test_answer:${answer.questionId}:${answer.answerId}:${revision}`

      const handled = await handleAbTestAnswer(ctx, 'user-1', {
        kind: 'answer',
        questionId: answer.questionId,
        answerId: answer.answerId,
        revision,
      })

      expect(handled).toBe(true)
    }

    expect(storedProgress.status).toBe('completed')
    expect(storedProgress.stage).toBe('S3_TEST_RESULT')
    expect(storedProgress.answers).toHaveLength(8)
    expect(storedProgress.result_key).toBe('action')
    expect(storedProgress.email_stage).toBe('pending')
    expect(storedProgress.current_question_id).toBeNull()
    expect(mockOnTestCompleted).toHaveBeenCalledTimes(1)
    expect(mockOnTestCompleted).toHaveBeenCalledWith(
      'user-1',
      'action',
      null,
      expect.objectContaining({
        startedAt: expect.any(Date),
      }),
    )

    const completedSnapshot = storedProgress
    const duplicateRevision = answers.length
    ctx.callbackQuery.data = `ab_test_answer:q8:action:${duplicateRevision}`

    const duplicateHandled = await handleAbTestAnswer(ctx, 'user-1', {
      kind: 'answer',
      questionId: 'q8',
      answerId: 'action',
      revision: duplicateRevision,
    })

    expect(duplicateHandled).toBe(true)
    expect(mockOnTestCompleted).toHaveBeenCalledTimes(1)
    expect(storedProgress).toEqual(completedSnapshot)
    expect(mockRenderCurrentView).toHaveBeenCalledTimes(1)
  })

  it('ignores a duplicate q1 callback after the first answer has already advanced the flow', async () => {
    const ctx = createCtx()

    const started = await handleAbTestStart(ctx, 'user-1')

    expect(started).toBe(true)
    expect(storedProgress.status).toBe('active')
    expect(storedProgress.current_question_id).toBe('q1')
    expect(storedProgress.revision).toBe(1)

    const firstRevision = storedProgress.revision
    ctx.callbackQuery.data = `ab_test_answer:q1:action:${firstRevision}`

    const firstHandled = await handleAbTestAnswer(ctx, 'user-1', {
      kind: 'answer',
      questionId: 'q1',
      answerId: 'action',
      revision: firstRevision,
    })

    expect(firstHandled).toBe(true)
    expect(storedProgress.answers).toHaveLength(1)
    expect(storedProgress.answers[0]?.question_id).toBe('q1')
    expect(storedProgress.current_question_id).toBe('q2')
    expect(mockSendQuestionDirect).toHaveBeenCalledTimes(2)
    expect(mockSendQuestionDirect).toHaveBeenLastCalledWith(ctx, 'q2', storedProgress.revision)

    const progressedSnapshot = structuredClone(storedProgress)
    ctx.callbackQuery.data = `ab_test_answer:q1:action:${firstRevision}`

    const duplicateHandled = await handleAbTestAnswer(ctx, 'user-1', {
      kind: 'answer',
      questionId: 'q1',
      answerId: 'action',
      revision: firstRevision,
    })

    expect(duplicateHandled).toBe(true)
    expect(storedProgress).toEqual(progressedSnapshot)
    expect(mockSendQuestionDirect).toHaveBeenCalledTimes(2)
    expect(mockRenderCurrentView).toHaveBeenCalledTimes(1)
  })

  it('retake clears only test progress, preserves external entities, and restarts from Q1', async () => {
    const ctx = createCtx()
    storedProgress = normalizeAbTestProgress({
      status: 'completed',
      stage: 'S3_TEST_RESULT',
      current_question_id: null,
      result_key: 'action',
      result_opened_at: '2026-08-03T09:00:00.000Z',
      answers: [
        {
          question_id: 'q1',
          answer_id: 'action',
          answered_at: '2026-08-03T08:00:00.000Z',
        },
      ],
      revision: 8,
      focus_opened_at: '2026-08-03T09:30:00.000Z',
      payment_started_at: '2026-08-03T09:40:00.000Z',
      zoom_registered_at: '2026-08-03T09:50:00.000Z',
    } as Partial<AbTestProgress>)

    const handled = await handleAbTestRestart(ctx, 'user-1')

    expect(handled).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          lifecycleState: 'TEST_IN_PROGRESS',
          testStartedAt: expect.any(Date),
        }),
      }),
    )
    expect(mockNotificationJobUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockClearPendingTelegramIdentity).toHaveBeenCalledWith('42')
    expect(storedProgress.answers).toEqual([])
    expect(storedProgress.result_key).toBeNull()
    expect(storedProgress.current_question_id).toBeNull()
    expect(storedProgress.zoom_registered_at).toBeNull()
    expect(mockStartAbTestFlow).toHaveBeenCalledWith(ctx, 'user-1', 'ab_test:restart')
  })

  it('retake is idempotent when repeated and keeps using the canonical restart flow', async () => {
    const ctx = createCtx()
    storedProgress = normalizeAbTestProgress({
      status: 'completed',
      stage: 'S3_TEST_RESULT',
      result_key: 'action',
      answers: [],
      revision: 9,
    } as Partial<AbTestProgress>)

    await handleAbTestRestart(ctx, 'user-1')
    const firstSnapshot = structuredClone(storedProgress)
    await handleAbTestRestart(ctx, 'user-1')

    expect(storedProgress).toEqual(firstSnapshot)
    expect(mockStartAbTestFlow).toHaveBeenCalledTimes(2)
  })
})
