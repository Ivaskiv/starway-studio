import { useAppDispatch, useAppSelector } from '@/app/hooks'
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {children}
    </div>
  )
}

export default function CleanMiniAppZoomCalendar() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  const isCoach = isCoachRole(role)
  const { zoomAccess, isLoading: isAccessLoading, isError: isAccessError } = useSystemState()
  const { data, isLoading: isScheduleLoading, isError: isScheduleError, refetch } =
    useGetWeekOverviewQuery(undefined, {
      skip: !user,
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

  const accessState =
    isAccessLoading || zoomAccess === undefined
      ? 'loading'
      : zoomAccess?.state === 'FOCUS_ACTIVE' && zoomAccess?.hasFocus === true && zoomAccess?.isActive
        ? 'active'
        : 'inactive'
  const hasFocusAccess = accessState === 'active'
  const isLoading = isAccessLoading || isScheduleLoading

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

    try {
      const accessResponse = await dispatch(
        accessApi.endpoints.getMySystemState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      )

      if ('data' in accessResponse) {
        responseBody = accessResponse.data
        httpStatus = 200
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

    dispatch(
      api.util.invalidateTags(['Access', 'Products', 'Subscription', 'ZoomSession']),
    )
    await refetch()
    let zoomAccessAfterRefetch: unknown = null

    try {
      const postRefreshResponse = await dispatch(
        accessApi.endpoints.getMySystemState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      )

      zoomAccessAfterRefetch =
        'data' in postRefreshResponse ? postRefreshResponse.data?.zoomAccess ?? null : null
    } catch (error) {
      zoomAccessAfterRefetch = error
    }

    console.info('[ZOOM_ACCESS_REFRESH_FRONTEND]', {
      telegramUserId,
      authSessionUserId: user?.id ?? null,
      endpoint,
      httpStatus,
      responseBody,
      zoomAccessBeforeRefresh,
      zoomAccessAfterRefetch,
    })
    setMessage('Статус доступу оновлено.')
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
        setMessage('Не вдалося відкрити оплату. Натисни «Проблеми з оплатою».')
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
      setMessage(errorMessage ?? 'Не вдалося відкрити оплату. Натисни «Проблеми з оплатою».')
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
    if (!hasFocusAccess) return
    setActiveSessionId(sessionId)
    setMessage(null)
    setBookingSuccessSessionId(null)
    setQuestionSessionId(null)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSubmittedSessionId(null)
    setQuestionSkippedSessionId(null)
    setShowQuestionInput(false)
    try {
      await registerAttendee({ sessionId }).unwrap()
      await refetch()
      setBookingSuccessSessionId(sessionId)
      setQuestionSessionId(sessionId)
      setShowQuestionInput(true)
      setMessage(null)
    } catch (error) {
      const normalizedError =
        typeof error === 'object' && error && 'data' in error
          ? (error as { data?: { error?: string } }).data?.error
          : null

      if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
        setMessage('Доступ до Zoom відкривається з активним ФОКУСОМ.')
        return
      }

      if (normalizedError === 'ALREADY_BOOKED') {
        setBookingSuccessSessionId(sessionId)
        setMessage('Ти записана на Zoom.')
        return
      }

      setMessage('Не вдалося записати. Онови доступ і спробуй ще раз.')
    } finally {
      setActiveSessionId(null)
    }
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
      setMessage('Ти записана на Zoom.')
    } catch {
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
    setMessage('Ти записана на Zoom.')
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
              {data.sessions.length} сесій
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? <Card>Перевіряємо доступ і завантажуємо розклад…</Card> : null}

          {!isLoading && (isAccessError || isScheduleError || !data) ? (
            <Card>
              <p className="font-semibold">Не вдалося завантажити календар.</p>
              <button
                type="button"
                onClick={() => void refreshAccess()}
                className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Спробувати ще раз
              </button>
            </Card>
          ) : null}

          {!isLoading && data && !hasFocusAccess ? (
            <Card>
              <p className="font-semibold">Доступ до Zoom ще не підтверджено.</p>
              <p className="mt-1 text-sm text-white/65">
                Уже оплатила — спочатку онови статус. Не оплатила — відкрий оплату.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void refreshAccess()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  Оновити доступ
                </button>
                <button
                  type="button"
                  onClick={() => void openPayment()}
                  disabled={isOpeningPayment}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
                >
                  {isOpeningPayment ? 'Відкриваємо…' : 'Оплатити ФОКУС'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleReportPaymentIssue()}
                disabled={isReportingPaymentIssue}
                className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                {isReportingPaymentIssue ? 'Фіксуємо проблему…' : 'Проблеми з оплатою'}
              </button>
            </Card>
          ) : null}

          {!isLoading && data && hasFocusAccess && data.sessions.length === 0 ? (
            <Card>
              <p className="font-semibold">Доступ активний.</p>
              <p className="mt-1 text-sm text-white/65">
                На цей тиждень Zoom-сесій ще немає. Коли коуч додасть практику, вона з’явиться тут.
              </p>
            </Card>
          ) : null}

          {!isLoading && data && hasFocusAccess
            ? data.sessions.map((session: ZoomWeekOverview['sessions'][number]) => (
                <Card key={session.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
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
                    {!session.isMyBooking ? (
                      <button
                        type="button"
                        onClick={() => void register(session.id)}
                        disabled={isRegistering && activeSessionId === session.id}
                        className="rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-60"
                      >
                        {isRegistering && activeSessionId === session.id ? 'Записуємо…' : 'Записатись'}
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

                  {(bookingSuccessSessionId === session.id || session.isMyBooking) ? (
                    <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                      <p className="font-semibold">Ти записана.</p>

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
                              {isSubmittingBookingQuestion ? 'Надсилаємо…' : 'Надіслати'}
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
                </Card>
              ))
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
