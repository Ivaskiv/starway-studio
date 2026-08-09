import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectAuthStatus, selectCurrentUser, selectUserRole } from '@/features/auth/services/auth.slice'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useCreateProductPaymentMutation } from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import { CoachZoomPanel, UserZoomPanel } from '@/features/zoom'
import HomeTab from '@/features/zoom/tabs/HomeTab'

import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import CleanMiniAppZoomCalendar from '@/features/zoom/routes/CleanMiniAppZoomCalendar'
import { useGetMySystemStateQuery } from '@/features/auth/services/accessApi'
import { useGetPublicWeekOverviewQuery, useGetWeekOverviewQuery, useRegisterAttendeeMutation, useSubmitBookingQuestionMutation } from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel, getSessionMeta } from '@/features/zoom/zoom.utils'
import { BarChart3, CalendarDays, CircleUserRound, Crosshair, Home } from 'lucide-react'
import { api } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type MiniAppZoomTabId = 'home' | 'calendar' | 'battle' | 'progress' | 'profile'
type LimitReachedTier = 'SILVER' | 'GOLD' | 'PLATINUM'
type LimitReachedUpsell = {
  used: number
  limit: number
  tier: LimitReachedTier
}

const MINI_APP_ENTRY_INTENT = {
  BOOKING: 'booking',
} as const

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      ready: () => void
      initData?: string
      initDataUnsafe?: {
        user?: {
          id?: number
          first_name?: string
          username?: string
        }
      }
    }
  }
}

function getTelegramWindow(): TelegramWindow {
  return window as TelegramWindow
}

function prepareTelegramWebApp() {
  const webApp = getTelegramWindow().Telegram?.WebApp

  if (!webApp) {
    return null
  }

  webApp.ready()
  return webApp
}

function readTelegramInitData(): string {
  return prepareTelegramWebApp()?.initData?.trim() ?? ''
}

function resolveMiniAppEntryIntent(search: string): string | null {
  const intent = new URLSearchParams(search).get('intent')?.trim()
  return intent || null
}

function isCoachRole(role: string | null | undefined): boolean {
  return role === 'EXPERT' || role === 'SUPERADMIN'
}

function parseLimitReachedError(error: unknown): LimitReachedUpsell | null {
  const rawError =
    typeof error === 'object' && error && 'data' in error
      ? (error as { data?: { error?: unknown } }).data?.error
      : null

  const payload =
    typeof rawError === 'string'
      ? (() => {
          try {
            return JSON.parse(rawError) as Record<string, unknown>
          } catch {
            return null
          }
        })()
      : rawError && typeof rawError === 'object'
        ? rawError as Record<string, unknown>
        : null

  if (!payload || payload.code !== 'LIMIT_REACHED') return null

  const used = Number(payload.used)
  const limit = Number(payload.limit)
  const tier = String(payload.tier ?? '').toUpperCase()

  if (!Number.isFinite(used) || !Number.isFinite(limit)) return null
  if (tier !== 'SILVER' && tier !== 'GOLD' && tier !== 'PLATINUM') return null

  return {
    used,
    limit,
    tier,
  }
}

function MiniAppZoomMessage({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'error'
}) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-300/30 bg-rose-400/10 text-rose-100'
      : 'border-white/10 bg-[var(--bg-secondary)] text-[var(--text-primary)]'

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
      <div className={`rounded-2xl border p-5 text-sm ${toneClassName}`}>{children}</div>
    </div>
  )
}

export function MiniAppZoomWeekPanel() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const navigate = useNavigate()
  const isBookingIntent =
    typeof window !== 'undefined' &&
    resolveMiniAppEntryIntent(window.location.search) === MINI_APP_ENTRY_INTENT.BOOKING
  const paymentSuccessFlag = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('payment') === 'success' || params.get('startapp') === 'billing-success'
  }, [])
  const {
    data: systemState,
    refetch: refetchAccess,
    isLoading: isAccessLoading,
    isFetching: isAccessFetching,
  } = useGetMySystemStateQuery(undefined, {
    skip: !user,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: true,
  })
  const [registerAttendee, { isLoading: isRegisteringAttendee }] = useRegisterAttendeeMutation()
  const [submitBookingQuestion, { isLoading: isSubmittingBookingQuestion }] = useSubmitBookingQuestionMutation()
  const [createProductPayment, { isLoading: isOpeningAccessPayment }] = useCreateProductPaymentMutation()
  const [registeringSessionId, setRegisteringSessionId] = useState<string | null>(null)
  const [bookingSuccessSessionId, setBookingSuccessSessionId] = useState<string | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [limitUpsell, setLimitUpsell] = useState<LimitReachedUpsell | null>(null)
  const [showQuestionInput, setShowQuestionInput] = useState(false)
  const [questionSessionId, setQuestionSessionId] = useState<string | null>(null)
  const [bookingQuestionText, setBookingQuestionText] = useState('')
  const [bookingQuestionError, setBookingQuestionError] = useState<string | null>(null)
  const [questionSubmittedSessionId, setQuestionSubmittedSessionId] = useState<string | null>(null)
  const [questionSkippedSessionId, setQuestionSkippedSessionId] = useState<string | null>(null)
  const [accessOpenedMessageVisible, setAccessOpenedMessageVisible] = useState(false)
  const {
    data: privateWeekOverview,
    isLoading: isPrivateWeekLoading,
    isError: isPrivateWeekError,
  } = useGetWeekOverviewQuery(undefined, {
    skip: !user,
    refetchOnMountOrArgChange: true,
  })
  const {
    data: publicWeekOverview,
    isLoading: isPublicWeekLoading,
    isError: isPublicWeekError,
  } = useGetPublicWeekOverviewQuery(undefined, {
    skip: Boolean(user),
    refetchOnMountOrArgChange: true,
  })
  const data = user ? privateWeekOverview : publicWeekOverview
  const isLoading = user ? isPrivateWeekLoading : isPublicWeekLoading
  const isError = user ? isPrivateWeekError : isPublicWeekError
  const sessions = data?.sessions
  const visibleSessions = (sessions ?? []).filter(
    (session) => new Date(session.scheduledAt) >= new Date(),
  )
  const highlightedSessionRef = useRef<HTMLDivElement | null>(null)
  const highlightedSession =
    sessions?.find((session) => !session.isMyBooking) ?? sessions?.[0] ?? null
  const zoomAccess = systemState?.zoomAccess
  const accessState =
    !user
      ? 'unknown'
      : systemState === undefined && (isAccessLoading || isAccessFetching)
      ? 'loading'
      : zoomAccess?.hasFocus === true
        ? 'active'
        : 'inactive'

  useEffect(() => {
    dispatch(api.util.invalidateTags(['Access', 'Subscription']))
    void refetchAccess()
  }, [dispatch, refetchAccess])

  useEffect(() => {
    if (!paymentSuccessFlag) return

    dispatch(
      api.util.invalidateTags([
        'Access',
        'Products',
        'Subscription',
        'ZoomSession',
      ]),
    )
  }, [dispatch, paymentSuccessFlag])

  useEffect(() => {
    if (!isBookingIntent || !highlightedSessionRef.current || !highlightedSession) {
      return
    }

    highlightedSessionRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [highlightedSession, isBookingIntent])

  useEffect(() => {
    if (!paymentSuccessFlag || accessState !== 'active') {
      return
    }

    setAccessOpenedMessageVisible(true)
    setBookingError(null)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('startapp')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [accessState, paymentSuccessFlag])

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4 px-4 py-5">
        <div className="h-6 w-40 rounded bg-white/10" />

        <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] p-4">
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-1/3 rounded bg-white/10" />
          <div className="mt-2 h-10 w-32 rounded-full bg-white/10" />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] p-4">
          <div className="h-5 w-1/3 rounded bg-white/10" />

          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }).map((_, index) => (
              <div key={index} className="h-10 rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Не вдалося завантажити Zoom-розклад. Спробуй оновити сторінку.
        </div>
      </div>
    )
  }

  const handleOpenAccess = async () => {
    setBookingError(null)
    setLimitUpsell(null)

    try {
      const response = await createProductPayment({
        productId: 'focus',
        planCode: '1month',
        source: 'web',
        targetPath: '/miniapp/zoom-calendar?payment=success',
      }).unwrap()

      if (response.status === 'already_active') {
        dispatch(
          api.util.invalidateTags([
            'Access',
            'Products',
            'Subscription',
            'ZoomSession',
          ]),
        )
        setAccessOpenedMessageVisible(true)
        return
      }

      const checkoutUrl = response.checkoutUrl ?? response.paymentUrl
      if (!checkoutUrl) {
        setBookingError('Не вдалося відкрити оплату. Спробуй ще раз.')
        return
      }

      openExternalPaymentUrl(checkoutUrl)
    } catch (error) {
      console.error('[MiniAppZoomWeekPanel] open access payment failed', error)
      setBookingError('Не вдалося відкрити оплату. Спробуй ще раз.')
    }
  }

  const handleRegister = async (sessionId: string) => {
    if (accessState === 'inactive') {
      await handleOpenAccess()
      return
    }

    setRegisteringSessionId(sessionId)
    setBookingSuccessSessionId(null)
    setBookingError(null)
    setLimitUpsell(null)
    setShowQuestionInput(false)
    setQuestionSessionId(null)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSubmittedSessionId(null)
    setQuestionSkippedSessionId(null)
    try {
      await registerAttendee({ sessionId }).unwrap()
      setBookingSuccessSessionId(sessionId)
      setQuestionSessionId(sessionId)
      setShowQuestionInput(true)
    } catch (error) {
      const limitReached = parseLimitReachedError(error)

      if (limitReached) {
        setLimitUpsell(limitReached)
        return
      }

      const normalizedError =
        typeof error === 'object' && error && 'data' in error
          ? (error as { data?: { error?: string } }).data?.error
          : null

      if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
        setBookingError('Доступ до Zoom відкривається з активним ФОКУСОМ.')
        return
      }

      if (
        normalizedError === 'unauthorized' ||
        normalizedError === 'invalid_token' ||
        normalizedError === 'token_expired' ||
        normalizedError === 'missing_init_data' ||
        normalizedError === 'invalid_init_data' ||
        normalizedError === 'user_not_found'
      ) {
        setBookingError('Не вдалося підтвердити Telegram-профіль. Відкрий Mini App із кнопки в боті та спробуй ще раз.')
        return
      }

      setBookingError('Не вдалося записати на Zoom. Спробуй ще раз.')
      console.error('[MiniAppZoomWeekPanel] register attendee failed', {
        sessionId,
        error,
      })
    } finally {
      setRegisteringSessionId(null)
    }
  }

  const handleLimitUpgrade = async () => {
    if (!limitUpsell) return

    const planCode = limitUpsell.tier === 'SILVER' ? '3month' : '1month_upgrade'

    setBookingError(null)

    try {
      const response = await createProductPayment({
        productId: 'focus',
        planCode,
        source: 'web',
        targetPath: '/miniapp/zoom-calendar?payment=success',
      }).unwrap()

      if (response.status === 'already_active') {
        dispatch(
          api.util.invalidateTags([
            'Access',
            'Products',
            'Subscription',
            'ZoomSession',
          ]),
        )
        setAccessOpenedMessageVisible(true)
        setLimitUpsell(null)
        return
      }

      const checkoutUrl = response.checkoutUrl ?? response.paymentUrl
      if (!checkoutUrl) {
        setBookingError('Не вдалося відкрити оплату. Спробуй ще раз.')
        return
      }

      openExternalPaymentUrl(checkoutUrl)
    } catch (error) {
      console.error('[MiniAppZoomWeekPanel] open upgrade payment failed', error)
      setBookingError('Не вдалося відкрити оплату. Спробуй ще раз.')
    }
  }

  const handleSingleSessionPurchase = () => {
    navigate('/miniapp/mentor?source=zoom-limit-upsell&offer=single-session')
  }

  const handleSubmitBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const questionText = bookingQuestionText.trim()

    if (!sessionId) return
    if (!questionText) {
      setBookingQuestionError('Напиши питання або ситуацію, щоб надіслати.')
      return
    }

    setBookingQuestionError(null)

    try {
      await submitBookingQuestion({ sessionId, questionText }).unwrap()
      setQuestionSubmittedSessionId(sessionId)
      setShowQuestionInput(false)
      setBookingQuestionText('')
    } catch (error) {
      console.error('[MiniAppZoomWeekPanel] booking question submit failed', {
        sessionId,
        error,
      })
      setBookingQuestionError('Не вдалося надіслати питання. Спробуй ще раз.')
    }
  }

  const handleSkipBookingQuestion = () => {
    if (questionSessionId) {
      setQuestionSkippedSessionId(questionSessionId)
    }
    setShowQuestionInput(false)
    setBookingQuestionText('')
    setBookingQuestionError(null)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Zoom-календар</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Найближчі 14 днів</h2>
            <p className="mt-1 text-sm text-white/55">
              {new Date(data.week.from).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}—{' '}
              {new Date(data.week.to).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}· {data.week.timezone}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/60">
            {visibleSessions.length} сесій
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {accessOpenedMessageVisible && accessState === 'active' ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
              <p className="font-semibold">Доступ відкрито.</p>
              <p className="mt-1 text-emerald-100/90">Можеш записатись на Zoom.</p>
            </div>
          ) : null}

          {accessState === 'loading' ? (
            <div className="text-white/40 text-sm">
              Перевіряємо доступ...
            </div>
          ) : null}

          {accessState === 'inactive' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm p-3 rounded-xl">
              <p>Щоб записатися на Zoom — активуй ФОКУС</p>
              <button
                type="button"
                onClick={() => void handleOpenAccess()}
                disabled={isOpeningAccessPayment}
                className="mt-3 rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:opacity-95 disabled:opacity-60"
              >
                {isOpeningAccessPayment ? 'Відкриваємо оплату...' : 'Отримати доступ'}
              </button>
            </div>
          ) : null}

          {visibleSessions.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              На цей тиждень сесій ще немає
            </div>
          ) : (
            visibleSessions.map((session: ZoomWeekOverview['sessions'][number]) => (
              <div
                key={session.id}
                ref={session.id === highlightedSession?.id ? highlightedSessionRef : null}
                className={[
                  'rounded-2xl border p-4 transition-all',
                  session.id === highlightedSession?.id && isBookingIntent
                    ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.14)] shadow-[0_18px_48px_rgba(0,0,0,0.24)]'
                    : 'border-white/10 bg-[rgba(255,255,255,0.03)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {session.id === highlightedSession?.id && isBookingIntent ? (
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--accent-rgb))]">
                        Найближча Zoom-практика
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-white">{session.topic}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {getSessionDateLabel(session.scheduledAt)}
                      {' '}· {getSessionMeta(session)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
                    {session.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {session.isMyBooking ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                      Ви записані
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRegister(session.id)}
                      disabled={isRegisteringAttendee && registeringSessionId === session.id}
                      className={[
                        'rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60',
                        session.id === highlightedSession?.id && isBookingIntent
                          ? 'bg-[rgb(var(--accent-rgb))] text-[var(--bg-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.24)]'
                          : 'border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] text-[rgb(var(--accent-rgb))]',
                      ].join(' ')}
                    >
                      {accessState === 'inactive'
                        ? isOpeningAccessPayment
                          ? 'Відкриваємо оплату...'
                          : 'Отримати доступ'
                        : isRegisteringAttendee && registeringSessionId === session.id
                          ? 'Записуємо...'
                          : 'Записатись'}
                    </button>
                  )}

                  {session.zoomLink ? (
                    <a
                      href={session.zoomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-rgb))]"
                    >
                      Відкрити Zoom
                    </a>
                  ) : null}

                </div>

                {bookingSuccessSessionId === session.id ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                    <p className="font-semibold">Ти записана на Zoom.</p>
                    <p className="mt-1 text-emerald-100/90">📅 {getSessionDateLabel(session.scheduledAt)}</p>
                    <p className="mt-2 text-emerald-100/90">&gt; Додай у календар і приходь вчасно.</p>

                    {showQuestionInput && questionSessionId === session.id ? (
                      <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/75">
                          Питання до Zoom
                        </p>
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
                            disabled={isSubmittingBookingQuestion}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {isSubmittingBookingQuestion ? 'Надсилаємо...' : 'Надіслати'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSkipBookingQuestion}
                            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                          >
                            Пропустити
                          </button>
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

                {bookingError && session.id === highlightedSession?.id ? (
                  <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-50">
                    {bookingError}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

      </div>

      {limitUpsell ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[28px] border border-[rgba(var(--accent-rgb),0.22)] bg-[#101826]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--accent-rgb))]">
                  Ліміт сесій
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Ти використала {limitUpsell.used}/{limitUpsell.limit} сесій цього місяця
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLimitUpsell(null)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Закрити
              </button>
            </div>

            {limitUpsell.tier === 'SILVER' ? (
              <>
                <p className="mt-3 text-sm text-white/72">Хочеш більше роботи з коучем?</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleLimitUpgrade()}
                    disabled={isOpeningAccessPayment}
                    className="w-full rounded-2xl bg-[rgb(var(--accent-rgb))] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:opacity-95 disabled:opacity-60"
                  >
                    {isOpeningAccessPayment ? 'Відкриваємо оплату...' : 'Перейти на GOLD'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSingleSessionPurchase}
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Купити 1 сесію — 150€
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-white/72">Хочеш більше інтенсиву?</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleLimitUpgrade()}
                    disabled={isOpeningAccessPayment}
                    className="w-full rounded-2xl bg-[rgb(var(--accent-rgb))] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:opacity-95 disabled:opacity-60"
                  >
                    {isOpeningAccessPayment ? 'Відкриваємо оплату...' : 'Перейти на PLATINUM'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSingleSessionPurchase}
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Купити 1 сесію
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ZoomPageWrapper() {
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)

  if (!user) {
    return null
  }

  const isCoach = isCoachRole(role)

  return isCoach ? <CoachZoomPanel expertId={user.id} /> : <UserZoomPanel userId={user.id} />
}

export function MiniAppZoomRoute() {
  const user = useAppSelector(selectCurrentUser)
  const initialTab: MiniAppZoomTabId =
    typeof window !== 'undefined' &&
    resolveMiniAppEntryIntent(window.location.search) === MINI_APP_ENTRY_INTENT.BOOKING
      ? 'calendar'
      : 'home'
  const [activeTab, setActiveTab] = useState<MiniAppZoomTabId>(initialTab)
  const [telegramInitData, setTelegramInitData] = useState('')

  useEffect(() => {
    const telegramWebApp = prepareTelegramWebApp()
    const nextInitData = telegramWebApp?.initData?.trim() ?? ''

    setTelegramInitData(nextInitData)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (resolveMiniAppEntryIntent(window.location.search) === MINI_APP_ENTRY_INTENT.BOOKING) {
      setActiveTab('calendar')
    }
  }, [])

  if (!user) {
    return <MiniAppZoomWeekPanel />
  }

  return (
    <div className="space-y-4 pb-6">
      {activeTab === 'home' && (
        <HomeTab
          hasTelegramInitData={Boolean(telegramInitData)}
          onNavigateCalendar={() => setActiveTab('calendar')}
          setActiveTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'calendar' && (
        <>
          <MiniAppZoomWeekPanel />
          <div className="mx-auto w-full max-w-5xl px-4 pb-4">
            <ZoomCalendar mode="user" userId={user.id} />
          </div>
        </>
      )}
    </div>
  )
}

function BattleTabStub() {
  const { getModuleAccess } = useSystemState()
  const battlesAccess = getModuleAccess('FOCUS_BATTLES')

  if (battlesAccess.isLocked) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
            <Crosshair className="h-5 w-5" />
            <p>Батли</p>
          </div>
          <p className="text-sm">Батли та обмін індивідуальними Zoom відкриваються з активною підпискою ФОКУС.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
          <Crosshair className="h-5 w-5" />
          <p>Батли</p>
        </div>
        <p className="text-sm">Скоро запустимо батли та обмін індивідуальними Zoom</p>
      </div>
    </div>
  )
}

function ProgressTabStub() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5" />
          <p>Прогрес</p>
        </div>
        <p className="text-sm">Статистика та досягнення з&apos;являться тут</p>
      </div>
    </div>
  )
}

function ProfileTabStub() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
          <CircleUserRound className="h-5 w-5" />
          <p>Профіль</p>
        </div>
        <p className="text-sm">Налаштування та облік скоро</p>
      </div>
    </div>
  )
}

export function MiniAppZoomCalendar() {
  return <CleanMiniAppZoomCalendar />
}
