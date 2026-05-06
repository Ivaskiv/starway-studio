import { useEffect, type MutableRefObject, type RefObject } from 'react'
import { NavigateFunction } from 'react-router-dom'
import toast from 'react-hot-toast'

import { EVENING_QUESTIONS } from './dailyCycleFlow.constants'
import { clearDraft, loadDraft, saveDraft, toDateKey } from './dailyCycleFlow.utils'
import type { DailyQuestion } from './dailyCycleFlow.types'

type UseDailyCycleFlowSyncParams = {
  submitted: boolean
  session: 'morning' | 'evening'
  todayGeneratedTasksCount: number
  dateKey: string
  refetchMicroTasks: () => void | Promise<unknown>
  refetchTodayEntry: () => void | Promise<unknown>
  setMicrotaskGenerationState: (value: 'idle' | 'waiting' | 'timeout') => void
  shouldRedirectCompletedRecoveryMorning: boolean
  recoveryMode: boolean
  sessionAlreadyCompleted: boolean
  morningAnswersCount: number
  morningHasGeneratedTasks: boolean
  sessionCompletedAt: string | null
  embedded: boolean
  onOpenMicroTasks?: (dateKey?: string) => void
  navigate: NavigateFunction
  answers: Record<string, string>
  step: number
  eveningAnalysisPending: boolean
  recoveryEntryId: string | null
  sessionEntryId: string | null
  sessionFinalizedAt: string | null
  sessionFinalizedSession: string | null
  isRecoverableDate: boolean
  isHistoricalLockedDate: boolean
  hasEveningSession: boolean
  hasMorningSession: boolean
  setSubmitted: (value: boolean) => void
  setValidationMessage: (value: string | null) => void
  setAnswers: (value: Record<string, string>) => void
  setStep: (value: number | ((current: number) => number)) => void
  setQuestionSnapshot: (value: DailyQuestion[]) => void
  morningQuestionSeed: DailyQuestion[]
  sessionAnswersFromContent: Record<string, string> | null
  userId: string
  resumeFromUrl: boolean
  sessionResumeIndex: number
  questionSnapshotLength: number
  questions: DailyQuestion[]
  lastSyncedSessionRef: MutableRefObject<string | null>
  cycleStateActiveStep: { step: string; resumeFrom?: number }
  cycleStateHasUnfinishedYesterday: boolean
  cycleStateYesterdayEntryDate?: string | Date
  initialDateKey?: string
  setRecoveryDateKey: (value: string | ((current: string | null) => string | null)) => void
  setEveningAnalysisPending: (value: boolean) => void
  sendSessionHandoff: (payload: {
    session: 'morning' | 'evening'
    step: number
    answers: Record<string, string>
    date: string
  }) => { unwrap: () => Promise<unknown> }
  telegramBotActive: boolean
  sessionSyncKeyRef: MutableRefObject<string | null>
}

export function useDailyCycleFlowSync({
  submitted,
  session,
  todayGeneratedTasksCount,
  dateKey,
  refetchMicroTasks,
  refetchTodayEntry,
  setMicrotaskGenerationState,
  shouldRedirectCompletedRecoveryMorning,
  recoveryMode,
  sessionAlreadyCompleted,
  morningAnswersCount,
  morningHasGeneratedTasks,
  sessionCompletedAt,
  embedded,
  onOpenMicroTasks,
  navigate,
  answers,
  step,
  eveningAnalysisPending,
  recoveryEntryId,
  sessionEntryId,
  sessionFinalizedAt,
  sessionFinalizedSession,
  isRecoverableDate,
  isHistoricalLockedDate,
  hasEveningSession,
  hasMorningSession,
  setSubmitted,
  setValidationMessage,
  setAnswers,
  setStep,
  setQuestionSnapshot,
  morningQuestionSeed,
  sessionAnswersFromContent,
  userId,
  resumeFromUrl,
  sessionResumeIndex,
  questionSnapshotLength,
  questions,
  lastSyncedSessionRef,
  cycleStateActiveStep,
  cycleStateHasUnfinishedYesterday,
  cycleStateYesterdayEntryDate,
  initialDateKey,
  setRecoveryDateKey,
  setEveningAnalysisPending,
  sendSessionHandoff,
  telegramBotActive,
  sessionSyncKeyRef,
}: UseDailyCycleFlowSyncParams) {
  useEffect(() => {
    console.info('[DailyCycle] bootstrap', {
      session,
      dateKey,
      recoveryMode,
      sessionAlreadyCompleted,
      sessionCompletedAt,
      sessionFinalizedAt,
      sessionFinalizedSession,
      answersCount: Object.keys(answers).length,
      step,
      eveningAnalysisPending,
      recoveryEntryId,
      sessionEntryId,
    })
  }, [
    answers,
    dateKey,
    eveningAnalysisPending,
    recoveryEntryId,
    recoveryMode,
    session,
    sessionAlreadyCompleted,
    sessionCompletedAt,
    sessionEntryId,
    sessionFinalizedAt,
    sessionFinalizedSession,
    step,
  ])

  useEffect(() => {
    console.info('[DailyCycle] route context', {
      session,
      dateKey,
      recoveryMode,
      isRecoverableDate,
      isHistoricalLockedDate,
      sessionAlreadyCompleted,
      sessionCompletedAt,
      sessionEntryId,
      hasMorningSession,
      hasEveningSession,
      eveningAnalysisPending,
      step,
    })
  }, [
    dateKey,
    eveningAnalysisPending,
    hasEveningSession,
    hasMorningSession,
    isHistoricalLockedDate,
    isRecoverableDate,
    recoveryMode,
    session,
    sessionAlreadyCompleted,
    sessionCompletedAt,
    sessionEntryId,
    step,
  ])

  useEffect(() => {
    if (!submitted || session !== 'morning') return
    if (todayGeneratedTasksCount > 0) {
      setMicrotaskGenerationState('idle')
      return
    }

    let attempts = 0
    const maxAttempts = 6
    setMicrotaskGenerationState('waiting')

    const timer = window.setInterval(() => {
      attempts += 1
      void refetchMicroTasks()
      void refetchTodayEntry()

      if (attempts >= maxAttempts) {
        window.clearInterval(timer)
        setMicrotaskGenerationState('timeout')
        toast.error('Мікрозавдання ще не зʼявились. Можна продовжити без очікування.')
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [
    dateKey,
    refetchMicroTasks,
    refetchTodayEntry,
    session,
    setMicrotaskGenerationState,
    submitted,
    todayGeneratedTasksCount,
  ])

  useEffect(() => {
    if (!submitted || session !== 'morning') {
      setMicrotaskGenerationState('idle')
      return
    }

    if (todayGeneratedTasksCount > 0) {
      setMicrotaskGenerationState('idle')
    }
  }, [session, setMicrotaskGenerationState, submitted, todayGeneratedTasksCount])

  useEffect(() => {
    if (!shouldRedirectCompletedRecoveryMorning) return

    if (embedded) {
      onOpenMicroTasks?.(dateKey)
      return
    }

    navigate(`/dashboard/tasks?date=${dateKey}`, { replace: true })
  }, [
    dateKey,
    embedded,
    navigate,
    onOpenMicroTasks,
    shouldRedirectCompletedRecoveryMorning,
  ])

  useEffect(() => {
    setSubmitted(sessionAlreadyCompleted)
    setValidationMessage(null)

    if (sessionAlreadyCompleted) {
      setAnswers(sessionAnswersFromContent ?? {})
      setStep(0)
      setQuestionSnapshot(session === 'morning' ? morningQuestionSeed : EVENING_QUESTIONS)
      clearDraft(userId, session, dateKey)
      lastSyncedSessionRef.current = `${session}:${dateKey}`
      return
    }

    const syncKey = `${session}:${dateKey}`
    if (lastSyncedSessionRef.current !== syncKey) {
      const draft = loadDraft(userId, session, dateKey)
      const hasServerAnswers = Boolean(sessionAnswersFromContent && Object.keys(sessionAnswersFromContent).length > 0)
      const shouldPreferServerState = recoveryMode || hasServerAnswers || sessionResumeIndex > 0
      const initialAnswers = shouldPreferServerState
        ? (sessionAnswersFromContent ?? draft?.answers ?? {})
        : (draft?.answers ?? sessionAnswersFromContent ?? {})
      const initialStep = shouldPreferServerState
        ? sessionResumeIndex
        : (draft?.step ?? sessionResumeIndex ?? 0)
      const sourceQuestions = session === 'morning'
        ? morningQuestionSeed
        : draft?.questions && draft.questions.length > 0
          ? draft.questions
          : EVENING_QUESTIONS
      const firstIncompleteQuestion = sourceQuestions.findIndex(
        question => !(initialAnswers[question.id] ?? '').trim(),
      )

      setAnswers(initialAnswers)
      setStep(resumeFromUrl && firstIncompleteQuestion >= 0 ? firstIncompleteQuestion : initialStep)
      setQuestionSnapshot(sourceQuestions)
      lastSyncedSessionRef.current = syncKey
    }
  }, [
    dateKey,
    lastSyncedSessionRef,
    morningQuestionSeed,
    recoveryMode,
    resumeFromUrl,
    session,
    sessionAlreadyCompleted,
    sessionAnswersFromContent,
    sessionResumeIndex,
    setAnswers,
    setQuestionSnapshot,
    setStep,
    setSubmitted,
    setValidationMessage,
    userId,
  ])

  useEffect(() => {
    if (!cycleStateHasUnfinishedYesterday || recoveryMode || initialDateKey) return

    const unfinishedDate = cycleStateYesterdayEntryDate ? toDateKey(cycleStateYesterdayEntryDate) : null
    if (!unfinishedDate) return

    setRecoveryDateKey(current => current ?? unfinishedDate)
  }, [
    cycleStateHasUnfinishedYesterday,
    cycleStateYesterdayEntryDate,
    initialDateKey,
    recoveryMode,
    setRecoveryDateKey,
  ])

  useEffect(() => {
    if (session !== 'evening') {
      setEveningAnalysisPending(false)
      return
    }

    const hasRecoveredEveningAnswers = Boolean(sessionAnswersFromContent && Object.keys(sessionAnswersFromContent).length > 0)
    if (!hasRecoveredEveningAnswers) return

    setEveningAnalysisPending(!sessionAlreadyCompleted)
  }, [dateKey, session, sessionAlreadyCompleted, sessionAnswersFromContent, sessionFinalizedAt, sessionFinalizedSession, setEveningAnalysisPending])

  useEffect(() => {
    if (session !== 'morning' || sessionAlreadyCompleted) return
    const hasStarted = step > 0 || Object.keys(answers).length > 0
    if (hasStarted || questionSnapshotLength > 0) return
    setQuestionSnapshot(morningQuestionSeed)
  }, [
    answers,
    morningQuestionSeed,
    questionSnapshotLength,
    session,
    sessionAlreadyCompleted,
    setQuestionSnapshot,
    step,
  ])

  useEffect(() => {
    if (sessionAlreadyCompleted) return
    saveDraft(userId, session, dateKey, { answers, step, questions })
  }, [answers, dateKey, questions, session, sessionAlreadyCompleted, step, userId])

  useEffect(() => {
    if (session !== 'morning' || recoveryMode || sessionAlreadyCompleted) return
    if (cycleStateActiveStep.step !== 'morning') return
    if ((cycleStateActiveStep.resumeFrom ?? 0) <= 0) return

    setStep(current => (current === 0 ? (cycleStateActiveStep.resumeFrom ?? 0) : current))
  }, [cycleStateActiveStep, recoveryMode, session, sessionAlreadyCompleted, setStep])

  useEffect(() => {
    if (session !== 'evening' || recoveryMode || sessionAlreadyCompleted) return
    if (cycleStateActiveStep.step !== 'evening') return
    if ((cycleStateActiveStep.resumeFrom ?? 0) <= 0) return

    setStep(current => (current === 0 ? (cycleStateActiveStep.resumeFrom ?? 0) : current))
  }, [cycleStateActiveStep, recoveryMode, session, sessionAlreadyCompleted, setStep])

  useEffect(() => {
    if (embedded || !userId || !telegramBotActive || sessionAlreadyCompleted) return

    const syncKey = `${userId}:${session}:${dateKey}`
    if (sessionSyncKeyRef.current === syncKey) return
    sessionSyncKeyRef.current = syncKey

    void sendSessionHandoff({
      session,
      step,
      answers,
      date: `${dateKey}T12:00:00.000Z`,
    }).unwrap().catch(error => {
      console.warn('[DailyCycle] session handoff sync failed', {
        session,
        error,
      })
    })
  }, [
    answers,
    dateKey,
    embedded,
    sendSessionHandoff,
    session,
    sessionAlreadyCompleted,
    sessionSyncKeyRef,
    step,
    telegramBotActive,
    userId,
  ])
}
