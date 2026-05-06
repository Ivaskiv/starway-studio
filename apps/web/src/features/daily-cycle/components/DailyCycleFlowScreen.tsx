import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { useGetTelegramLinkUrlQuery, useGetTelegramStatusQuery } from '@/features/auth/services/auth.api'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useSendSessionHandoffMutation } from '@/features/notifications/services/notifications.api'
import { useGetDailyHistoryQuery, useGetDailyEntryByDateQuery, useGetTodayEntryQuery, useSaveMorningAnswerMutation, useSaveSessionAnswerMutation, useSubmitDailyCycleMutation } from '@/features/daily-cycle/services/daily.api'
import { useDailyCycle } from '@/features/daily-cycle/hooks/useDailyCycle'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { useGetDailyQuestionQuery } from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { getMeta } from '@/features/wheel/utils/wheel.utils'
import type { RootState } from '@/app/store'
import CyclePaused from '@/features/daily-cycle/components/CyclePaused'
import SessionView from '@/features/daily-cycle/components/session/SessionView'
import RecoveryMorningMicrotaskPrompt from '@/features/daily-cycle/components/session/RecoveryMorningMicrotaskPrompt'
import { buildWebMapDailyQuestion, EVENING_QUESTIONS, STATIC_MORNING_QUESTION_COUNT, STATIC_MORNING_QUESTIONS_LIST } from '@/features/daily-cycle/helpers/dailyCycleFlow.constants'
import type { DailyCycleFlowProps, DailyQuestion } from '@/features/daily-cycle/helpers/dailyCycleFlow.types'
import { formatCompactDateKey, getCycleDayForDate, getDateKey, getSessionAnswersFromContent, getSessionCompletedAt, getSessionResumeIndex, normalizeDailyAnalysis, parseDateKey, toDateKey } from '@/features/daily-cycle/helpers/dailyCycleFlow.utils'
import { useDailyCycleFlowSync } from '@/features/daily-cycle/helpers/useDailyCycleFlowSync'
import { DailyCycleUnavailableState } from './DailyCycleUnavailableState'
import { DailyCycleToolbar } from './DailyCycleToolbar'
import { useDailyCycleFlowActions } from '@/features/daily-cycle/helpers/useDailyCycleFlowActions'
import { DailyCycleCompletionState } from './DailyCycleCompletionState'

function buildPatternInsight({
  cycleDays,
  dailyHistoryCount,
  weakestSphereName,
}: {
  cycleDays: number
  dailyHistoryCount: number
  weakestSphereName: string
}) {
  const missedDays = Math.max(0, cycleDays - dailyHistoryCount)
  const consequence = missedDays > 0
    ? 'Коли день випадає з ритму, система швидко повертається у відкладання.'
    : 'Навіть коли ти тримаєш ритм кілька днів, без плану система починає знову просідати в тій самій точці.'

  return {
    title: 'Ти вже бачиш патерн',
    text: `Найслабша зона зараз — «${weakestSphereName}». ${consequence} Якщо зафіксувати цей патерн зараз, можна перейти від хаосу до керованого відновлення.`,
  }
}

export function DailyCycleFlow({
  embedded = false,
  initialSession,
  initialDateKey,
  onClose,
  onComplete,
  onOpenMicroTasks,
  onOpenProgress,
}: DailyCycleFlowProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '')
  const { data: trial } = useGetTrialStatusQuery()
  const { dayNumber: journeyDay, coreProgress } = useUserProgress()
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, { skip: !userId })
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const hardPaywallReached = coreProgress.cycleDays >= 3 && !subscription?.isActive
  const hasAccess = !hardPaywallReached && Boolean(
    trial?.isActive
    || trial?.isPaid
    || subscription?.isActive
    || accessControl?.hasSubscription
  )
  const mentorLifecycleState = getMentorLifecycleState({
    trial,
    accessControl,
    subscription,
    aiMentorModule: getModuleAccess('AI_MENTOR'),
  })
  const [recoveryDateKey, setRecoveryDateKey] = useState<string | null>(null)
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null)
  const now = new Date()
  const hour = now.getHours()
  const todayDateKey = getDateKey()
  const yesterdayDateKey = useMemo(() => getDateKey(-1), [])
  const sessionFromUrl = new URLSearchParams(window.location.search).get('session')
  const dateFromUrl = new URLSearchParams(window.location.search).get('date')
  const resumeFromUrl = searchParams.get('resume') === 'true'
  const urlDateKey = dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl) ? dateFromUrl : null
  const requestedDateKey = initialDateKey ?? recoveryDateKey ?? urlDateKey
  const isHistoricalLockedDate = Boolean(requestedDateKey && requestedDateKey < yesterdayDateKey)
  const isRecoverableDate = Boolean(requestedDateKey && requestedDateKey === yesterdayDateKey)
  const dateKey = isRecoverableDate && requestedDateKey ? requestedDateKey : todayDateKey

  const isSessionRoute = Boolean(initialSession || sessionFromUrl === 'morning' || sessionFromUrl === 'evening')
  const recoveryMode = isRecoverableDate
  const defaultSession = initialSession
    ?? (sessionFromUrl === 'evening'
      ? 'evening'
      : sessionFromUrl === 'morning'
        ? 'morning'
        : hour >= 21
          ? 'evening'
          : 'morning')

  const [session, setSession] = useState<'morning' | 'evening'>(defaultSession)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSavingRecoveryTask, setIsSavingRecoveryTask] = useState(false)
  const [eveningAnalysisPending, setEveningAnalysisPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [questionSnapshot, setQuestionSnapshot] = useState<DailyQuestion[]>([])
  const [microtaskGenerationState, setMicrotaskGenerationState] = useState<'idle' | 'waiting' | 'timeout'>('idle')
  const lastSyncedSessionRef = useRef<string | null>(null)
  const { data: telegramStatus } = useGetTelegramStatusQuery(undefined, {
    skip: embedded,
  })
  const { data: telegramLinkData, isFetching: isTelegramLinkLoading } = useGetTelegramLinkUrlQuery(undefined, {
    skip: embedded,
  })
  const {
    data: todayEntry,
    refetch: refetchTodayEntry,
  } = useGetTodayEntryQuery(undefined, {
    skip: (!hasAccess && !isSessionRoute) || recoveryMode,
    pollingInterval: embedded ? 15000 : 10000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const {
    data: requestedEntry,
    refetch: refetchRequestedEntry,
  } = useGetDailyEntryByDateQuery(dateKey, {
    skip: !isRecoverableDate,
    pollingInterval: embedded ? 15000 : 10000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const { data: dailyHistory, refetch: refetchDailyHistory } = useGetDailyHistoryQuery(undefined, {
    skip: !(recoveryMode || isSessionRoute || isHistoricalLockedDate),
  })
  const { data: webMapDailyQuestion } = useGetDailyQuestionQuery(undefined, {
    skip: !userId || session !== 'morning',
  })
  const [submitDailyCycle] = useSubmitDailyCycleMutation()
  const [saveMorningAnswer] = useSaveMorningAnswerMutation()
  const [saveSessionAnswer] = useSaveSessionAnswerMutation()
  const [generateDeepLink, { isLoading: isGeneratingTelegramResume }] = useGenerateDeepLinkMutation()
  const [sendSessionHandoff, { isLoading: isSendingSessionHandoff }] = useSendSessionHandoffMutation()
  const cycleState = useDailyCycle(userId)
  const {
    tasks: microTasks,
    createManualTask,
    refresh: refetchMicroTasks,
  } = useMicroTasks()
  const sessionSyncKeyRef = useRef<string | null>(null)
  const recoveryEntry = useMemo(() => {
    if (!recoveryMode) return null
    return dailyHistory?.find((entry) => toDateKey(entry.date) === dateKey) ?? requestedEntry ?? null
  }, [dailyHistory, dateKey, recoveryMode, requestedEntry])
  const sessionEntry = recoveryMode ? recoveryEntry : (requestedEntry ?? todayEntry)
  const normalizedContent = useMemo(() => {
    const rawContent = sessionEntry?.content
    return rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? rawContent as Record<string, unknown>
      : null
  }, [sessionEntry?.content])
  const sessionAnswersFromContent = useMemo(
    () => getSessionAnswersFromContent(sessionEntry?.content, session),
    [session, sessionEntry?.content],
  )
  const sessionResumeIndex = useMemo(
    () => getSessionResumeIndex(sessionEntry?.content, session),
    [session, sessionEntry?.content],
  )
  const sessionFinalizedAt = typeof normalizedContent?.finalizedAt === 'string' ? normalizedContent.finalizedAt : null
  const sessionFinalizedSession = typeof normalizedContent?.finalizedSession === 'string'
    ? normalizedContent.finalizedSession
    : null
  const sessionCompletedAt = useMemo(
    () => getSessionCompletedAt(sessionEntry?.content, session),
    [session, sessionEntry?.content],
  )
  const morningQuestionSeed = useMemo(() => {
    if (!webMapDailyQuestion?.question) {
      return STATIC_MORNING_QUESTIONS_LIST
    }

    return [
      ...STATIC_MORNING_QUESTIONS_LIST,
      buildWebMapDailyQuestion(webMapDailyQuestion.question),
    ]
  }, [webMapDailyQuestion])
  const hasMorningSession = Boolean(
    normalizedContent?.morning
    && typeof normalizedContent.morning === 'object'
    && !Array.isArray(normalizedContent.morning),
  )
  const hasEveningSession = Boolean(
    normalizedContent?.evening
    && typeof normalizedContent.evening === 'object'
    && !Array.isArray(normalizedContent.evening),
  )
  const sessionAlreadyCompleted = Boolean(sessionCompletedAt)
  const todayGeneratedTasks = useMemo(() => (
    microTasks.filter(task => (
      submittedEntryId
        ? task.generatedFromEntryId === submittedEntryId
        : sessionEntry?.id
          ? task.generatedFromEntryId === sessionEntry.id
          : task.createdAt?.slice(0, 10) === dateKey
    ))
  ), [dateKey, microTasks, sessionEntry?.id, submittedEntryId])
  const morningAnswersCount = session === 'morning' ? Object.keys(sessionAnswersFromContent ?? {}).length : 0
  const morningHasGeneratedTasks = session === 'morning' && todayGeneratedTasks.length > 0
  const shouldRedirectCompletedRecoveryMorning = Boolean(
    recoveryMode
    && session === 'morning'
    && (
      sessionAlreadyCompleted
      || morningHasGeneratedTasks
      || morningAnswersCount >= STATIC_MORNING_QUESTION_COUNT
    ),
  )
  const questions = questionSnapshot.length > 0
    ? questionSnapshot
    : session === 'morning'
      ? morningQuestionSeed
      : EVENING_QUESTIONS
  const currentQ = questions[step] ?? questions[0]
  const isLastStep = step === questions.length - 1
  const progress = questions.length > 0 ? Math.round((step / questions.length) * 100) : 0
  useDailyCycleFlowSync({
    submitted,
    session,
    todayGeneratedTasksCount: todayGeneratedTasks.length,
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
    recoveryEntryId: recoveryEntry?.id ?? null,
    sessionEntryId: sessionEntry?.id ?? null,
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
    questionSnapshotLength: questionSnapshot.length,
    questions,
    lastSyncedSessionRef,
    cycleStateActiveStep: cycleState.activeStep,
    cycleStateHasUnfinishedYesterday: cycleState.hasUnfinishedYesterday,
    cycleStateYesterdayEntryDate: cycleState.yesterdayEntry?.date,
    initialDateKey,
    setRecoveryDateKey,
    setEveningAnalysisPending,
    sendSessionHandoff,
    telegramBotActive: Boolean(telegramStatus?.botActive),
    sessionSyncKeyRef,
  })
  const shellClassName = embedded
    ? 'space-y-4'
    : 'mx-auto max-w-xl space-y-4 p-4'
  const weakestSphereName = useMemo(() => {
    const scores = latestWheel?.scores ?? []
    if (!scores.length) return 'система'
    const weakest = [...scores].sort((a, b) => a.score - b.score)[0]
    return weakest?.categoryId ? getMeta(weakest.categoryId).name : 'система'
  }, [latestWheel?.scores])
  const patternInsight = useMemo(
    () => buildPatternInsight({
      cycleDays: coreProgress.cycleDays,
      dailyHistoryCount: dailyHistory?.length ?? 0,
      weakestSphereName,
    }),
    [coreProgress.cycleDays, dailyHistory?.length, weakestSphereName],
  )

  if (shouldRedirectCompletedRecoveryMorning && !embedded) {
    return <Navigate to={`/dashboard/tasks?date=${dateKey}`} replace />
  }

  if (!hasAccess && !recoveryMode && !isSessionRoute) {
    const isPausedTrial = mentorLifecycleState === 'paused_trial_ended'
    const shouldShowCycleSummary = coreProgress.cycleDays >= 3
    if (isPausedTrial) {
      return (
        <div className={embedded ? 'p-4' : 'space-y-4'}>
          <CyclePaused
            onRecover={(missedDateKey, missedSession) => {
              setRecoveryDateKey(missedDateKey)
              setSubmittedEntryId(null)
              setSession(missedSession)
              setAnswers({})
              setStep(0)
              setSubmitted(false)
              if (missedSession === 'morning') {
                setQuestionSnapshot(STATIC_MORNING_QUESTIONS_LIST)
                return
              }
              setQuestionSnapshot(EVENING_QUESTIONS)
            }}
            onOpenProgress={() => {
              if (embedded) {
                onOpenMicroTasks?.()
                return
              }
              onOpenProgress?.()
            }}
          />
        </div>
      )
    }

    return (
      <DailyCycleUnavailableState
        embedded={embedded}
        title={isPausedTrial ? 'Твій цикл поставлено на паузу' : 'Зафіксуй свій стан дня'}
        description={
          isPausedTrial
            ? 'Пробний період уже завершився. Звіти та історія лишилися доступними, а нові сесії відкриються після підписки.'
            : 'Доступно з активним тріалом або підпискою.'
        }
        summaryTitle={shouldShowCycleSummary ? patternInsight.title : undefined}
        summaryText={
          shouldShowCycleSummary
            ? patternInsight.text
            : undefined
        }
        buttonLabel={shouldShowCycleSummary ? 'Отримати план виправлення' : 'Переглянути плани доступу'}
        onAction={() => navigate('/dashboard/subscription')}
      />
    )
  }

  if (isHistoricalLockedDate) {
    return (
      <DailyCycleUnavailableState
        embedded={embedded}
        title="Цей день уже в історії"
        description="Продовжити можна лише вчорашній день. Для старіших дат відкрий щоденник як історію."
        buttonLabel="Відкрити щоденник"
        onAction={() => navigate('/dashboard/journal')}
      />
    )
  }

  const {
    handleAnswerBlur,
    handleFinishDay,
    handleFinalizeEvening,
    handleGoToAllTasks,
    handleGoToTasks,
    handleNext,
    handleOpenTelegram,
  } = useDailyCycleFlowActions({
    session,
    dateKey,
    recoveryMode,
    step,
    currentQuestionId: currentQ.id,
    currentQuestionAnswer: answers[currentQ.id] ?? '',
    questions,
    sessionAlreadyCompleted,
    submitted,
    submittedEntryId,
    sessionEntryId: sessionEntry?.id ?? null,
    answers,
    sessionAnswersFromContent,
    hasAccess,
    userId,
    embedded,
    telegramBotActive: Boolean(telegramStatus?.botActive),
    telegramLinkUrl: telegramLinkData?.url,
    submitDailyCycle,
    saveSessionAnswer,
    saveMorningAnswer,
    generateDeepLink,
    refetchTodayEntry,
    refetchRequestedEntry,
    refetchDailyHistory,
    refetchMicroTasks,
    onComplete,
    onOpenMicroTasks,
    navigate,
    setValidationMessage,
    setIsSubmitting,
    setSubmittedEntryId,
    setEveningAnalysisPending,
    setSubmitted,
    setStep,
  })

  const displayedDayNumber = getCycleDayForDate({
    dateKey,
    fallbackDay: journeyDay || 1,
    trialStartedAt: trial?.startedAt,
    paidStartedAt: subscription?.currentPeriodStart,
    isPaidCycle: Boolean(subscription?.isActive || accessControl?.hasSubscription || trial?.isPaid),
  })
  const recoveryHeaderLabel = recoveryMode
    ? `Завершення вчорашнього дня · ${formatCompactDateKey(dateKey)}`
    : null
  const displayDate = (() => {
    const parsed = parseDateKey(dateKey)
    if (!parsed) return format(new Date(), 'd MMMM yyyy', { locale: uk })
    return format(parsed, 'd MMMM yyyy', { locale: uk })
  })()
  const analysis = normalizeDailyAnalysis(
    sessionEntry?.aiAnalysis ?? normalizedContent?.analysis ?? null,
    session === 'evening'
      ? (sessionAnswersFromContent ?? answers)
      : null,
  )

  const moveRecoveryMorningToEvening = async () => {
    try {
      await Promise.all([
        refetchTodayEntry(),
        refetchRequestedEntry(),
        refetchDailyHistory(),
        refetchMicroTasks(),
      ])
    } catch {
      // keep recovery flow moving even if refresh fails
    }

    setSubmitted(false)
    setSubmittedEntryId(null)
    setSession('evening')
    setAnswers({})
    setStep(0)
    setQuestionSnapshot(EVENING_QUESTIONS)
  }

  const handleSaveRecoveryManualTask = async (title: string) => {
    setIsSavingRecoveryTask(true)
    try {
      await createManualTask({
        title: title.trim(),
        replaceExisting: false,
        date: dateKey,
      }).unwrap()
      await moveRecoveryMorningToEvening()
    } catch (error) {
      console.error('[DailyCycle] failed to save recovery manual task', error)
      toast.error('Не вдалося зберегти мікродію.')
    } finally {
      setIsSavingRecoveryTask(false)
    }
  }

  const handleSkipRecoveryManualTask = async () => {
    await moveRecoveryMorningToEvening()
  }

  if (submitted) {
    if (session === 'morning' && recoveryMode) {
      return (
        <RecoveryMorningMicrotaskPrompt
          dateLabel={displayDate}
          isSaving={isSavingRecoveryTask}
          onSubmitManual={(value) => {
            void handleSaveRecoveryManualTask(value)
          }}
          onSkip={() => {
            void handleSkipRecoveryManualTask()
          }}
        />
      )
    }

    return (
      <DailyCycleCompletionState
        session={session}
        embedded={embedded}
        loadingTasks={todayGeneratedTasks.length === 0 && microtaskGenerationState === 'waiting'}
        tasksReady={todayGeneratedTasks.length > 0}
        analysis={analysis}
        onGoToTasks={session === 'evening' ? handleGoToAllTasks : handleGoToTasks}
        onFinishDay={handleFinishDay}
        onFinalizeEvening={handleFinalizeEvening}
        eveningAnalysisPending={eveningAnalysisPending}
      />
    )
  }

  return (
    <div className={shellClassName}>
      <DailyCycleToolbar
        embedded={embedded}
        session={session}
        onSessionChange={(nextSession) => {
          setSession(nextSession)
          setSubmittedEntryId(null)
          setStep(0)
          setAnswers({})
          setSubmitted(false)
          setQuestionSnapshot(nextSession === 'morning' ? morningQuestionSeed : EVENING_QUESTIONS)
        }}
        onOpenMicroTasks={() => {
          if (embedded) {
            onOpenMicroTasks?.()
            return
          }
          navigate('/dashboard/ai-mentor?section=microtasks')
        }}
        onBackToDashboard={() => navigate('/dashboard')}
        onOpenTelegram={() => { void handleOpenTelegram() }}
        onClose={onClose}
        isGeneratingTelegramResume={isGeneratingTelegramResume}
        isSendingSessionHandoff={isSendingSessionHandoff}
        telegramBotActive={Boolean(telegramStatus?.botActive)}
        isTelegramLinkLoading={isTelegramLinkLoading}
      />

      <SessionView
        session={session}
        dayNumber={displayedDayNumber}
        displayDate={displayDate}
        recoveryLabel={recoveryHeaderLabel}
        current={step + 1}
        total={questions.length}
        progress={progress}
        question={currentQ}
        answer={answers[currentQ.id] ?? ''}
        isLast={isLastStep}
        isSubmitting={isSubmitting}
        embedded={embedded}
        errorMessage={validationMessage}
        loadingMessage={null}
        onAnswerChange={value => {
          setValidationMessage(null)
          setAnswers(a => ({ ...a, [currentQ.id]: value }))
        }}
        onAnswerBlur={handleAnswerBlur}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onNext={() => {
          void handleNext()
        }}
      />
    </div>
  )
}

export default function DailyCyclePage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('section', 'cycle')

  return <Navigate to={`/dashboard/ai-mentor?${params.toString()}`} replace />
}
