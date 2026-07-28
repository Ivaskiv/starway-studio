import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator, type AuthRestoreStatus } from '@/features/auth/context/SessionOrchestratorContext'
import { accessApi } from '@/features/auth/services/accessApi'
import { selectCurrentUser, selectUserRole } from '@/features/auth/services/auth.slice'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import {
  useCreateProductPaymentMutation,
  useReportFocusPaymentIssueMutation,
} from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import {
  useGetWeekOverviewQuery,
  useRegisterAttendeeMutation,
  useSubmitBookingQuestionMutation,
} from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel, getSessionMeta } from '@/features/zoom/zoom.utils'
import { api } from '@/services/api'
import { useEffect, useState } from 'react'

function formatWeekDate(value: string): string {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
}

function isCoachRole(role: string | null | undefined): boolean {
  const normalizedRole = String(role ?? '').trim().toUpperCase()
  return normalizedRole === 'EXPERT' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN'
}

type ZoomAccessSnapshot = {
  state: 'NO_ACCESS' | 'FOCUS_ACTIVE' | 'PREMIUM'
  isActive: boolean
  hasFocus: boolean
} | undefined

type DirectZoomBookingParams = {
  action: string | null
  sessionId: string | null
}

export function resolveZoomAccessState(input: {
  authRestoreStatus: AuthRestoreStatus
  canRunProtectedQueries: boolean
  isAccessLoading: boolean
  zoomAccess: ZoomAccessSnapshot
}) {
  if (
    input.isAccessLoading ||
    input.authRestoreStatus !== 'ready' ||
    !input.canRunProtectedQueries ||
    input.zoomAccess === undefined
  ) {
    return 'loading' as const
  }

  if (
    input.zoomAccess.state === 'FOCUS_ACTIVE' &&
    input.zoomAccess.hasFocus === true &&
    input.zoomAccess.isActive
  ) {
    return 'active' as const
  }

  return 'inactive' as const
}

export function hasConfirmedFocusAccess(
  state: {
    zoomAccess?: ZoomAccessSnapshot
  } | null | undefined,
) {
  return Boolean(
    state?.zoomAccess?.state === 'FOCUS_ACTIVE' &&
    state.zoomAccess.hasFocus === true &&
    state.zoomAccess.isActive,
  )
}

export function readDirectZoomBookingParams(search: string): DirectZoomBookingParams {
  const params = new URLSearchParams(search)
  const action = params.get('action')?.trim() ?? ''
  const sessionId = params.get('sessionId')?.trim() ?? ''

  return {
    action: action || null,
    sessionId: sessionId || null,
  }
}

export function isDirectZoomBookingRequest(params: DirectZoomBookingParams): boolean {
  return params.action === 'book' && Boolean(params.sessionId)
}

export function shouldPrimeDirectBooking(input: {
  isDirectBooking: boolean
  isAlreadyBooked: boolean
  primedDirectSessionId: string | null
  questionSubmittedSessionId: string | null
  sessionId: string | null
}) {
  if (!input.isDirectBooking || !input.sessionId || input.isAlreadyBooked) {
    return false
  }

  return (
    input.primedDirectSessionId !== input.sessionId &&
    input.questionSubmittedSessionId !== input.sessionId
  )
}

export function resolveDirectZoomBookingState(input: {
  isDirectBooking: boolean
  accessState: 'loading' | 'active' | 'inactive'
  isScheduleLoading: boolean
  hasDirectSession: boolean
}) {
  if (!input.isDirectBooking) {
    return 'calendar' as const
  }

  if (input.accessState === 'loading') {
    return 'checking_access' as const
  }

  if (input.accessState === 'inactive') {
    return 'locked' as const
  }

  if (input.isScheduleLoading) {
    return 'loading_session' as const
  }

  if (input.hasDirectSession) {
    return 'session' as const
  }

  return 'calendar' as const
}

function pluralizeSessions(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'сесія'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сесії'
  return 'сесій'
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {children}
    </div>
  )
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-white/10 ${className}`} />
}

function ZoomCalendarSkeleton() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="h-4 w-48" />
        </div>
      </Card>
      <Card>
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-44" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6" />
          <div className="grid gap-2 sm:grid-cols-2">
            <SkeletonLine className="h-12 w-full rounded-xl" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </Card>
      <Card>
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-52" />
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-10 w-32 rounded-xl" />
        </div>
      </Card>
    </div>
  )
}

export default function CleanMiniAppZoomCalendar() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  const isCoach = isCoachRole(role)
  const { authRestoreStatus, canRunProtectedQueries } = useSessionOrchestrator()
  const { zoomAccess, isLoading: isAccessLoading, isError: isAccessError } = useSystemState()
  const { data, isLoading: isScheduleLoading, isError: isScheduleError, refetch } =
    useGetWeekOverviewQuery(undefined, {
      skip: !user || authRestoreStatus !== 'ready' || !canRunProtectedQueries,
      refetchOnMountOrArgChange: true,
    })
  const [registerAttendee, { isLoading: isRegistering }] = useRegisterAttendeeMutation()
  const [submitBookingQuestion, { isLoading: isSubmittingBookingQuestion }] =
    useSubmitBookingQuestionMutation()
  const [createProductPayment, { isLoading: isOpeningPayment }] = useCreateProductPaymentMutation()
  const [reportFocusPaymentIssue, { isLoading: isReportingPaymentIssue }] =
    useReportFocusPaymentIssueMutation()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [bookingSuccessSessionId, setBookingSuccessSessionId] = useState<string | null>(null)
  const [questionSessionId, setQuestionSessionId] = useState<string | null>(null)
  const [bookingQuestionText, setBookingQuestionText] = useState('')
  const [bookingQuestionError, setBookingQuestionError] = useState<string | null>(null)
  const [questionSubmittedSessionId, setQuestionSubmittedSessionId] = useState<string | null>(null)
  const [questionSkippedSessionId, setQuestionSkippedSessionId] = useState<string | null>(null)
  const [showQuestionInput, setShowQuestionInput] = useState(false)
  const [primedDirectSessionId, setPrimedDirectSessionId] = useState<string | null>(null)
  const [directBookingExpired, setDirectBookingExpired] = useState(false)
  const directBookingParams =
    typeof window !== 'undefined'
      ? readDirectZoomBookingParams(window.location.search)
      : { action: null, sessionId: null }

  const accessState = resolveZoomAccessState({
    authRestoreStatus,
    canRunProtectedQueries,
    isAccessLoading,
    zoomAccess,
  })
  const hasFocusAccess = accessState === 'active'
  const isDirectBooking = isDirectZoomBookingRequest(directBookingParams) && !directBookingExpired
  const directSessionId = directBookingParams.sessionId
  const directSession =
    isDirectBooking && data
      ? data.sessions.find((session) => session.id === directSessionId) ?? null
      : null
  const directBookingState = resolveDirectZoomBookingState({
    isDirectBooking,
    accessState,
    isScheduleLoading,
    hasDirectSession: Boolean(directSession),
  })
  const isCalendarLoading = !isDirectBooking && (accessState === 'loading' || isScheduleLoading)
  const shouldShowCalendarSkeleton =
    isCalendarLoading
    || directBookingState === 'checking_access'
    || directBookingState === 'loading_session'
  const shouldShowDirectSessionOnly = directBookingState === 'session' && Boolean(directSession)
  const visibleSessions = shouldShowDirectSessionOnly && directSession
    ? [directSession]
    : (data?.sessions ?? [])
  const sessionsCount = visibleSessions.length

  useEffect(() => {
    dispatch(api.util.invalidateTags(['Access', 'Products', 'Subscription', 'ZoomSession']))
  }, [dispatch])

  useEffect(() => {
    if (!user || !import.meta.env.DEV || accessState === 'loading') return
    console.info('[ZOOM_CALENDAR_ACCESS]', {
      userId: user.id,
      zoomAccess,
      accessState,
    })
  }, [accessState, user, zoomAccess])

  useEffect(() => {
    const sessionId = directSession?.id ?? null
    if (!shouldPrimeDirectBooking({
      isDirectBooking,
      isAlreadyBooked: Boolean(directSession?.isMyBooking),
      primedDirectSessionId,
      questionSubmittedSessionId,
      sessionId: directSessionId ?? sessionId,
    })) {
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

  const refreshAccess = async () => {
    setMessage(null)
    const telegramUserId =
      (window as {
        Telegram?: {
          WebApp?: {
            initDataUnsafe?: {
              user?: { id?: number }
            }
          }
        }
      }).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null
    const endpoint = '/access/state'
    const zoomAccessBeforeRefresh = zoomAccess
    let responseBody: unknown = null
    let httpStatus: number | null = null
    let focusAccessConfirmed = false

    try {
      const accessResponse = await dispatch(
        accessApi.endpoints.getMySystemState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      )

      if ('data' in accessResponse) {
        const nextSystemState = accessResponse.data
        responseBody = nextSystemState
        httpStatus = 200
        if (nextSystemState) {
          dispatch(
            accessApi.util.upsertQueryData(
              'getMySystemState',
              undefined,
              nextSystemState,
            ),
          )
          focusAccessConfirmed = hasConfirmedFocusAccess(nextSystemState)
        }
      } else {
        responseBody = accessResponse.error
        httpStatus =
          typeof accessResponse.error === 'object' &&
          accessResponse.error &&
          'status' in accessResponse.error
            ? Number(accessResponse.error.status ?? 0) || null
            : null
      }
    } catch (error) {
      responseBody = error
    }

    if (focusAccessConfirmed) {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      await refetch()
    }

    console.info('[ZOOM_ACCESS_REFRESH_FRONTEND]', {
      telegramUserId,
      authSessionUserId: user?.id ?? null,
      endpoint,
      httpStatus,
      responseBody,
      zoomAccessBeforeRefresh,
      zoomAccessAfterRefresh:
        typeof responseBody === 'object' && responseBody
          ? (responseBody as { zoomAccess?: unknown }).zoomAccess ?? null
          : null,
    })

    if (focusAccessConfirmed) {
      setMessage('Доступ оновлено.')
      return
    }

    setMessage('Доступ ще не підтверджено. Якщо вже оплатила, натисни ПРОБЛЕМИ З ОПЛАТОЮ.')
  }

  const handleRefreshAccess = async () => {
    await refreshAccess()
  }

  const openPayment = async () => {
    setMessage(null)
    try {
      const response = await createProductPayment({
        productId: 'focus',
        planCode: '1month',
        source: 'web',
        targetPath: '/miniapp/zoom-calendar?payment=success',
      }).unwrap()

      if (response.status === 'already_active') {
        await refreshAccess()
        return
      }

      const checkoutUrl = response.checkoutUrl ?? response.paymentUrl
      if (!checkoutUrl) {
        setMessage('Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.')
        return
      }

      openExternalPaymentUrl(checkoutUrl)
    } catch (err) {
      const paymentError =
        typeof err === 'object' && err
          ? (err as {
              status?: number | string
              data?: { error?: string; message?: string } | string | null
            })
          : null
      const errorMessage =
        typeof paymentError?.data === 'object' && paymentError.data
          ? paymentError.data.error ?? paymentError.data.message ?? null
          : typeof paymentError?.data === 'string'
            ? paymentError.data
            : null

      console.error('[FOCUS_PAYMENT_OPEN_ERROR]', {
        status: paymentError?.status ?? null,
        data: paymentError?.data ?? null,
        error: err,
      })
      setMessage(errorMessage ?? 'Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.')
    }
  }

  const handleReportPaymentIssue = async () => {
    setMessage(null)
    try {
      await reportFocusPaymentIssue().unwrap()
      setMessage('Проблему з оплатою передано в STARWAY OPS. Перевіряємо транзакцію.')
    } catch {
      setMessage('Не вдалося зафіксувати проблему з оплатою. Спробуй ще раз.')
    }
  }

  const register = async (sessionId: string) => {
    openBookingQuestionForm(sessionId)
  }

  const handleSubmitBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const questionText = bookingQuestionText.trim()
    const selectedSession = data?.sessions.find((session) => session.id === sessionId) ?? null
    const shouldCreateBooking = !selectedSession?.isMyBooking && questionSubmittedSessionId !== sessionId

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
            setBookingQuestionError('Не вдалося записати. Онови доступ і спробуй ще раз.')
            return
          }
        }
      }

      await submitBookingQuestion({ sessionId, questionText }).unwrap()
      await refetch()
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

  const handleSkipBookingQuestion = () => {
    if (questionSessionId) {
      setQuestionSkippedSessionId(questionSessionId)
    }
    setShowQuestionInput(false)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setMessage('Ти записана.')
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Zoom-календар
            </p>
            <h1 className="mt-1 text-xl font-semibold">Поточний тиждень</h1>
            {data ? (
              <p className="mt-1 text-sm text-white/55">
                {formatWeekDate(data.week.from)} — {formatWeekDate(data.week.to)} · {data.week.timezone}
              </p>
            ) : null}
          </div>
          {data ? (
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
              {sessionsCount} {pluralizeSessions(sessionsCount)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {shouldShowCalendarSkeleton ? <ZoomCalendarSkeleton /> : null}

          {!shouldShowCalendarSkeleton && directBookingState !== 'locked' && (isAccessError || isScheduleError || !data) ? (
            <Card>
              <p className="font-semibold">Не вдалося завантажити календар.</p>
              <button
                type="button"
                onClick={() => void handleRefreshAccess()}
                className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Спробувати ще раз
              </button>
            </Card>
          ) : null}

          {accessState === 'inactive' ? (
            <Card>
              <p className="font-semibold">Доступ до Zoom ще не підтверджено.</p>
              <p className="mt-1 text-sm text-white/65">
                Уже оплатила — спочатку онови статус. Не оплатила — відкрий оплату.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleRefreshAccess()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  ОНОВИТИ ДОСТУП
                </button>
                <button
                  type="button"
                  onClick={() => void openPayment()}
                  disabled={isOpeningPayment}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
                >
                  {isOpeningPayment ? 'ВІДКРИВАЄМО…' : 'ОПЛАТИТИ ФОКУС'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleReportPaymentIssue()}
                disabled={isReportingPaymentIssue}
                className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                {isReportingPaymentIssue ? 'ФІКСУЄМО ПРОБЛЕМУ…' : 'ПРОБЛЕМИ З ОПЛАТОЮ'}
              </button>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton && data && hasFocusAccess && sessionsCount === 0 ? (
            <Card>
              <p className="font-semibold">Доступ активний.</p>
              <p className="mt-1 text-sm text-white/65">
                На цей тиждень Zoom-сесій ще немає. Коли коуч додасть практику, вона з’явиться тут.
              </p>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton && data && (hasFocusAccess || shouldShowDirectSessionOnly)
            ? visibleSessions.map((session: ZoomWeekOverview['sessions'][number]) => {
                const isDirectTargetSession = isDirectBooking && directSessionId === session.id
                const isQuestionVisible = showQuestionInput && questionSessionId === session.id
                const showBookedState =
                  bookingSuccessSessionId === session.id ||
                  session.isMyBooking ||
                  questionSubmittedSessionId === session.id

                return (
                  <Card key={session.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {isDirectTargetSession ? (
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                            Обрана Zoom-сесія
                          </p>
                        ) : null}
                        <p className="font-semibold">{session.topic}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {getSessionDateLabel(session.scheduledAt)} · {getSessionMeta(session)}
                        </p>
                      </div>
                      {session.isMyBooking ? (
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Записано
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!session.isMyBooking && !isDirectTargetSession ? (
                        <button
                          type="button"
                          onClick={() => void register(session.id)}
                          disabled={activeSessionId === session.id}
                          className="rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-60"
                        >
                          {activeSessionId === session.id ? 'Відкриваємо…' : 'Записатись'}
                        </button>
                      ) : null}
                      {session.zoomLink ? (
                        <a
                          href={session.zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold"
                        >
                          Відкрити Zoom
                        </a>
                      ) : (
                        <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50">
                          Посилання з’явиться перед практикою
                        </span>
                      )}
                    </div>

                    {showBookedState || isQuestionVisible ? (
                      <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                        {showBookedState ? <p className="font-semibold">Ти записана.</p> : null}

                        {isQuestionVisible ? (
                          <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3">
                            <p className="font-semibold text-emerald-50">З яким питанням ти приходиш?</p>
                            <textarea
                              value={bookingQuestionText}
                              onChange={(event) => setBookingQuestionText(event.target.value)}
                              placeholder="Напиши питання або ситуацію..."
                              rows={3}
                              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                            />
                            {bookingQuestionError ? (
                              <p className="mt-2 text-xs text-amber-100">{bookingQuestionError}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSubmitBookingQuestion()}
                                disabled={isSubmittingBookingQuestion || activeSessionId === session.id}
                                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:opacity-60"
                              >
                                {isSubmittingBookingQuestion || activeSessionId === session.id
                                  ? 'Надсилаємо…'
                                  : 'Надіслати'}
                              </button>
                              {!isDirectTargetSession ? (
                                <button
                                  type="button"
                                  onClick={handleSkipBookingQuestion}
                                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                  Пропустити
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {!showQuestionInput && questionSubmittedSessionId === session.id ? (
                          <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3 text-emerald-100/90">
                            Питання збережено. Повернемось до нього на Zoom.
                          </div>
                        ) : null}

                        {!showQuestionInput && questionSkippedSessionId === session.id ? (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                            <p className="text-emerald-100/90">Можеш додати питання пізніше.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionSessionId(session.id)
                                setQuestionSkippedSessionId(null)
                                setBookingQuestionError(null)
                                setShowQuestionInput(true)
                              }}
                              className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                              Додати питання
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                )
              })
            : null}

          {message ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/80">
              {message}
            </div>
          ) : null}

          {data && hasFocusAccess && isCoach && data.audios.length > 0 ? (
            <section className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Аудіо</p>
              <div className="mt-3 space-y-2">
                {data.audios.map((audio) => (
                  <Card key={audio.sessionId}>
                    <p className="font-medium">{audio.topic}</p>
                    <p className="mt-1 text-xs text-white/55">{getSessionDateLabel(audio.scheduledAt)}</p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
