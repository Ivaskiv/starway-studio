import { beforeEach, describe, expect, it, vi } from 'vitest'

const onTestCompletedMock = vi.fn()
const userUpdateMock = vi.fn()
const userFindUniqueMock = vi.fn()
const loadAbTestProgressMock = vi.fn()
const saveAbTestProgressMock = vi.fn()
const persistCanonicalCompletedAbTestProgressMock = vi.fn()
const getServerUserMock = vi.fn()

vi.mock('../../../db/client.ts', () => ({
  prisma: {
    user: {
      update: userUpdateMock,
      findUnique: userFindUniqueMock,
    },
  },
}))

vi.mock('../../../core/orchestrator/testOrchestrator.ts', () => ({
  testOrchestrator: {
    onTestCompleted: onTestCompletedMock,
  },
}))

vi.mock('../../../products/ab-system/content/abTest.questions.ts', () => ({
  AB_TEST_QUESTION_ORDER: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
  getAbTestQuestion: vi.fn((questionId: string) => ({
    question_id: questionId,
    prompt: `Prompt ${questionId}`,
    behavioral_type: 'ACTION',
    next_question_id: null,
    answers: [
      {
        id: 'action',
        text: 'Action',
      },
    ],
  })),
  getAbTestAnswer: vi.fn((questionId: string, answerId: string) => ({
    id: answerId,
    text: `Answer ${questionId}`,
    score: 5,
    category: 'action',
  })),
}))

vi.mock('../../../products/ab-system/telegram/progress.ts', () => ({
  getAbTestProgressFromUiSettings: vi.fn(),
  loadAbTestProgress: (...args: unknown[]) => loadAbTestProgressMock(...args),
  loadUserUiSettings: vi.fn(),
  saveAbTestProgress: (...args: unknown[]) => saveAbTestProgressMock(...args),
}))

vi.mock('../../../products/ab-system/telegram/handler.ts', () => ({
  persistCanonicalCompletedAbTestProgress: (...args: unknown[]) =>
    persistCanonicalCompletedAbTestProgressMock(...args),
}))

vi.mock('../../../core/state-machine/testFoundation.ts', () => ({
  resolveCanonicalTestResult: vi.fn(() => ({
    type: 'ACTION',
    dominantScore: 12,
    categoryBreakdown: {
      state: 1,
      goal: 2,
      choice: 2,
      decision: 3,
      action: 4,
    },
  })),
}))

vi.mock('../../../core/behavioral/buildBehavioralNarrative.ts', () => ({
  buildBehavioralNarrative: vi.fn(() => 'narrative'),
}))

vi.mock('../../../core/behavioral/behavioralSnapshot.ts', () => ({
  buildBehavioralSnapshot: vi.fn(() => ({ snapshot: true })),
}))

vi.mock('../../users/runtime/resolveUserLifecycle.ts', () => ({
  resolveUserLifecycle: vi.fn(() => ({ value: 'TEST_DONE' })),
}))

vi.mock('../../auth/server-user.ts', () => ({
  getServerUser: (...args: unknown[]) => getServerUserMock(...args),
}))

describe('persistTestOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_ACCESS_SECRET = 'test-access-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    onTestCompletedMock.mockResolvedValue(undefined)
    userUpdateMock.mockResolvedValue({})
    userFindUniqueMock.mockResolvedValue(null)
    loadAbTestProgressMock.mockResolvedValue({
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      revision: 4,
      questions_shown: ['q1'],
      answers: [],
      result_key: null,
      current_question_id: 'q2',
      flow_state: 'QUESTIONS',
      last_callback_key: null,
      last_message_key: null,
      last_event_at: null,
    })
    saveAbTestProgressMock.mockResolvedValue(undefined)
    persistCanonicalCompletedAbTestProgressMock.mockResolvedValue({
      progress: {
        status: 'completed',
        stage: 'S3_TEST_RESULT',
        result_key: 'action',
      },
      resultKey: 'action',
    })
    getServerUserMock.mockResolvedValue(null)
  })

  it('persists canonical test completion before resetting the onboarding step', async () => {
    const { persistTestOutcome } = await import('../routes.ts')

    await persistTestOutcome('user-1', {
      type: 'DECISION',
      dominantScore: 12,
      categoryBreakdown: {
        state: 1,
        goal: 2,
        choice: 3,
        decision: 4,
        action: 2,
      },
    })

    expect(onTestCompletedMock).toHaveBeenCalledWith('user-1', 'DECISION')
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        currentStep: 'START_FLOW',
      },
    })
  })

  it('delegates completed submit persistence to the canonical AB owner', async () => {
    const { default: router } = await import('../routes.ts')
    const submitLayer = (router as any).stack.find(
      (layer: any) => layer.route?.path === '/submit'
    )
    const submitHandler = submitLayer.route.stack.at(-1).handle
    const req = {
      body: {
        answers: [
          { questionId: 'q1', answerId: 'action' },
          { questionId: 'q2', answerId: 'action' },
          { questionId: 'q3', answerId: 'action' },
          { questionId: 'q4', answerId: 'action' },
          { questionId: 'q5', answerId: 'action' },
          { questionId: 'q6', answerId: 'action' },
          { questionId: 'q7', answerId: 'action' },
          { questionId: 'q8', answerId: 'action' },
        ],
      },
      user: { id: 'user-1' },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any

    await submitHandler(req, res)

    expect(persistCanonicalCompletedAbTestProgressMock).toHaveBeenCalledTimes(1)
    expect(persistCanonicalCompletedAbTestProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        progress: expect.objectContaining({
          status: 'active',
          stage: 'S2_TEST_QUESTIONS',
        }),
        answers: expect.arrayContaining([
          expect.objectContaining({ question_id: 'q1', answer_id: 'action' }),
          expect.objectContaining({ question_id: 'q8', answer_id: 'action' }),
        ]),
        questionsShown: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
        lastCallbackKey: 'web:ab_test_submit',
      }),
    )
    expect(saveAbTestProgressMock).not.toHaveBeenCalled()
  })
})
