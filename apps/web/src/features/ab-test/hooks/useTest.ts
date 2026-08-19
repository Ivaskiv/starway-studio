import {
  useEffect,
  useState,
} from 'react'
import { useSelector } from 'react-redux'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { AB_TEST_LANDING_ROUTE } from '@/features/ab-test-landing/config'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { selectAccessToken } from '@/features/auth/services/auth.slice'
import { AB_TEST_FALLBACK_QUESTIONS_RESPONSE } from '@/features/ab-test/data/abTest.questions'
import { resolveApiUrl } from '@/services/api'

import {
  DEFAULT_STATE,
  RESULT_ROUTE_PATH,
  TOTAL_BALLS,
} from '../model/config'
import {
  buildAnonymousResult,
  buildStoredResultFromType,
  isAbTestResultType,
} from '../model/result'
import {
  buildAuthHeaders,
  buildSubmissionAnswers,
  canSyncAbTestProgress,
  clearStoredState,
  loadStoredState,
  persistStoredState,
} from '../model/session'
import { useTestHydration } from './useTestHydration'
import { useTestQuestions } from './useTestQuestions'
import { useTestProgress } from './useTestProgress'
import { useTestSubmission } from './useTestSubmission'

import type {
  AbTestProgressResponse,
  AbTestQuestion,
  AbTestQuestionsResponse,
  AbTestResult,
  StoredResultRouteState,
} from '../model/types'

export function useTest() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  // [FIX] token needed for buildAuthHeaders() -> GET /progress
  const accessToken = useSelector(selectAccessToken)
  const canSyncToDb = isAuthenticated && canSyncAbTestProgress(accessToken)
  const isResultRoute = location.pathname.startsWith(RESULT_ROUTE_PATH)
  const routeState = (location.state as StoredResultRouteState | null) ?? null
  const routeStateResult = routeState?.result ?? null
  const resultTypeQuery = new URLSearchParams(location.search).get('type')

  const [questions, setQuestions] = useState<AbTestQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(DEFAULT_STATE.currentIndex)
  const [answers, setAnswers] = useState<Record<string, string>>(
    DEFAULT_STATE.answers
  )
  const [result, setResult] = useState<AbTestResult | null>(
    routeStateResult ?? DEFAULT_STATE.result
  )
  const [loading, setLoading] = useState(!isResultRoute)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [showBlock9, setShowBlock9] = useState(false)

  const handleResultCta = () => {
    setShowBlock9(true)
  }








  useTestHydration({
    accessToken,
    answers,
    canSyncToDb,
    currentIndex,
    hydrated,
    isResultRoute,
    result,
    setAnswers,
    setCurrentIndex,
    setHydrated,
    setResult,
  })

  useTestQuestions({
    isResultRoute,
    setError,
    setLoading,
    setQuestions,
  })

  useTestProgress({
    accessToken,
    canSyncToDb,
    hydrated,
    isResultRoute,
    navigate,
    result,
    resultTypeQuery,
    routeStateResult,
    setAnswers,
    setCurrentIndex,
    setError,
    setLoading,
    setResult,
  })

  useTestSubmission({
    accessToken,
    answers,
    canSyncToDb,
    hydrated,
    isResultRoute,
    questions,
  })

  const currentQuestion = questions[currentIndex] ?? null
  const selectedAnswerId = currentQuestion
    ? answers[currentQuestion.id]
    : undefined
  const isLastQuestion = currentIndex === questions.length - 1
  const canAdvance = Boolean(currentQuestion && selectedAnswerId)
  const allAnswered =
    questions.length > 0 &&
    questions.every((question) => Boolean(answers[question.id]))
  const totalQuestions = questions.length || TOTAL_BALLS
  const currentBallIndex = Math.min(currentIndex, TOTAL_BALLS - 1)
  const isResultView = Boolean(result)

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion) return

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: answerId,
    }

    setAnswers(nextAnswers)

    if (canSyncToDb) {
      void fetch(resolveApiUrl('/ab-test/submit-partial'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: buildSubmissionAnswers(questions, nextAnswers),
          partial: true,
        }),
      }).catch(() => undefined)
    }
  }

  const handleBack = () => {
    setResult(null)
    setCurrentIndex((current) => Math.max(0, current - 1))
  }

  const handleNext = async () => {
    if (!currentQuestion || !selectedAnswerId) return

    if (!isLastQuestion) {
      setResult(null)
      setCurrentIndex((current) => Math.min(current + 1, questions.length - 1))
      return
    }

    if (!allAnswered) return

    if (!canSyncToDb) {
      const anonymousResult = buildAnonymousResult(questions, answers)
      setResult(anonymousResult)
      setCurrentIndex(questions.length - 1)
      persistStoredState({
        currentIndex: questions.length - 1,
        answers,
        result: anonymousResult,
        source: 'anonymous',
      })
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(resolveApiUrl('/ab-test/submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: buildSubmissionAnswers(questions, answers),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit answers (${response.status})`)
      }

      const data = (await response.json()) as AbTestResult
      setResult(data)
      setCurrentIndex(questions.length - 1)
      persistStoredState({
        currentIndex: questions.length - 1,
        answers,
        result: data,
        source: 'authenticated',
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit AB test'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setAnswers({})
    setResult(null)
    setError(null)
    clearStoredState()

    if (isResultRoute) {
      navigate(AB_TEST_LANDING_ROUTE, { replace: true })
    }
  }


  return {
    loading,
    error,
    questions,
    result,
    showBlock9,
    isAuthenticated,
    navigate,
    currentIndex,
    totalQuestions,
    currentBallIndex,
    isResultView,
    currentQuestion,
    selectedAnswerId,
    submitting,
    canAdvance,
    isLastQuestion,
    handleResultCta,
    handleRestart,
    handleSelectAnswer,
    handleBack,
    handleNext,
  }
}
