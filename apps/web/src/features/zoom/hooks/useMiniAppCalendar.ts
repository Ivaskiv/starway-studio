import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useTelegramMiniAppAuthMutation } from '@/features/auth/services/auth.api'
import {
  selectAuthStatus,
  selectCurrentUser,
  selectUserRole,
} from '@/features/auth/services/auth.slice'
import {
  useRegisterAttendeeMutation,
  useSubmitBookingQuestionMutation,
} from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { api } from '@/services/api'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCalendarData } from './useCalendarData'
import { useAccessActions } from './useAccessActions'
import {
  getVisibleWeekSessions,
  isDirectZoomBookingRequest,
  isGroupPracticeBookingSession,
  normalizeZoomHubSession,
  readDirectZoomBookingParams,
  resolveDirectZoomBookingState,
  resolveNextSessionQuestionSummary,
  resolveNextZoomBoundaryAt,
  resolveTelegramMiniAppAuthInitData,
  resolveUpcomingZoomSessions,
  resolveZoomAccessState,
  resolveZoomCalendarEntryMode,
  resolveZoomHubEmptyState,
  resolveZoomHubPrimaryAction,
  shouldPrimeDirectBooking,
} from '../utils/zoomCalendar.utils'
import {
  isCoachRole,
  performBookingScreenRegistration,
  ZOOM_BOUNDARY_REFRESH_BUFFER_MS,
} from '../utils/zoomCalendarRoute.utils'
export function useMiniAppCalendar() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const authStatus = useAppSelector(selectAuthStatus)
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  const isCoach = isCoachRole(role)
  const { authRestoreStatus, canRunProtectedQueries } = useSessionOrchestrator()
  const {
    zoomAccess,
    isLoading: isAccessLoading,
    isError: isAccessError,
  } = useSystemState()
  const routeSearch = location.search
  const entryMode = resolveZoomCalendarEntryMode(routeSearch)
  const isBookingEntry = entryMode === 'booking'
  const {
    usePublicBookingSchedule,
    weekRange,
    rawCurrentWeekSessions,
    isCurrentWeekLoading,
    isCurrentWeekError,
    refetchCurrentWeek,
    publicUpcomingSession,
    isPublicUpcomingLoading,
    isPublicUpcomingError,
    upcomingSession,
    isUpcomingLoading,
    isUpcomingError,
    refetchUpcoming,
    mySessions,
    previousSessionRecap,
    isMySessionsLoading,
    isMySessionsError,
    refetchMySessions,
  } = useCalendarData({
    hasUser: Boolean(user),
    userId: user?.id ?? '',
    isCoach,
    isBookingEntry,
    authRestoreStatus,
    canRunProtectedQueries,
  })
  const [telegramMiniAppAuth] = useTelegramMiniAppAuthMutation()
  const [registerAttendee] = useRegisterAttendeeMutation()
  const [submitBookingQuestion, { isLoading: isSubmittingBookingQuestion }] =
    useSubmitBookingQuestionMutation()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [bookingSuccessSessionId, setBookingSuccessSessionId] = useState<
    string | null
  >(null)
  const [questionSessionId, setQuestionSessionId] = useState<string | null>(
    null
  )
  const [bookingQuestionText, setBookingQuestionText] = useState('')
  const [bookingQuestionError, setBookingQuestionError] = useState<
    string | null
  >(null)
  const [questionSubmittedSessionId, setQuestionSubmittedSessionId] = useState<
    string | null
  >(null)
  const [questionSkippedSessionId, setQuestionSkippedSessionId] = useState<
    string | null
  >(null)
  const [showQuestionInput, setShowQuestionInput] = useState(false)
  const [primedDirectSessionId, setPrimedDirectSessionId] = useState<
    string | null
  >(null)
  const [directBookingExpired, setDirectBookingExpired] = useState(false)
  const authBootstrapStartedRef = useRef(false)
  const directBookingParams = readDirectZoomBookingParams(routeSearch)
  const scheduleSessions = usePublicBookingSchedule
    ? []
    : rawCurrentWeekSessions
  const currentWeekSessions = scheduleSessions.map((session) =>
    normalizeZoomHubSession(session, {
      type: session.type as ZoomWeekOverview['sessions'][number]['type'],
      attendeesCount: session.attendeesCount ?? 0,
      questionPreviews: session.questionPreviews ?? [],
      questionsCount: session.questionsCount ?? 0,
      remainingQuestionsCount: session.remainingQuestionsCount ?? 0,
      isMyBooking: session.isMyBooking ?? false,
      audioFileId: session.audioFileId ?? null,
      hasAudio: Boolean(session.audioFileId),
      zoomLink: session.zoomLink ?? '',
    })
  )
  const now = new Date()
  const accessState = resolveZoomAccessState({
    authRestoreStatus,
    canRunProtectedQueries,
    isAccessLoading,
    zoomAccess,
  })
  const hasZoomHubAccess = accessState === 'active'
  const isDirectBooking =
    isDirectZoomBookingRequest(directBookingParams) && !directBookingExpired
  const directSessionId = directBookingParams.sessionId
  const effectiveUpcomingSession =
    upcomingSession ??
    (usePublicBookingSchedule ? publicUpcomingSession : null)
  const canonicalSessions = resolveUpcomingZoomSessions({
    currentWeekSessions: currentWeekSessions.filter(
      isGroupPracticeBookingSession
    ),
    upcomingSession: effectiveUpcomingSession,
    mySessions,
    now,
  })
  const nextSession = canonicalSessions.nextSession
  const directSession = isDirectBooking
    ? (canonicalSessions.upcomingSessions.find(
        (session) => session.id === directSessionId
      ) ?? (nextSession?.id === directSessionId ? nextSession : null))
    : null
  const isScheduleLoading = usePublicBookingSchedule
    ? isPublicUpcomingLoading
    : isCurrentWeekLoading || isUpcomingLoading || isMySessionsLoading
  const isScheduleError = usePublicBookingSchedule
    ? isPublicUpcomingError
    : isCurrentWeekError || isUpcomingError || isMySessionsError
  const directBookingState = resolveDirectZoomBookingState({
    isDirectBooking,
    accessState,
    isScheduleLoading,
    hasDirectSession: Boolean(directSession),
  })
  const isCalendarLoading = isBookingEntry
    ? isScheduleLoading
    : !isDirectBooking && (accessState === 'loading' || isScheduleLoading)
  const shouldShowCalendarSkeleton =
    isCalendarLoading ||
    directBookingState === 'checking_access' ||
    directBookingState === 'loading_session'
  const shouldShowDirectSessionOnly =
    directBookingState === 'session' && Boolean(directSession)
  const visibleWeekSessions = getVisibleWeekSessions(
    currentWeekSessions,
    nextSession,
    now
  )
  const visibleSessions =
    shouldShowDirectSessionOnly && directSession
      ? [directSession]
      : visibleWeekSessions
  const sessionsCount = shouldShowDirectSessionOnly
    ? 1
    : canonicalSessions.visibleSessionCount
  const primaryAction = resolveZoomHubPrimaryAction({
    accessState,
    session: nextSession,
    now,
  })
  const bookingPreviousSessionRecap = previousSessionRecap ?? null
  const bookingNextSession =
    isBookingEntry && upcomingSession
      ? normalizeZoomHubSession(upcomingSession, {
          attendeesCount: upcomingSession.attendeesCount ?? 0,
          questionPreviews: upcomingSession.questionPreviews ?? [],
          questionsCount: upcomingSession.questionsCount ?? 0,
          remainingQuestionsCount:
            upcomingSession.remainingQuestionsCount ?? 0,
          isMyBooking: upcomingSession.isMyBooking ?? false,
          myQuestion: upcomingSession.myQuestion ?? null,
        })
      : nextSession ?? null
  const shouldRenderBookingScreen =
    isBookingEntry && Boolean(bookingPreviousSessionRecap || bookingNextSession)
  const bookingQuestionSummary = bookingNextSession
    ? resolveNextSessionQuestionSummary(bookingNextSession)
    : null
  const emptyState = resolveZoomHubEmptyState({
    hasZoomHubAccess,
    shouldShowDirectSessionOnly,
    nextSession,
    previousSessionRecap,
  })
  const visiblePreviousSessionRecap = previousSessionRecap
  const nextBoundaryAt = resolveNextZoomBoundaryAt(
    canonicalSessions.upcomingSessions,
    now
  )
  useEffect(() => {
    dispatch(
      api.util.invalidateTags([
        'Access',
        'Products',
        'Subscription',
        'ZoomSession',
      ])
    )
  }, [dispatch])
  useEffect(() => {
    if (authBootstrapStartedRef.current) {
      return
    }
    const nextInitData = resolveTelegramMiniAppAuthInitData(
      authStatus,
      (
        window as {
          Telegram?: {
            WebApp?: {
              initData?: string
            }
          }
        }
      ).Telegram?.WebApp?.initData
    )
    if (!nextInitData) {
      return
    }
    authBootstrapStartedRef.current = true
    void telegramMiniAppAuth({ initData: nextInitData })
  }, [authStatus, dispatch, telegramMiniAppAuth])
  useEffect(() => {
    if (!user || authRestoreStatus !== 'ready' || !canRunProtectedQueries) {
      return
    }
    const refetchZoomState = () => {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      void Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
    }
    const handleWindowFocus = () => {
      refetchZoomState()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchZoomState()
      }
    }
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    authRestoreStatus,
    canRunProtectedQueries,
    dispatch,
    refetchCurrentWeek,
    refetchMySessions,
    refetchUpcoming,
    user,
  ])
  useEffect(() => {
    if (
      !nextBoundaryAt ||
      !user ||
      authRestoreStatus !== 'ready' ||
      !canRunProtectedQueries
    ) {
      return
    }
    const timeoutMs = Math.max(
      0,
      nextBoundaryAt.getTime() - Date.now() + ZOOM_BOUNDARY_REFRESH_BUFFER_MS
    )
    const timerId = window.setTimeout(() => {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      void Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
    }, timeoutMs)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [
    authRestoreStatus,
    canRunProtectedQueries,
    dispatch,
    nextBoundaryAt,
    refetchCurrentWeek,
    refetchMySessions,
    refetchUpcoming,
    user,
  ])
  useEffect(() => {
    const sessionId = directSession?.id ?? null
    if (
      !shouldPrimeDirectBooking({
        isDirectBooking,
        isAlreadyBooked: Boolean(directSession?.isMyBooking),
        primedDirectSessionId,
        questionSubmittedSessionId,
        sessionId: directSessionId ?? sessionId,
      })
    ) {
      return
    }
    setActiveSessionId(null)
    setBookingSuccessSessionId(null)
    setQuestionSessionId(directSessionId ?? sessionId)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSkippedSessionId(null)
    setShowQuestionInput(true)
    setMessage(null)
    setPrimedDirectSessionId(directSessionId ?? sessionId)
  }, [
    directSession,
    isDirectBooking,
    directSessionId,
    primedDirectSessionId,
    questionSubmittedSessionId,
  ])
  const openBookingQuestionForm = (sessionId: string) => {
    setActiveSessionId(null)
    setBookingSuccessSessionId(null)
    setQuestionSessionId(sessionId)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSubmittedSessionId(null)
    setQuestionSkippedSessionId(null)
    setShowQuestionInput(true)
    setMessage(null)
  }
  const {
    refreshAccess,
    handleRefreshAccess,
    openPayment,
    handleReportPaymentIssue,
    isOpeningPayment,
    isReportingPaymentIssue,
  } = useAccessActions({
    userId: user?.id ?? null,
    zoomAccess,
    setMessage,
    refetchCurrentWeek,
    refetchUpcoming,
    refetchMySessions,
  })
  const register = async (sessionId: string) => {
    openBookingQuestionForm(sessionId)
  }
  const handleSubmitBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const questionText = bookingQuestionText.trim()
    const selectedSession =
      canonicalSessions.upcomingSessions.find(
        (session) => session.id === sessionId
      ) ?? null
    const shouldCreateBooking =
      !selectedSession?.isMyBooking && questionSubmittedSessionId !== sessionId
    if (!sessionId) return
    if (!questionText) {
      setBookingQuestionError('Напиши питання або ситуацію, щоб надіслати.')
      return
    }
    setBookingQuestionError(null)
    try {
      if (shouldCreateBooking) {
        setActiveSessionId(sessionId)
        try {
          await registerAttendee({ sessionId }).unwrap()
        } catch (error) {
          const normalizedError =
            typeof error === 'object' && error && 'data' in error
              ? (error as { data?: { error?: string } }).data?.error
              : null
          if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
            setMessage('Доступ до Zoom відкривається з активним ФОКУСОМ.')
            return
          }
          if (normalizedError === 'session_not_found') {
            setDirectBookingExpired(true)
            setBookingQuestionError(null)
            setMessage('Це посилання застаріло. Ось актуальні Zoom-сесії.')
            return
          }
          if (normalizedError !== 'ALREADY_BOOKED') {
            setBookingQuestionError(
              'Не вдалося записати. Онови доступ і спробуй ще раз.'
            )
            return
          }
        }
      }
      await submitBookingQuestion({ sessionId, questionText }).unwrap()
      await Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
      setBookingSuccessSessionId(sessionId)
      setQuestionSubmittedSessionId(sessionId)
      setShowQuestionInput(false)
      setBookingQuestionText('')
      setMessage('Ти записана.')
    } catch {
      setBookingQuestionError('Не вдалося надіслати питання. Спробуй ще раз.')
    } finally {
      if (shouldCreateBooking) {
        setActiveSessionId(null)
      }
    }
  }
  const handleSkipBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const selectedSession =
      canonicalSessions.upcomingSessions.find(
        (session) => session.id === sessionId
      ) ?? null
    if (!sessionId) return
    setBookingQuestionError(null)
    try {
      if (
        !selectedSession?.isMyBooking &&
        questionSubmittedSessionId !== sessionId
      ) {
        setActiveSessionId(sessionId)
        const registrationStatus = await performBookingScreenRegistration({
          sessionId,
          registerAttendee,
          refetchCurrentWeek,
          refetchUpcoming,
          refetchMySessions,
        })
        if (registrationStatus === 'no_active_subscription') {
          setMessage('Доступ до Zoom відкривається з активним ФОКУСОМ.')
          return
        }
        if (registrationStatus === 'error') {
          setBookingQuestionError(
            'Не вдалося записати. Онови доступ і спробуй ще раз.'
          )
          return
        }
        setBookingSuccessSessionId(sessionId)
      }
      setQuestionSkippedSessionId(sessionId)
      setShowQuestionInput(false)
      setBookingQuestionText('')
      setMessage('Ти записана.')
    } finally {
      setActiveSessionId(null)
    }
  }
  const handleNextZoomAction = async () => {
    if (primaryAction.action === 'open_access') {
      await openPayment()
      return
    }
    if (!nextSession) {
      return
    }
    if (primaryAction.action === 'book') {
      await register(nextSession.id)
      return
    }
    if (primaryAction.action === 'join' && nextSession.zoomLink) {
      window.open(nextSession.zoomLink, '_blank', 'noopener,noreferrer')
      return
    }
    if (primaryAction.action === 'browse') {
      const sessionCard = document.querySelector<HTMLElement>(
        `[data-session-card="${nextSession.id}"]`
      )
      sessionCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  const handleBookingScreenPrimaryAction = async () => {
    if (!bookingNextSession) {
      return
    }
    if (
      bookingNextSession.isMyBooking ||
      bookingSuccessSessionId === bookingNextSession.id
    ) {
      return
    }
    openBookingQuestionForm(bookingNextSession.id)
  }
  return {
    user,
    isBookingEntry,
    weekRange,
    sessionsCount,
    shouldShowCalendarSkeleton,
    shouldRenderBookingScreen,
    bookingPreviousSessionRecap,
    bookingNextSession,
    bookingSuccessSessionId,
    bookingQuestionSummary,
    activeSessionId,
    visiblePreviousSessionRecap,
    nextSession,
    primaryAction,
    directBookingState,
    isScheduleError,
    isAccessError,
    accessState,
    emptyState,
    hasZoomHubAccess,
    shouldShowDirectSessionOnly,
    visibleSessions,
    isDirectBooking,
    directSessionId,
    message,
    questionSessionId,
    bookingQuestionText,
    bookingQuestionError,
    questionSubmittedSessionId,
    questionSkippedSessionId,
    showQuestionInput,
    isSubmittingBookingQuestion,
    isOpeningPayment,
    isReportingPaymentIssue,
    setBookingQuestionText,
    setQuestionSessionId,
    setQuestionSkippedSessionId,
    setBookingQuestionError,
    setShowQuestionInput,
    register,
    handleSubmitBookingQuestion,
    handleSkipBookingQuestion,
    handleBookingScreenPrimaryAction,
    handleNextZoomAction,
    handleRefreshAccess,
    openPayment,
    handleReportPaymentIssue,
    refreshAccess,
  }
}
export type CleanMiniAppZoomCalendarController = ReturnType<
  typeof useMiniAppCalendar
>
