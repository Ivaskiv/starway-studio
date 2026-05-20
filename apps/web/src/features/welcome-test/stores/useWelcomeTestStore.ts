import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  TestStatus,
  WelcomeTestAnswerMap,
  WelcomeTestError,
  WelcomeTestLatencyMap,
  WelcomeTestServerState,
  WelcomeTestSnapshot,
} from '@/features/welcome-test/types/welcomeTest.types'
import {
  WELCOME_TEST_QUESTION_ORDER,
  type WelcomeTestQuestionId,
} from '@/features/welcome-test/types/welcomeTest.types'

const STORAGE_KEY = 'welcome_test_state_v1'

const PAYMENT_STATUSES = new Set<TestStatus>(['PAYMENT_PENDING', 'PAID'])

type WelcomeTestStoreState = {
  initialized: boolean
  loading: boolean
  recovering: boolean
  syncing: boolean
  submitting: boolean
  status: TestStatus
  currentQuestion: string | null
  answersMap: WelcomeTestAnswerMap
  latencyMap: WelcomeTestLatencyMap
  result: string | null
  sessionId: string | null
  lastRequestId: string | null
  startedAt: number | null
  questionStartedAt: number | null
  lastSyncedAt: number | null
  error: WelcomeTestError | null
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setRecovering: (value: boolean) => void
  setSyncing: (value: boolean) => void
  setSubmitting: (value: boolean) => void
  setSessionId: (sessionId: string | null) => void
  setLastRequestId: (requestId: string | null) => void
  setQuestionStartedAt: (value: number | null) => void
  setError: (error: WelcomeTestError | null) => void
  clearError: () => void
  beginTest: (sessionId: string) => void
  createSnapshot: () => WelcomeTestSnapshot
  applySnapshot: (snapshot: WelcomeTestSnapshot) => void
  applyOptimisticAnswer: (input: {
    questionId: string
    answerId: string
    latencyMs: number | null
  }) => void
  applyServerState: (server: WelcomeTestServerState) => void
  markPaymentPending: () => void
  markPaid: () => void
  resetFlow: () => void
}

function getQuestionIdAtIndex(index: number): string | null {
  if (index < 0 || index >= WELCOME_TEST_QUESTION_ORDER.length) {
    return null
  }
  return WELCOME_TEST_QUESTION_ORDER[index] ?? null
}

function mapServerStatus(status: WelcomeTestServerState['status']): TestStatus {
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

function buildAnswersMap(
  answeredQuestions: WelcomeTestServerState['answeredQuestions']
): WelcomeTestAnswerMap {
  return answeredQuestions.reduce<WelcomeTestAnswerMap>((acc, item) => {
    if (item.questionId && item.answerId) {
      acc[item.questionId] = item.answerId
    }
    return acc
  }, {})
}

function resolveCurrentQuestion(
  server: WelcomeTestServerState,
  answersMap: WelcomeTestAnswerMap
): string | null {
  if (server.status === 'COMPLETED') {
    return null
  }

  const expected = getQuestionIdAtIndex(server.currentQuestionIndex)
  if (expected) return expected

  const answeredCount = Object.keys(answersMap).length
  return getQuestionIdAtIndex(answeredCount)
}

const initialState = {
  initialized: false,
  loading: false,
  recovering: false,
  syncing: false,
  submitting: false,
  status: 'NOT_STARTED' as TestStatus,
  currentQuestion: null as string | null,
  answersMap: {} as WelcomeTestAnswerMap,
  latencyMap: {} as WelcomeTestLatencyMap,
  result: null as string | null,
  sessionId: null as string | null,
  lastRequestId: null as string | null,
  startedAt: null as number | null,
  questionStartedAt: null as number | null,
  lastSyncedAt: null as number | null,
  error: null as WelcomeTestError | null,
}

export const useWelcomeTestStore = create<WelcomeTestStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setInitialized: (value) => set({ initialized: value }),
      setLoading: (value) => set({ loading: value }),
      setRecovering: (value) => set({ recovering: value }),
      setSyncing: (value) => set({ syncing: value }),
      setSubmitting: (value) => set({ submitting: value }),
      setSessionId: (sessionId) => set({ sessionId }),
      setLastRequestId: (requestId) => set({ lastRequestId: requestId }),
      setQuestionStartedAt: (value) => set({ questionStartedAt: value }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      beginTest: (sessionId) =>
        set((state) => ({
          sessionId,
          status: state.status === 'NOT_STARTED' ? 'IN_PROGRESS' : state.status,
          startedAt: state.startedAt ?? Date.now(),
          questionStartedAt: Date.now(),
          currentQuestion:
            state.currentQuestion ?? getQuestionIdAtIndex(0),
        })),

      createSnapshot: () => {
        const state = get()
        return {
          status: state.status,
          answersMap: { ...state.answersMap },
          latencyMap: { ...state.latencyMap },
          result: state.result,
          currentQuestion: state.currentQuestion,
          questionStartedAt: state.questionStartedAt,
        }
      },

      applySnapshot: (snapshot) =>
        set({
          status: snapshot.status,
          answersMap: { ...snapshot.answersMap },
          latencyMap: { ...snapshot.latencyMap },
          result: snapshot.result,
          currentQuestion: snapshot.currentQuestion,
          questionStartedAt: snapshot.questionStartedAt,
        }),

      applyOptimisticAnswer: ({ questionId, answerId, latencyMs }) =>
        set((state) => {
          const answersMap = {
            ...state.answersMap,
            [questionId]: answerId,
          }
          const latencyMap =
            latencyMs == null
              ? state.latencyMap
              : {
                  ...state.latencyMap,
                  [questionId]: latencyMs,
                }

          const answeredCount = WELCOME_TEST_QUESTION_ORDER.filter(
            (id) => answersMap[id]
          ).length
          const isComplete = answeredCount >= WELCOME_TEST_QUESTION_ORDER.length
          const nextQuestion = isComplete
            ? null
            : getQuestionIdAtIndex(answeredCount)

          return {
            answersMap,
            latencyMap,
            status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
            currentQuestion: nextQuestion,
            result: isComplete ? state.result : null,
            questionStartedAt: nextQuestion ? Date.now() : null,
          }
        }),

      applyServerState: (server) =>
        set((state) => {
          const answersMap = buildAnswersMap(server.answeredQuestions)
          const mappedStatus = mapServerStatus(server.status)
          const preservePayment =
            PAYMENT_STATUSES.has(state.status) && mappedStatus !== 'COMPLETED'

          const nextStatus = preservePayment ? state.status : mappedStatus
          const currentQuestion = resolveCurrentQuestion(server, answersMap)

          return {
            answersMap,
            status: nextStatus,
            result: server.result ?? (mappedStatus === 'COMPLETED' ? state.result : null),
            currentQuestion,
            lastSyncedAt: Date.now(),
            questionStartedAt:
              currentQuestion && !preservePayment
                ? Date.now()
                : state.questionStartedAt,
            startedAt: state.startedAt ?? Date.now(),
          }
        }),

      markPaymentPending: () =>
        set((state) => ({
          status:
            state.status === 'COMPLETED' ? 'PAYMENT_PENDING' : state.status,
        })),

      markPaid: () =>
        set((state) => ({
          status: state.status === 'PAYMENT_PENDING' || state.status === 'COMPLETED'
            ? 'PAID'
            : state.status,
        })),

      resetFlow: () =>
        set({
          ...initialState,
          initialized: true,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        sessionId: state.sessionId,
        status: state.status,
        answersMap: state.answersMap,
        latencyMap: state.latencyMap,
        result: state.result,
        currentQuestion: state.currentQuestion,
        startedAt: state.startedAt,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => (state, rehydrateError) => {
        if (rehydrateError || !state) return
        state.setInitialized(true)
      },
    }
  )
)

export function getWelcomeTestQuestionId(index: number): WelcomeTestQuestionId | null {
  return getQuestionIdAtIndex(index) as WelcomeTestQuestionId | null
}

export const useWelcomeTestStatus = () => useWelcomeTestStore((s) => s.status)
export const useWelcomeTestAnswers = () => useWelcomeTestStore((s) => s.answersMap)
