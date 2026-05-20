import { useCallback, useEffect, useRef } from 'react'

import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import {
  fetchWelcomeTestState,
  submitWelcomeTestAnswer,
} from '@/features/welcome-test/services/welcomeTest.api'
import { useWelcomeTestStore } from '@/features/welcome-test/stores/useWelcomeTestStore'
import type { WelcomeTestError } from '@/features/welcome-test/types/welcomeTest.types'
import { trackEvent } from '@/features/welcome-test/utils/analytics'
import { mapWelcomeTestError } from '@/features/welcome-test/utils/errorMapper'
import { getLatencyMs } from '@/features/welcome-test/utils/latency'
import {
  RequestGuard,
  SubmitLock,
  createRequestId,
} from '@/features/welcome-test/utils/requestGuard'

type UseWelcomeTestOptions = {
  linkToken?: string | null
  autoSync?: boolean
}

const submitLock = new SubmitLock()
const syncGuard = new RequestGuard()
const submitGuard = new RequestGuard()

export function useWelcomeTest(options: UseWelcomeTestOptions = {}) {
  const { linkToken: linkTokenOption, autoSync = true } = options
  const { canRunProtectedQueries, restoreSession } = useSessionOrchestrator()

  const initialized = useWelcomeTestStore((s) => s.initialized)
  const loading = useWelcomeTestStore((s) => s.loading)
  const recovering = useWelcomeTestStore((s) => s.recovering)
  const syncing = useWelcomeTestStore((s) => s.syncing)
  const submitting = useWelcomeTestStore((s) => s.submitting)
  const status = useWelcomeTestStore((s) => s.status)
  const currentQuestion = useWelcomeTestStore((s) => s.currentQuestion)
  const answersMap = useWelcomeTestStore((s) => s.answersMap)
  const latencyMap = useWelcomeTestStore((s) => s.latencyMap)
  const result = useWelcomeTestStore((s) => s.result)
  const sessionIdFromStore = useWelcomeTestStore((s) => s.sessionId)
  const startedAt = useWelcomeTestStore((s) => s.startedAt)
  const questionStartedAt = useWelcomeTestStore((s) => s.questionStartedAt)
  const lastSyncedAt = useWelcomeTestStore((s) => s.lastSyncedAt)
  const error = useWelcomeTestStore((s) => s.error)
  const markPaymentPending = useWelcomeTestStore((s) => s.markPaymentPending)
  const markPaid = useWelcomeTestStore((s) => s.markPaid)
  const resetFlow = useWelcomeTestStore((s) => s.resetFlow)
  const clearError = useWelcomeTestStore((s) => s.clearError)

  const syncAttemptRef = useRef(0)
  const activeSubmitRequestIdRef = useRef<string | null>(null)
  const sessionId = sessionIdFromStore ?? linkTokenOption ?? null

  const syncFromBackend = useCallback(
    async (token: string, reason: 'init' | 'recover' | 'reconcile' = 'reconcile') => {
      const { setSyncing, clearError, applyServerState, setError, submitting: isSubmitting } =
        useWelcomeTestStore.getState()

      if (isSubmitting) return false

      setSyncing(true)
      clearError()

      const signal = syncGuard.begin()
      const attempt = ++syncAttemptRef.current

      try {
        if (!canRunProtectedQueries) {
          await restoreSession('manual')
        }

        const serverState = await fetchWelcomeTestState(token, signal)
        if (signal.aborted || attempt !== syncAttemptRef.current) return false

        applyServerState(serverState)
        trackEvent('welcome_test_sync_success', { reason, sessionId: token })
        return true
      } catch (syncError) {
        if (signal.aborted) return false
        const mapped = mapWelcomeTestError(syncError)
        setError(mapped)
        trackEvent('welcome_test_sync_error', { reason, code: mapped.code })
        return false
      } finally {
        useWelcomeTestStore.getState().setSyncing(false)
      }
    },
    [canRunProtectedQueries, restoreSession]
  )

  const initialize = useCallback(
    async (token: string) => {
      const state = useWelcomeTestStore.getState()
      state.setLoading(true)
      state.clearError()
      state.setSessionId(token)
      state.beginTest(token)

      trackEvent('welcome_test_initialize', { sessionId: token })

      const { answersMap: localAnswers, status: localStatus } = useWelcomeTestStore.getState()
      const hasLocalProgress =
        Object.keys(localAnswers).length > 0 || localStatus !== 'NOT_STARTED'

      if (hasLocalProgress) {
        state.setRecovering(true)
        trackEvent('welcome_test_recover_local', { sessionId: token })
      }

      if (autoSync) {
        await syncFromBackend(token, hasLocalProgress ? 'recover' : 'init')
      }

      useWelcomeTestStore.getState().setRecovering(false)
      useWelcomeTestStore.getState().setLoading(false)
      useWelcomeTestStore.getState().setInitialized(true)
    },
    [autoSync, syncFromBackend]
  )

  const recover = useCallback(async () => {
    if (!sessionId) return false

    useWelcomeTestStore.getState().setRecovering(true)
    trackEvent('welcome_test_recover', { sessionId })

    const ok = await syncFromBackend(sessionId, 'recover')
    useWelcomeTestStore.getState().setRecovering(false)
    return ok
  }, [sessionId, syncFromBackend])

  const submitAnswer = useCallback(
    async (answerId: string, questionId?: string) => {
      const state = useWelcomeTestStore.getState()
      const token = state.sessionId ?? linkTokenOption ?? null

      if (!token) {
        const validationError: WelcomeTestError = {
          code: 'validation',
          message: 'Test session is not initialized.',
        }
        state.setError(validationError)
        return false
      }

      const activeQuestionId = questionId ?? state.currentQuestion
      if (!activeQuestionId) {
        const validationError: WelcomeTestError = {
          code: 'validation',
          message: 'No active question to answer.',
        }
        state.setError(validationError)
        return false
      }

      if (state.submitting || submitLock.isLocked) {
        return false
      }

      if (state.answersMap[activeQuestionId] === answerId) {
        return true
      }

      if (!submitLock.tryAcquire()) {
        return false
      }

      const requestId = createRequestId()
      activeSubmitRequestIdRef.current = requestId
      const snapshot = state.createSnapshot()
      const latencyMs = getLatencyMs(state.questionStartedAt)

      state.setSubmitting(true)
      state.clearError()
      state.applyOptimisticAnswer({
        questionId: activeQuestionId,
        answerId,
        latencyMs,
      })

      trackEvent('welcome_test_answer_optimistic', {
        sessionId: token,
        questionId: activeQuestionId,
        answerId,
        latencyMs,
      })

      const signal = submitGuard.begin()

      try {
        if (!canRunProtectedQueries) {
          await restoreSession('manual')
        }

        const serverState = await submitWelcomeTestAnswer(
          {
            linkToken: token,
            questionId: activeQuestionId,
            answerId,
            latencyMs,
          },
          signal
        )

        if (signal.aborted || activeSubmitRequestIdRef.current !== requestId) {
          return false
        }

        useWelcomeTestStore.getState().applyServerState(serverState)
        trackEvent('welcome_test_answer_success', {
          sessionId: token,
          questionId: activeQuestionId,
          answerId,
          status: serverState.status,
        })
        return true
      } catch (submitError) {
        if (signal.aborted || activeSubmitRequestIdRef.current !== requestId) {
          return false
        }

        const freshState = useWelcomeTestStore.getState()
        freshState.applySnapshot(snapshot)
        const mapped = mapWelcomeTestError(submitError)
        freshState.setError(mapped)
        trackEvent('welcome_test_answer_error', {
          sessionId: token,
          questionId: activeQuestionId,
          code: mapped.code,
        })

        if (mapped.code === 'expired_session' || mapped.code === 'validation') {
          await syncFromBackend(token, 'reconcile')
        }

        return false
      } finally {
        if (activeSubmitRequestIdRef.current === requestId) {
          activeSubmitRequestIdRef.current = null
        }
        submitLock.release()
        useWelcomeTestStore.getState().setSubmitting(false)
        submitGuard.clear()
      }
    },
    [canRunProtectedQueries, linkTokenOption, restoreSession, syncFromBackend]
  )

  useEffect(() => {
    if (!linkTokenOption || sessionIdFromStore === linkTokenOption) return
    void initialize(linkTokenOption)
  }, [initialize, linkTokenOption, sessionIdFromStore])

  useEffect(() => {
    return () => {
      syncGuard.abortInFlight()
      submitGuard.abortInFlight()
      activeSubmitRequestIdRef.current = null
    }
  }, [])

  return {
    initialized,
    loading,
    recovering,
    syncing,
    submitting,
    status,
    currentQuestion,
    answersMap,
    latencyMap,
    result,
    sessionId,
    startedAt,
    questionStartedAt,
    lastSyncedAt,
    error,
    initialize,
    recover,
    syncFromBackend: () =>
      sessionId ? syncFromBackend(sessionId, 'reconcile') : Promise.resolve(false),
    submitAnswer,
    markPaymentPending,
    markPaid,
    resetFlow,
    clearError,
    trackEvent,
  }
}
