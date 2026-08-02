import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { selectAuthStatus, selectCurrentUser, selectUserRole } from '@/features/auth/services/auth.slice'
import {
  useUpdateUserSettingsMutation,
} from '@/features/auth/services/auth.api'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { useCreateProductPaymentMutation } from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import { CoachZoomPanel, UserZoomPanel } from '@/features/zoom'
import ZoomCalendarPage from '@/features/zoom/pages/ZoomCalendarPage'
import HomeTab from '@/features/zoom/tabs/HomeTab'

import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import { useGetMySystemStateQuery } from '@/features/auth/services/accessApi'
import { useGetWeekOverviewQuery, useRegisterAttendeeMutation, useSubmitBookingQuestionMutation } from '@/features/zoom/services/zoom.api'
import CleanMiniAppZoomCalendar from '@/features/zoom/routes/CleanMiniAppZoomCalendar'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel, getSessionMeta } from '@/features/zoom/zoom.utils'
import { BarChart3, CalendarDays, CircleUserRound, Crosshair, Home } from 'lucide-react'
import { api } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

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

const TELEGRAM_AUTH_TIMEOUT_MS = 3_000

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

function withTelegramAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Telegram authentication timed out'))
    }, TELEGRAM_AUTH_TIMEOUT_MS)

    promise.then(resolve, reject).finally(() => {
      window.clearTimeout(timeoutId)
    })
  })
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

function MiniAppZoomOnboarding({
  email,
  error,
  firstName,
  isSaving,
  onEmailChange,
  onFirstNameChange,
  onSubmit,
}: {
  email: string
  error: string | null
  firstName: string
  isSaving: boolean
  onEmailChange: (value: string) => void
  onFirstNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <p className="text-sm text-[var(--text-primary)]">
          <strong>Ще один крок.</strong> Додай ім&apos;я та email, щоб відкрити Zoom-календар.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">Ім&apos;я</span>
            <input
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
              placeholder="Твоє ім'я"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
              placeholder="you@example.com"
            />
          </label>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:opacity-60"
          >
            {isSaving ? 'Зберігаємо...' : 'Відкрити календар'}
          </button>
        </form>
      </div>
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
  const { data, isLoading, isError } = useGetWeekOverviewQuery(undefined, {
    skip: !user,
    refetchOnMountOrArgChange: true,
  })
  const sessions = data?.sessions
  const visibleSessions = (sessions ?? []).filter(
    (session) => new Date(session.scheduledAt) >= new Date(),
  )
  const highlightedSessionRef = useRef<HTMLDivElement | null>(null)
  const highlightedSession =
    sessions?.find((session) => !session.isMyBooking) ?? sessions?.[0] ?? null
  const zoomAccess = systemState?.zoomAccess
  const accessState =
    systemState === undefined && (isAccessLoading || isAccessFetching)
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

  if (!user) {
    return null
  }

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
                className="mt-3 rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition hover:opacity-95 disabled:opacity-60"
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
                      Ви записані ✅
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRegister(session.id)}
                      disabled={accessState === 'active' && isRegisteringAttendee && registeringSessionId === session.id}
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
  const [updateUserSettings, { isLoading: isSaving }] = useUpdateUserSettingsMutation()
  const initialTab: MiniAppZoomTabId =
    typeof window !== 'undefined' &&
    resolveMiniAppEntryIntent(window.location.search) === MINI_APP_ENTRY_INTENT.BOOKING
      ? 'calendar'
      : 'home'
  const [activeTab, setActiveTab] = useState<MiniAppZoomTabId>(initialTab)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isTelegramRuntime = isTelegramMiniApp(window.location.pathname)
  const [telegramInitData, setTelegramInitData] = useState('')
  const [isTelegramWebAppReady, setIsTelegramWebAppReady] = useState(false)

  useEffect(() => {
    const telegramWebApp = prepareTelegramWebApp()
    const telegramUser = telegramWebApp?.initDataUnsafe?.user
    const telegramFirstName = telegramUser?.first_name?.trim()
    const nextInitData = telegramWebApp?.initData?.trim() ?? ''

    if (telegramFirstName) {
      setFirstName(telegramFirstName)
    }

    setTelegramInitData(nextInitData)
    setIsTelegramWebAppReady(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (resolveMiniAppEntryIntent(window.location.search) === MINI_APP_ENTRY_INTENT.BOOKING) {
      setActiveTab('calendar')
    }
  }, [])

  useEffect(() => {
    if (!isTelegramWebAppReady) {
      return
    }

    if (user) {
      if (isTelegramRuntime) {
        setNeedsOnboarding(false)
        return
      }

      setNeedsOnboarding(!user.email || !user.firstName)
      if (user.firstName) {
        setFirstName(user.firstName)
      }
      if (user.email) {
        setEmail(user.email)
      }
      return
    }

    if (!telegramInitData) {
      setError(null)
      setNeedsOnboarding(false)
      return
    }

    setNeedsOnboarding(false)
  }, [isTelegramRuntime, isTelegramWebAppReady, telegramInitData, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !firstName.trim()) {
      setError("Заповни ім'я та email.")
      return
    }

    try {
      await updateUserSettings({
        firstName: firstName.trim(),
        email: email.trim(),
      }).unwrap()
      setNeedsOnboarding(false)
    } catch (saveError) {
      console.error('[MiniAppZoomRoute] onboarding save failed', saveError)
      setError('Не вдалося зберегти дані. Спробуй ще раз.')
    }
  }

  if (isTelegramRuntime && error) {
    return <MiniAppZoomMessage>{error}</MiniAppZoomMessage>
  }

  if (needsOnboarding === null) {
    return (
      <MiniAppZoomMessage>
        <div className="space-y-2">
          <p><strong>Готуємо Zoom-календар.</strong></p>
          <p className="text-white/70">Зачекай кілька секунд.</p>
        </div>
      </MiniAppZoomMessage>
    )
  }

  if (!isTelegramRuntime && needsOnboarding) {
    return (
      <MiniAppZoomOnboarding
        email={email}
        error={error}
        firstName={firstName}
        isSaving={isSaving}
        onEmailChange={setEmail}
        onFirstNameChange={setFirstName}
        onSubmit={handleSubmit}
      />
    )
  }

  if (!user) {
    return <ZoomCalendarPage />
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
  const authStatus = useAppSelector(selectAuthStatus)
  const { isAuthenticated, loginWithSocial, loginWithTelegramMiniApp } = useAuth()
  const { authRestoreStatus } = useSessionOrchestrator()
  const search = typeof window === 'undefined' ? '' : window.location.search
  const searchParams = new URLSearchParams(search)
  const hasDeepLinkToken = searchParams.has('dl')
  const initialTelegramInitData = typeof window === 'undefined' ? '' : readTelegramInitData()
  const [hasTelegramInitData, setHasTelegramInitData] = useState(Boolean(initialTelegramInitData))
  const [isTelegramBootstrapReady, setIsTelegramBootstrapReady] = useState(Boolean(initialTelegramInitData))
  const [isMiniAppAuthBootstrapping, setIsMiniAppAuthBootstrapping] = useState(false)
  const [miniAppAuthError, setMiniAppAuthError] = useState<string | null>(null)
  const [authRetryKey, setAuthRetryKey] = useState(0)
  const autoLoginAttemptedRef = useRef(false)

  useEffect(() => {
    if (initialTelegramInitData) {
      setHasTelegramInitData(true)
      setIsTelegramBootstrapReady(true)
      return
    }

    let isCancelled = false

    const resolveTelegramBootstrap = async () => {
      const startedAt = Date.now()

      while (!isCancelled && Date.now() - startedAt < 3_000) {
        const initData = readTelegramInitData()

        if (initData) {
          setHasTelegramInitData(true)
          setIsTelegramBootstrapReady(true)
          return
        }

        await new Promise(resolve => window.setTimeout(resolve, 50))
      }

      if (isCancelled) return

      setHasTelegramInitData(false)
      setIsTelegramBootstrapReady(true)
    }

    void resolveTelegramBootstrap()

    return () => {
      isCancelled = true
    }
  }, [initialTelegramInitData])

  useEffect(() => {
    if (!isTelegramBootstrapReady) {
      return
    }

    const telegramWebApp = getTelegramWindow().Telegram?.WebApp
    const telegramUserId = telegramWebApp?.initDataUnsafe?.user?.id
    const telegramInitData = readTelegramInitData()
    const allowDevFallback =
      import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const isAwaitingRestore =
      hasDeepLinkToken &&
      !isAuthenticated &&
      (authRestoreStatus === 'idle' || authRestoreStatus === 'restoring')

    if (isAuthenticated) {
      setIsMiniAppAuthBootstrapping(false)
      setMiniAppAuthError(null)
      return
    }

    if (isAwaitingRestore) {
      setIsMiniAppAuthBootstrapping(true)
      return
    }

    if (!telegramUserId) {
      setIsMiniAppAuthBootstrapping(false)
      return
    }

    if (!telegramInitData && !allowDevFallback) {
      setIsMiniAppAuthBootstrapping(false)
      return
    }

    if (autoLoginAttemptedRef.current) {
      return
    }

    autoLoginAttemptedRef.current = true
    setIsMiniAppAuthBootstrapping(true)
    setMiniAppAuthError(null)

    const loginPromise = telegramInitData
      ? loginWithTelegramMiniApp(telegramInitData)
      : allowDevFallback
        ? loginWithSocial('telegram')
        : Promise.reject(new Error('Telegram initData is missing'))

    void withTelegramAuthTimeout(loginPromise)
      .catch((error) => {
        console.warn('[MiniAppZoomCalendar] Telegram auto-login failed', error)
        setMiniAppAuthError(
          error instanceof Error && error.message === 'Telegram authentication timed out'
            ? 'Не вдалося завершити вхід за 3 секунди. Спробуйте ще раз.'
            : 'Не вдалося увійти через Telegram. Спробуйте ще раз.',
        )
      })
      .finally(() => {
        setIsMiniAppAuthBootstrapping(false)
      })
  }, [
    authRestoreStatus,
    authRetryKey,
    isTelegramBootstrapReady,
    hasDeepLinkToken,
    isAuthenticated,
    loginWithSocial,
    loginWithTelegramMiniApp,
  ])

  const isDeepLinkRestorePending =
    hasDeepLinkToken &&
    !hasTelegramInitData &&
    !isAuthenticated &&
    (authRestoreStatus === 'idle' || authRestoreStatus === 'restoring')
  const isWaitingForMiniAppAuthAttempt =
    hasTelegramInitData &&
    !isAuthenticated &&
    !miniAppAuthError &&
    !autoLoginAttemptedRef.current
  const isTelegramAuthPending =
    isWaitingForMiniAppAuthAttempt || isMiniAppAuthBootstrapping

  const retryTelegramAuth = () => {
    autoLoginAttemptedRef.current = false
    setMiniAppAuthError(null)
    setAuthRetryKey(current => current + 1)
  }

  if (miniAppAuthError && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0F1419]">
        <div className="flex-1 overflow-y-auto">
          <MiniAppZoomMessage tone="error">
            <div className="space-y-2">
              <p><strong>Вхід не завершився.</strong></p>
              <p>{miniAppAuthError}</p>
            </div>
            <button
              type="button"
              onClick={retryTelegramAuth}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0F1419]"
            >
              Повторити вхід
            </button>
          </MiniAppZoomMessage>
        </div>
      </div>
    )
  }

  if (!isTelegramBootstrapReady || isTelegramAuthPending || isDeepLinkRestorePending) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0F1419]">
        <div className="flex-1 overflow-y-auto">
          <MiniAppZoomMessage>
            <div className="space-y-2">
              <p><strong>Готуємо Zoom-календар.</strong></p>
              <p className="text-white/70">Відновлюємо доступ без повторного входу.</p>
            </div>
          </MiniAppZoomMessage>
        </div>
      </div>
    )
  }

  if (!hasTelegramInitData && authStatus !== 'authenticated') {
    return (
      <div className="flex min-h-screen flex-col bg-[#0F1419]">
        <div className="flex-1 overflow-y-auto">
          <MiniAppZoomMessage>
            <div className="space-y-2">
              <p><strong>Mini App недоступний.</strong></p>
              <p className="text-white/70">Відкрий його через Telegram.</p>
            </div>
          </MiniAppZoomMessage>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0F1419]">
      <div className="flex-1 overflow-y-auto">
        <CleanMiniAppZoomCalendar />
      </div>
    </div>
  )
}
