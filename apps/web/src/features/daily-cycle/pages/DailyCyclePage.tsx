import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  useGetTelegramLinkUrlQuery,
  useGetTelegramStatusQuery,
} from '@/features/auth/services/auth.api'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useSendSessionHandoffMutation } from '@/features/notifications/services/notifications.api'
import {
  useGetDailyHistoryQuery,
  useGetDailyEntryByDateQuery,
  useGetTodayEntryQuery,
  useSaveMorningAnswerMutation,
  useSaveSessionAnswerMutation,
  useSubmitDailyCycleMutation,
} from '@/features/daily-cycle/services/daily.api'
import { useDailyCycle } from '@/features/daily-cycle/hooks/useDailyCycle'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { useGetDailyQuestionQuery } from '@/features/web-map/services/web-map.api'
import type { RootState } from '@/app/store'
import CyclePaused from '@/features/daily-cycle/components/CyclePaused'
import SessionSuccess from '@/features/daily-cycle/components/session/SessionSuccess'
import SessionView from '@/features/daily-cycle/components/session/SessionView'

type DailyQuestion = {
  id: string
  label: string
  hint?: string
  placeholder: string
  type: 'text' | 'textarea'
}

type DailyDraftState = {
  answers: Record<string, string>
  step: number
  questions?: DailyQuestion[]
}

const STATIC_MORNING_QUESTION_KEYS = [
  'identity',
  'qualities',
  'goals',
  'focus',
  'state',
  'worthy',
] as const

type StaticMorningQuestionKey = typeof STATIC_MORNING_QUESTION_KEYS[number]

const STATIC_MORNING_QUESTIONS: Record<StaticMorningQuestionKey, DailyQuestion> = {
  identity: {
    id: 'identity',
    label: 'Хто я сьогодні?',
    hint: 'Коротко назви себе в цій ролі / стані.',
    placeholder: 'Я сьогодні — ...',
    type: 'text',
  },
  qualities: {
    id: 'qualities',
    label: 'Яка я?',
    hint: 'Які якості зараз тобі реально допомагають?',
    placeholder: 'Яка я сьогодні: ...',
    type: 'text',
  },
  goals: {
    id: 'goals',
    label: 'Мої 10 цілей на рік',
    hint: 'Введи кожну ціль з нового рядка (до 10).',
    placeholder: 'Я маю ...\nЯ живу ...\nЯ отримую ...',
    type: 'textarea',
  },
  focus: {
    id: 'focus',
    label: 'На яку одну ціль я фокусуюсь сьогодні?',
    hint: 'Одна ціль на день працює краще за розпорошення.',
    placeholder: 'Сьогодні я фокусуюсь на ...',
    type: 'text',
  },
  state: {
    id: 'state',
    label: 'Який мій стан сьогодні?',
    hint: 'Назви стан чесно, без прикрас.',
    placeholder: 'Зараз мій стан: ...',
    type: 'text',
  },
  worthy: {
    id: 'worthy',
    label: 'Чому я гідна мати все це прямо зараз?',
    hint: 'Сформулюй коротко, без пафосу.',
    placeholder: 'Я гідна цього, бо ...',
    type: 'textarea',
  },
}

const STATIC_MORNING_QUESTIONS_LIST = STATIC_MORNING_QUESTION_KEYS.map(key => STATIC_MORNING_QUESTIONS[key])

function buildWebMapDailyQuestion(questionText: string): DailyQuestion {
  return {
    id: 'webMapAlignmentAnswer',
    label: questionText,
    hint: 'Коротко зафіксуй зв’язок між сьогоднішньою дією і твоєю головною ціллю.',
    placeholder: 'Ця дія веде мене до головної цілі, тому що...',
    type: 'textarea',
  }
}

function toDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDraftKey(userId: string, session: 'morning' | 'evening', dateKey: string) {
  return `starway_daily_cycle_draft:${userId || 'guest'}:${session}:${dateKey}`
}

function loadDraft(userId: string, session: 'morning' | 'evening', dateKey: string): DailyDraftState | null {
  try {
    const raw = window.localStorage.getItem(getDraftKey(userId, session, dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DailyDraftState>
    return {
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers as Record<string, string> : {},
      step: typeof parsed.step === 'number' ? parsed.step : 0,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter(question =>
          question
          && typeof question === 'object'
          && typeof question.id === 'string'
          && typeof question.label === 'string'
          && typeof question.placeholder === 'string'
          && (question.type === 'text' || question.type === 'textarea'),
        ) as DailyQuestion[]
        : undefined,
    }
  } catch {
    return null
  }
}

function saveDraft(userId: string, session: 'morning' | 'evening', dateKey: string, draft: DailyDraftState) {
  try {
    window.localStorage.setItem(getDraftKey(userId, session, dateKey), JSON.stringify(draft))
  } catch {
    // ignore persistence errors
  }
}

function clearDraft(userId: string, session: 'morning' | 'evening', dateKey: string) {
  try {
    window.localStorage.removeItem(getDraftKey(userId, session, dateKey))
  } catch {
    // ignore persistence errors
  }
}

const EVENING_QUESTIONS: DailyQuestion[] = [
  {
    id: 'energy_in',
    label: 'Що мене сьогодні наповнило енергією?',
    hint: 'Люди, дії, ситуації, стани.',
    placeholder: 'Мене сьогодні наповнило: ...',
    type: 'text',
  },
  {
    id: 'energy_out',
    label: 'Де я сьогодні злила енергію чи втратила стан?',
    hint: 'Тригер, сумнів, ситуація, реакція.',
    placeholder: 'Я сьогодні злила енергію в: ...',
    type: 'text',
  },
  {
    id: 'program',
    label: 'Яка програма або переконання активувалась сьогодні?',
    hint: 'Наприклад: страх, "мені не вийде", "я не заслуговую"...',
    placeholder: 'У мене сьогодні активувалась програма: ...',
    type: 'text',
  },
  {
    id: 'power_source',
    label: 'З якої точки я діяла сьогодні: сили чи страху?',
    hint: 'Чесна відповідь. Що керувало тобою?',
    placeholder: 'Мною сьогодні керувала/керував: ...',
    type: 'text',
  },
  {
    id: 'win',
    label: 'Яка моя головна перемога сьогодні?',
    hint: 'Дія, стан, рішення — будь-який успіх.',
    placeholder: 'Сьогодні я: ...',
    type: 'text',
  },
]

type DailyCycleFlowProps = {
  embedded?: boolean
  initialSession?: 'morning' | 'evening'
  initialDateKey?: string
  onClose?: () => void
  onComplete?: () => void
  onOpenMicroTasks?: (dateKey?: string) => void
  onOpenProgress?: () => void
}

function getDateKey(daysOffset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getSessionAnswersFromContent(content: unknown, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const sessionContent = (content as Record<string, unknown>)[session]
  if (!sessionContent || typeof sessionContent !== 'object' || Array.isArray(sessionContent)) return null
  return sessionContent as Record<string, string>
}

function getSessionMeta(content: unknown, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'
  const meta = (content as Record<string, unknown>)[metaKey]
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  return meta as Record<string, unknown>
}

function getSessionResumeIndex(content: unknown, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  if (!meta) return 0
  const rawIndex = typeof (meta as Record<string, unknown>).lastQuestionIndex === 'number'
    ? (meta as Record<string, unknown>).lastQuestionIndex as number
    : 0
  return Math.max(0, rawIndex)
}

function getSessionCompletedAt(content: unknown, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  return typeof meta?.completedAt === 'string' ? meta.completedAt : null
}

function formatCompactDateKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return dayKey
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
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
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '')
  const { data: trial } = useGetTrialStatusQuery()
  const { dayNumber: journeyDay } = useUserProgress()
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const hasAccess = Boolean(
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
    refresh: refetchMicroTasks,
  } = useMicroTasks()
  const sessionSyncKeyRef = useRef<string | null>(null)
  const recoveryEntry = useMemo(() => {
    if (!recoveryMode) return null
    return requestedEntry ?? dailyHistory?.find((entry) => toDateKey(entry.date) === dateKey) ?? null
  }, [dailyHistory, dateKey, recoveryMode, requestedEntry])
  const sessionEntry = requestedEntry ?? (recoveryMode ? recoveryEntry : todayEntry)
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
      || morningAnswersCount >= STATIC_MORNING_QUESTION_KEYS.length
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
  const eveningAnalysisChecklist = useMemo(() => {
    if (session !== 'evening') return []

    return [
      {
        label: 'Що сьогодні дало відчуття руху',
        done: Boolean((answers.energy_in ?? '').trim() || (answers.win ?? '').trim()),
      },
      {
        label: 'Що зупиняло або забирало енергію',
        done: Boolean((answers.energy_out ?? '').trim() || (answers.program ?? '').trim()),
      },
      {
        label: 'Одна дія на завтра, яка точно має відбутись',
        done: Boolean((answers.power_source ?? '').trim() || (answers.win ?? '').trim()),
      },
    ]
  }, [answers.energy_in, answers.energy_out, answers.program, answers.power_source, answers.win, session])

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
      recoveryEntryId: recoveryEntry?.id ?? null,
      sessionEntryId: sessionEntry?.id ?? null,
    })
  }, [
    answers,
    dateKey,
    eveningAnalysisPending,
    recoveryEntry?.id,
    recoveryMode,
    session,
    sessionAlreadyCompleted,
    sessionCompletedAt,
    sessionEntry?.id,
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
      sessionEntryId: sessionEntry?.id ?? null,
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
    sessionEntry?.id,
    step,
  ])

  useEffect(() => {
    if (!submitted || session !== 'morning') return
    if (todayGeneratedTasks.length > 0) {
      setMicrotaskGenerationState('idle')
      return
    }

    let attempts = 0
    const maxAttempts = 6
    setMicrotaskGenerationState('waiting')

    console.log('[DailyCycle] success screen mounted, waiting for microtasks', {
      session,
      dateKey,
      currentTasks: todayGeneratedTasks.length,
    })

    const timer = window.setInterval(() => {
      attempts += 1
      console.log('[DailyCycle] polling for generated microtasks', {
        attempt: attempts,
        maxAttempts,
        dateKey,
      })
      void refetchMicroTasks()
      void refetchTodayEntry()

      if (attempts >= maxAttempts) {
        window.clearInterval(timer)
        setMicrotaskGenerationState('timeout')
        toast.error('Мікрозавдання ще не зʼявились. Можна продовжити без очікування.')
        console.log('[DailyCycle] stopped waiting for generated microtasks', {
          attempts,
          foundTasks: todayGeneratedTasks.length,
        })
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [dateKey, refetchMicroTasks, refetchTodayEntry, session, submitted, todayGeneratedTasks.length])

  useEffect(() => {
    if (!submitted || session !== 'morning') {
      setMicrotaskGenerationState('idle')
      return
    }

    if (todayGeneratedTasks.length > 0) {
      setMicrotaskGenerationState('idle')
    }
  }, [session, submitted, todayGeneratedTasks.length])

  useEffect(() => {
    if (!shouldRedirectCompletedRecoveryMorning) return

    console.info('[DailyCycle] recovery morning already completed, redirecting to tasks', {
      dateKey,
      recoveryMode,
      session,
      sessionAlreadyCompleted,
      morningAnswersCount,
      morningHasGeneratedTasks,
      sessionCompletedAt,
    })

    if (embedded) {
      onOpenMicroTasks?.(dateKey)
      return
    }

    navigate(`/dashboard/tasks?date=${dateKey}`, { replace: true })
  }, [
    dateKey,
    embedded,
    morningAnswersCount,
    morningHasGeneratedTasks,
    navigate,
    onOpenMicroTasks,
    recoveryMode,
    session,
    sessionAlreadyCompleted,
    sessionCompletedAt,
    shouldRedirectCompletedRecoveryMorning,
  ])
  const shellClassName = embedded
    ? 'space-y-4'
    : 'mx-auto max-w-xl space-y-4 p-4'

  if (shouldRedirectCompletedRecoveryMorning && !embedded) {
    return <Navigate to={`/dashboard/tasks?date=${dateKey}`} replace />
  }

  useEffect(() => {
    setSubmitted(sessionAlreadyCompleted)
    setValidationMessage(null)

    if (sessionAlreadyCompleted) {
      setAnswers(sessionAnswersFromContent ?? {})
      setStep(0)
      if (session === 'morning') {
        setQuestionSnapshot(morningQuestionSeed)
      } else {
        setQuestionSnapshot(EVENING_QUESTIONS)
      }
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

      setAnswers(initialAnswers)
      setStep(initialStep)
      setQuestionSnapshot(
        session === 'morning'
          ? morningQuestionSeed
          : draft?.questions && draft.questions.length > 0
            ? draft.questions
            : EVENING_QUESTIONS,
      )
      lastSyncedSessionRef.current = syncKey
    }
  }, [dateKey, morningQuestionSeed, recoveryMode, session, sessionAlreadyCompleted, sessionAnswersFromContent, sessionResumeIndex, userId])

  useEffect(() => {
    if (!cycleState.hasUnfinishedYesterday || recoveryMode || initialDateKey) return

    const unfinishedDate = cycleState.yesterdayEntry?.date
      ? toDateKey(cycleState.yesterdayEntry.date)
      : null
    if (!unfinishedDate) return

    setRecoveryDateKey(current => current ?? unfinishedDate)
  }, [cycleState.hasUnfinishedYesterday, cycleState.yesterdayEntry?.date, initialDateKey, recoveryMode])

  useEffect(() => {
    if (session !== 'evening') {
      setEveningAnalysisPending(false)
      return
    }

    const hasRecoveredEveningAnswers = Boolean(sessionAnswersFromContent && Object.keys(sessionAnswersFromContent).length > 0)
    if (!hasRecoveredEveningAnswers) return

    const needsAnalysis = !sessionAlreadyCompleted
    console.info('[DailyCycle] evening recovery state', {
      session,
      dateKey,
      hasRecoveredEveningAnswers,
      sessionAlreadyCompleted,
      sessionFinalizedAt,
      sessionFinalizedSession,
      needsAnalysis,
    })

    setEveningAnalysisPending(needsAnalysis)
  }, [dateKey, session, sessionAlreadyCompleted, sessionAnswersFromContent, sessionFinalizedAt, sessionFinalizedSession])

  useEffect(() => {
    if (session !== 'morning' || sessionAlreadyCompleted) return
    const hasStarted = step > 0 || Object.keys(answers).length > 0
    if (hasStarted || questionSnapshot.length > 0) return
    setQuestionSnapshot(morningQuestionSeed)
  }, [answers, morningQuestionSeed, questionSnapshot.length, session, sessionAlreadyCompleted, step])

  useEffect(() => {
    if (sessionAlreadyCompleted) return
    saveDraft(userId, session, dateKey, { answers, step, questions })
  }, [answers, dateKey, questions, session, sessionAlreadyCompleted, step, userId])

  useEffect(() => {
    if (session !== 'morning' || recoveryMode || sessionAlreadyCompleted) return
    if (cycleState.activeStep.step !== 'morning') return
    const resumeFrom = cycleState.activeStep.resumeFrom
    if (resumeFrom <= 0) return

    setStep(current => (current === 0 ? resumeFrom : current))
  }, [cycleState.activeStep, recoveryMode, session, sessionAlreadyCompleted])

  useEffect(() => {
    if (session !== 'evening' || recoveryMode || sessionAlreadyCompleted) return
    if (cycleState.activeStep.step !== 'evening') return
    const resumeFrom = cycleState.activeStep.resumeFrom
    if (resumeFrom <= 0) return

    setStep(current => (current === 0 ? resumeFrom : current))
  }, [cycleState.activeStep, recoveryMode, session, sessionAlreadyCompleted])

  useEffect(() => {
    if (embedded) return
    if (!userId || !telegramStatus?.botActive) return
    if (sessionAlreadyCompleted) return

    const syncKey = `${userId}:${session}:${dateKey}`
    if (sessionSyncKeyRef.current === syncKey) return
    sessionSyncKeyRef.current = syncKey

    const submitDate = `${dateKey}T12:00:00.000Z`
    void sendSessionHandoff({
      session,
      step,
      answers,
      date: submitDate,
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
    step,
    telegramStatus?.botActive,
    userId,
  ])

  if (!hasAccess && !recoveryMode && !isSessionRoute) {
    const isPausedTrial = mentorLifecycleState === 'paused_trial_ended'
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
      <div className={embedded ? 'p-4' : 'flex min-h-[60vh] flex-col items-center justify-center p-6'}>
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
              ЩОДЕННИЙ ЦИКЛ
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {isPausedTrial ? 'Твій цикл поставлено на паузу' : 'Зафіксуй свій стан дня'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isPausedTrial
                ? 'Пробний період уже завершився. Звіти та історія лишилися доступними, а нові сесії відкриються після підписки.'
                : 'Доступно з активним тріалом або підпискою.'}
            </p>
          </div>
          <div className="p-4 space-y-3">
            <button
              type="button"
              className="hero-cta-primary w-full py-3 text-sm font-medium"
              onClick={() => navigate('/dashboard/ai-mentor')}
            >
              ▶ Розпочати 7 днів безкоштовно
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isHistoricalLockedDate) {
    return (
      <div className={embedded ? 'p-4' : 'flex min-h-[60vh] flex-col items-center justify-center p-6'}>
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
              ЩОДЕННИЙ ЦИКЛ
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Цей день уже в історії
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Продовжити можна лише вчорашній день. Для старіших дат відкрий щоденник як історію.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <button
              type="button"
              className="hero-cta-primary w-full py-3 text-sm font-medium"
              onClick={() => navigate('/dashboard/journal')}
            >
              Відкрити щоденник
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    const handleFinishDay = async () => {
      try {
        const submitDate = `${dateKey}T12:00:00.000Z`
        await submitDailyCycle({
          session,
          answers,
          date: submitDate,
          finalize: true,
        }).unwrap()
      } catch {
        toast.error('Не вдалося завершити день. Спробуйте ще раз.')
        return
      }

      try {
        await Promise.all([
          refetchTodayEntry(),
          refetchDailyHistory(),
        ])
      } catch {
        // ignore refresh issues, continue closing the session
      }

      if (embedded) {
        await Promise.resolve(onComplete?.())
        return
      }

      navigate('/dashboard/ai-mentor?section=cycle')
    }

    return (
      <SessionSuccess
        session={session}
        loadingTasks={session === 'morning' && todayGeneratedTasks.length === 0 && microtaskGenerationState === 'waiting'}
        tasksReady={session !== 'morning' || todayGeneratedTasks.length > 0}
        allowContinueWhileLoading={session === 'morning' && todayGeneratedTasks.length === 0}
        embedded={embedded}
        analysisText={
          session === 'evening'
            ? (typeof sessionEntry?.aiAnalysis === 'string' && sessionEntry.aiAnalysis.trim().length > 0
              ? sessionEntry.aiAnalysis
              : typeof normalizedContent?.analysis === 'string'
                ? normalizedContent.analysis
                : null)
            : null
        }
        onGoToTasks={() => {
          if (embedded) {
            onOpenMicroTasks?.(dateKey)
            return
          }
          navigate(`/dashboard/tasks?date=${dateKey}`)
        }}
        onFinishDay={() => {
          console.info('[DailyCycle] finish day requested', {
            session,
            dateKey,
            recoveryMode,
            eveningAnalysisPending,
            sessionAlreadyCompleted,
            step,
            answerKeys: Object.keys(answers),
          })
          void handleFinishDay()
        }}
      />
    )
  }

  const handleNext = async () => {
    if (!answers[currentQ.id]?.trim()) {
      setValidationMessage('Потрібно відповісти на питання, щоб перейти далі.')
      return
    }

    setValidationMessage(null)

    if (sessionEntry?.id) {
      try {
        await saveSessionAnswer({
          entryId: sessionEntry.id,
          session,
          questionId: currentQ.id,
          answer: (answers[currentQ.id] ?? '').trim(),
          date: `${dateKey}T12:00:00.000Z`,
          lastQuestionIndex: Math.min(step + 1, questions.length - 1),
        }).unwrap()
      } catch (error) {
        console.warn('[DailyCycle] step autosave failed', {
          session,
          dateKey,
          step,
          error,
        })
      }
    }

    if (isLastStep) {
      setIsSubmitting(true)
      try {
        const submitDate = `${dateKey}T12:00:00.000Z`
        console.log('[DailyCycle] submitting session', {
          session,
          stepCount: questions.length,
          answerKeys: Object.keys(answers),
          date: submitDate,
        })
        const saved = await submitDailyCycle({
          session,
          answers,
          date: submitDate,
          finalize: session === 'morning',
        }).unwrap()
        setSubmittedEntryId(saved.id)

        clearDraft(userId, session, dateKey)
        if (hasAccess && !recoveryMode) {
          await refetchTodayEntry()
        }
        if (session === 'evening') {
          console.info('[DailyCycle] evening session saved, waiting for final confirmation', {
            dateKey,
            session,
            answerKeys: Object.keys(answers),
            savedEntryId: saved.id,
          })
          setEveningAnalysisPending(true)
          setSubmitted(false)
          return
        }

        void refetchMicroTasks()
        setSubmitted(true)
        console.log('[DailyCycle] session submitted successfully', {
          session,
          dateKey,
        })
      } catch (e) {
        console.error('[DailyCycle] submit failed:', e)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setStep(s => s + 1)
  }

  const handleOpenTelegram = async () => {
    console.log('[DailyCycle] open telegram resume clicked', {
      session,
      embedded,
      botActive: telegramStatus?.botActive ?? false,
      hasTelegramLink: Boolean(telegramLinkData?.url),
      answerKeys: Object.keys(answers),
    })

    if (!telegramStatus?.botActive) {
      if (telegramLinkData?.url) {
        window.open(telegramLinkData.url, '_blank', 'noopener,noreferrer')
      }
      return
    }

    try {
      const submitDate = `${dateKey}T12:00:00.000Z`
      const result = await generateDeepLink({
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        payload: {
          session,
          step,
          answers,
          date: submitDate,
        },
      }).unwrap()

      console.log('[DailyCycle] telegram resume deep link generated', {
        session,
        step,
        telegramUrl: result.telegramUrl,
      })
      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('[DailyCycle] telegram resume link failed:', error)
      if (telegramLinkData?.url) {
        window.open(telegramLinkData.url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const handleAnswerBlur = () => {
    if (session !== 'morning') return
    const submitDate = `${dateKey}T12:00:00.000Z`
    void saveMorningAnswer({
      date: submitDate,
      answers,
    }).unwrap().catch(error => {
      console.warn('[DailyCycle] morning autosave failed', {
        session,
        dateKey,
        error,
      })
    })
  }

  const displayedDayNumber = recoveryMode
    ? Math.max(1, (journeyDay || 1) - 1)
    : (journeyDay || 1)
  const recoveryHeaderLabel = recoveryMode
    ? `Завершення вчорашнього дня · ${formatCompactDateKey(dateKey)}`
    : null

  return (
    <div className={shellClassName}>
      <div className="flex items-center gap-3">
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hero-cta-secondary px-3 py-1.5 text-xs"
          >
            ← Кабінет
          </button>
        )}
        {embedded && (
          <div className="ml-auto" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(['morning', 'evening'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSession(s)
                setSubmittedEntryId(null)
                setStep(0)
                setAnswers({})
                setSubmitted(false)
                if (s === 'morning') {
                  setQuestionSnapshot(morningQuestionSeed)
                  return
                }
                setQuestionSnapshot(EVENING_QUESTIONS)
              }}
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition-all',
                session === s
                  ? 'border border-[rgba(var(--accent-soft-rgb),0.58)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(var(--accent-rgb),0.08))] text-[rgb(var(--accent-soft-rgb))] shadow-[0_0_18px_rgba(var(--accent-soft-rgb),0.14),inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {s === 'morning' ? '🌞 Ранок' : '🌙 Вечір'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (embedded) {
                onOpenMicroTasks?.()
                return
              }
              navigate('/dashboard/ai-mentor?section=microtasks')
            }}
            className="rounded-xl border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-[var(--text-secondary)] transition-all hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)]"
          >
            📋 Мікрозавдання
          </button>
          {!embedded && (
            <button
              type="button"
              onClick={() => { void handleOpenTelegram() }}
              disabled={isGeneratingTelegramResume || isSendingSessionHandoff}
              className={[
                'rounded-xl border px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition-all',
                'border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--accent-soft-rgb))]',
                (isGeneratingTelegramResume || isSendingSessionHandoff) ? 'opacity-70' : 'hover:border-[rgba(var(--accent-soft-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.14)]',
              ].join(' ')}
            >
              {telegramStatus?.botActive
                ? (isGeneratingTelegramResume ? 'Відкриваємо Telegram...' : '💬 Відповідати в Telegram')
                : (isTelegramLinkLoading ? 'Генеруємо Telegram...' : 'Підключити Telegram')}
            </button>
          )}
        </div>
        {embedded && (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Закрити сесію"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {session === 'evening' && eveningAnalysisPending ? (
        <SessionSuccess
          session="evening"
          embedded={embedded}
          stage="analysis"
          analysisChecklist={eveningAnalysisChecklist}
          analysisText={
            typeof sessionEntry?.aiAnalysis === 'string' && sessionEntry.aiAnalysis.trim().length > 0
              ? sessionEntry.aiAnalysis
              : typeof normalizedContent?.analysis === 'string'
                ? normalizedContent.analysis
                : null
          }
          onGoToTasks={() => {
            if (embedded) {
              onOpenMicroTasks?.()
              return
            }
            navigate('/dashboard/tasks')
          }}
          onFinishDay={() => {
            void (async () => {
              try {
                console.info('[DailyCycle] analysis confirmation clicked', {
                  session,
                  dateKey,
                  recoveryMode,
                  eveningAnalysisPending,
                  sessionAlreadyCompleted,
                  answerKeys: Object.keys(answers),
                })
                const submitDate = `${dateKey}T12:00:00.000Z`
                console.info('[DailyCycle] finalizing evening session', {
                  session,
                  dateKey,
                  answerKeys: Object.keys(answers),
                  submitDate,
                })
                await submitDailyCycle({
                  session: 'evening',
                  answers,
                  date: submitDate,
                  finalize: true,
                }).unwrap()
                await Promise.all([
                  refetchTodayEntry(),
                  refetchDailyHistory(),
                ])
                setEveningAnalysisPending(false)
                if (embedded) {
                  await Promise.resolve(onComplete?.())
                  return
                }
                if (recoveryMode) {
                  console.info('[DailyCycle] recovery finalized, opening today morning', {
                    dateKey,
                    todayDateKey,
                  })
                  navigate('/dashboard/cycle?session=morning')
                  return
                }
                navigate('/dashboard/ai-mentor?section=cycle')
              } catch (error) {
                console.error('[DailyCycle] finalize evening failed', {
                  session,
                  dateKey,
                  error,
                })
                toast.error('Не вдалося завершити вечір. Спробуйте ще раз.')
              }
            })()
          }}
        />
      ) : (
      <SessionView
        session={session}
        dayNumber={displayedDayNumber}
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
      )}
    </div>
  )
}

export default function DailyCyclePage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('section', 'cycle')

  return <Navigate to={`/dashboard/ai-mentor?${params.toString()}`} replace />
}
