import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { PaymentScreen } from '@/features/welcome-test/components/PaymentScreen'
import { QuestionScreen } from '@/features/welcome-test/components/QuestionScreen'
import { ResultScreen } from '@/features/welcome-test/components/ResultScreen'
import { WelcomeScreen } from '@/features/welcome-test/components/WelcomeScreen'
import { WelcomeTestSessionError } from '@/features/welcome-test/components/WelcomeTestErrorState'
import { useWelcomeTest } from '@/features/welcome-test/hooks/useWelcomeTest'
import { useWelcomeTestAnalytics } from '@/features/welcome-test/hooks/useWelcomeTestAnalytics'
import { useWelcomeTestPayment } from '@/features/welcome-test/hooks/useWelcomeTestPayment'
import { useWelcomeTestPaymentConfirmation } from '@/features/welcome-test/hooks/useWelcomeTestPaymentConfirmation'
import { useWelcomeTestQuestions } from '@/features/welcome-test/hooks/useWelcomeTestQuestions'
import { useWelcomeTestStore } from '@/features/welcome-test/stores/useWelcomeTestStore'
import { fetchWelcomeTestPaymentStatus } from '@/features/welcome-test/services/welcomeTest.api'
import { buildWelcomeTestResultView } from '@/features/welcome-test/utils/welcomeTestResult'
import { FOCUS_ROUTE } from '@/features/landings/focus/content/constants'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'

type WelcomeTestStep = 'welcome' | 'question' | 'result' | 'payment'

export default function WelcomeTestPage() {
  const { linkToken } = useParams<{ linkToken: string }>()
  const { authRestoreStatus, restoreSession, canRunProtectedQueries } = useSessionOrchestrator()
  const [step, setStep] = useState<WelcomeTestStep>('welcome')
  const restoreSessionRef = useRef(restoreSession)

  const welcomeTest = useWelcomeTest({ linkToken: linkToken ?? null })
  const { questions, loading: questionsLoading, error: questionsError } =
    useWelcomeTestQuestions()
  const { trackWelcomeTestEvent } = useWelcomeTestAnalytics(welcomeTest.sessionId)

  const payment = useWelcomeTestPayment({
    linkToken,
    onPending: welcomeTest.markPaymentPending,
    onTrack: trackWelcomeTestEvent,
  })

  const paymentConfirmation = useWelcomeTestPaymentConfirmation(
    linkToken ?? '',
    canRunProtectedQueries && welcomeTest.status === 'PAYMENT_PENDING',
  )

  useEffect(() => {
    if (!paymentConfirmation.isPaid) return
    trackWelcomeTestEvent('welcome_test_payment_confirmed', {})
  }, [paymentConfirmation.isPaid, trackWelcomeTestEvent])

  const currentQuestion = useMemo(() => {
    if (!welcomeTest.currentQuestion) return null
    return questions.find((item) => item.id === welcomeTest.currentQuestion) ?? null
  }, [questions, welcomeTest.currentQuestion])

  const questionIndex = useMemo(() => {
    if (!welcomeTest.currentQuestion) return questions.length
    const index = questions.findIndex((item) => item.id === welcomeTest.currentQuestion)
    return index >= 0 ? index : Object.keys(welcomeTest.answersMap).length
  }, [questions, welcomeTest.answersMap, welcomeTest.currentQuestion])

  const resultView = useMemo(
    () => buildWelcomeTestResultView(welcomeTest.result, questions, welcomeTest.answersMap),
    [welcomeTest.answersMap, welcomeTest.result, questions]
  )

  useEffect(() => {
    restoreSessionRef.current = restoreSession
  }, [restoreSession])

  useEffect(() => {
    if (!linkToken) return
    void restoreSessionRef.current('manual')
  }, [linkToken])

  useEffect(() => {
    if (!welcomeTest.initialized || questionsLoading) return

    if (welcomeTest.status === 'PAYMENT_PENDING' || welcomeTest.status === 'PAID') {
      setStep('payment')
      return
    }

    if (welcomeTest.status === 'COMPLETED' && resultView) {
      setStep((current) => (current === 'question' ? current : 'result'))
      return
    }

    if (currentQuestion) {
      setStep('question')
      return
    }

    if (Object.keys(welcomeTest.answersMap).length > 0) {
      setStep('question')
    }
  }, [
    currentQuestion,
    questionsLoading,
    resultView,
    welcomeTest.answersMap,
    welcomeTest.initialized,
    welcomeTest.status,
  ])

  useEffect(() => {
    if (step !== 'question' || !currentQuestion) return
    trackWelcomeTestEvent('welcome_test_question_viewed', {
      questionId: currentQuestion.id,
      index: questionIndex,
    })
  }, [currentQuestion, questionIndex, step, trackWelcomeTestEvent])

  useEffect(() => {
    if (step === 'result' && resultView) {
      trackWelcomeTestEvent('welcome_test_result_shown', {
        resultType: resultView.type,
      })
    }
  }, [resultView, step, trackWelcomeTestEvent])

  const handleStart = async () => {
    if (!linkToken) return
    await welcomeTest.initialize(linkToken)
    const nextQuestion = useWelcomeTestStore.getState().currentQuestion
    setStep(nextQuestion ? 'question' : 'welcome')
  }

  const handleSelectAnswer = async (answerId: string) => {
    if (!currentQuestion || welcomeTest.submitting) return

    trackWelcomeTestEvent('welcome_test_answer_submitted', {
      questionId: currentQuestion.id,
      answerId,
    })

    const ok = await welcomeTest.submitAnswer(answerId, currentQuestion.id)
    if (!ok) return

    const nextState = useWelcomeTestStore.getState()
    if (nextState.status === 'COMPLETED') {
      setStep('result')
    }
  }

  const handleContinueToPayment = () => {
    setStep('payment')
    trackWelcomeTestEvent('welcome_test_payment_step_opened', {})
  }

  const handlePay = () => {
    void payment.startMonthlyPayment()
  }

  const handleOpenFocus = () => {
    if (typeof window !== 'undefined') window.location.href = FOCUS_ROUTE
  }

  const handleResendAccess = () => {
    toast('Доступно в Telegram: натисни "Отримати доступ повторно".', { icon: '🔁' })
  }

  useEffect(() => {
    if (!linkToken || !welcomeTest.initialized) return
    if (welcomeTest.status === 'PAID') return
    void fetchWelcomeTestPaymentStatus(linkToken)
      .then((result) => {
        if (result.paid || result.focusPaid) welcomeTest.markPaid()
        else if (result.payment?.status === 'PAYMENT_PENDING') welcomeTest.markPaymentPending()
      })
      .catch(() => undefined)
  }, [linkToken, welcomeTest.initialized, welcomeTest.markPaid, welcomeTest.markPaymentPending, welcomeTest.status])

  if (!linkToken) {
    return (
      <WelcomeTestSessionError
        code="validation"
        message="Невалідне посилання тесту. Перевірте linkToken у URL."
      />
    )
  }

  if (authRestoreStatus === 'restoring' || authRestoreStatus === 'idle') {
    return <LoadingFallback />
  }

  if (
    !welcomeTest.initialized &&
    (welcomeTest.loading || welcomeTest.recovering || questionsLoading)
  ) {
    return <LoadingFallback />
  }

  if (questionsError && questions.length === 0) {
    return (
      <WelcomeTestSessionError
        code="network"
        message={questionsError}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (welcomeTest.error?.code === 'expired_session') {
    return (
      <WelcomeTestSessionError
        code={welcomeTest.error.code}
        message={welcomeTest.error.message}
        onRetry={() => void welcomeTest.recover()}
        onRestart={() => {
          welcomeTest.resetFlow()
          setStep('welcome')
        }}
      />
    )
  }

  if (
    step === 'welcome' &&
    welcomeTest.status === 'NOT_STARTED' &&
    Object.keys(welcomeTest.answersMap).length === 0
  ) {
    return <WelcomeScreen onStart={() => void handleStart()} isLoading={welcomeTest.loading} />
  }

  if (step === 'payment' || welcomeTest.status === 'PAID') {
    return (
      <PaymentScreen
        onPay={handlePay}
        onOpenFocus={handleOpenFocus}
        onResendAccess={handleResendAccess}
        isAlreadyActive={payment.alreadyActive}
        isPaying={payment.isPaying}
        errorMessage={payment.redirectError ?? welcomeTest.error?.message}
        onRetry={handlePay}
        isPaid={welcomeTest.status === 'PAID'}
      />
    )
  }

  if (step === 'result' && resultView) {
    return <ResultScreen result={resultView} onContinue={handleContinueToPayment} />
  }

  if (step === 'question' && currentQuestion) {
    return (
      <QuestionScreen
        question={currentQuestion}
        questionIndex={questionIndex}
        totalQuestions={questions.length}
        selectedAnswerId={welcomeTest.answersMap[currentQuestion.id]}
        submitting={welcomeTest.submitting}
        errorMessage={welcomeTest.error?.message}
        onSelect={(answerId) => void handleSelectAnswer(answerId)}
      />
    )
  }

  return (
    <WelcomeTestSessionError
      message="Не вдалося відновити прогрес тесту."
      onRetry={() => void welcomeTest.recover()}
      onRestart={() => {
        welcomeTest.resetFlow()
        void welcomeTest.initialize(linkToken)
        setStep('welcome')
      }}
    />
  )
}
