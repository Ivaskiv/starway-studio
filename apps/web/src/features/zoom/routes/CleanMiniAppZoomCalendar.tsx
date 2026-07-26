import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useCreateProductPaymentMutation } from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import {
  useGetWeekOverviewQuery,
  useRegisterAttendeeMutation,
} from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel, getSessionMeta } from '@/features/zoom/zoom.utils'
import { api } from '@/services/api'
import { useState } from 'react'
import { useDispatch } from 'react-redux'

function formatWeekDate(value: string): string {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {children}
    </div>
  )
}

export default function CleanMiniAppZoomCalendar() {
  const dispatch = useDispatch()
  const user = useAppSelector(selectCurrentUser)
  const { zoomAccess, isLoading: isAccessLoading, isError: isAccessError } = useSystemState()
  const { data, isLoading: isScheduleLoading, isError: isScheduleError, refetch } =
    useGetWeekOverviewQuery(undefined, {
      skip: !user,
      refetchOnMountOrArgChange: true,
    })
  const [registerAttendee, { isLoading: isRegistering }] = useRegisterAttendeeMutation()
  const [createProductPayment, { isLoading: isOpeningPayment }] = useCreateProductPaymentMutation()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const hasFocusAccess = zoomAccess?.hasFocus === true
  const isLoading = isAccessLoading || isScheduleLoading

  const refreshAccess = async () => {
    setMessage(null)
    dispatch(
      api.util.invalidateTags(['Access', 'Products', 'Subscription', 'ZoomSession']),
    )
    await refetch()
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
    } catch {
      setMessage('Не вдалося відкрити оплату. Натисни «Проблеми з оплатою».')
    }
  }

  const register = async (sessionId: string) => {
    if (!hasFocusAccess) return
    setActiveSessionId(sessionId)
    setMessage(null)
    try {
      await registerAttendee({ sessionId }).unwrap()
      await refetch()
      setMessage('Ти записана на Zoom.')
    } catch {
      setMessage('Не вдалося записати. Онови доступ і спробуй ще раз.')
    } finally {
      setActiveSessionId(null)
    }
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
                  className="rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-60"
                >
                  {isOpeningPayment ? 'Відкриваємо…' : 'Оплатити ФОКУС'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMessage('Запит про оплату зафіксовано. Перевіряємо транзакцію.')}
                className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                Проблеми з оплатою
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
                </Card>
              ))
            : null}

          {message ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/80">
              {message}
            </div>
          ) : null}

          {data && hasFocusAccess && data.audios.length > 0 ? (
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
