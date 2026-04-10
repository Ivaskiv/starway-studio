import { ROUTES } from '@/config/routes'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { useGetTelegramLinkUrlQuery } from '@/features/auth/services/auth.api'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { Button } from '@/ui'
import { ArrowRight, MessageCircle, Waypoints } from 'lucide-react'
import { useEffect } from 'react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const FLOW_STEPS = [
  {
    title: 'Стан',
    text: 'Щоранку фіксуєш, у якому стані стартуєш день.',
  },
  {
    title: 'Вибір',
    text: 'Бачиш, де зливаєшся, і який вибір реально робиш.',
  },
  {
    title: 'Дія',
    text: 'Фіксуєш одну мінімальну дію замість хаосу.',
  },
] as const

export default function StartFlowPage() {
  const navigate = useNavigate()
  const { isAuthenticated, step, emailCompletionRequired, refetch } = useUserState()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const leadEntryTrackedRef = useRef(false)
  const { data: webMap } = useGetWebMapQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })

  const { data: telegramLinkData, isFetching: isTelegramLinkLoading } = useGetTelegramLinkUrlQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    if (emailCompletionRequired) return

    if (step === 'WHEEL') {
      navigate(ROUTES.WHEEL_START, { replace: true })
      return
    }

    if (step === 'DAILY_MORNING' && !webMap) {
      navigate(ROUTES.VISION, { replace: true })
    }
  }, [emailCompletionRequired, isAuthenticated, navigate, step, webMap])

  useEffect(() => {
    if (!isAuthenticated || emailCompletionRequired) {
      return
    }

    void trackFrontendEvent({
      userId: null,
      type: 'web_onboarding_start_page_viewed',
      source: 'web',
      state: step,
      payload: {
        step,
      },
    })
  }, [emailCompletionRequired, isAuthenticated, step, trackFrontendEvent])

  useEffect(() => {
    if (!isAuthenticated || emailCompletionRequired || leadEntryTrackedRef.current) {
      return
    }

    leadEntryTrackedRef.current = true
    void trackFrontendEvent({
      userId: null,
      type: 'lead_entered_app',
      source: 'web',
      state: step,
      email: null,
      payload: {
        entry: 'web_start_flow',
        step,
      },
    })
  }, [emailCompletionRequired, isAuthenticated, step, trackFrontendEvent])

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] px-5 py-10 text-[color:var(--text-primary)] sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {emailCompletionRequired ? (
          <EmailCompletionCard onCompleted={async () => { await refetch() }} />
        ) : (
          <div className="card-surface liquid-glass overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                  Старт системи
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Web і Telegram працюють як один flow.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
                  Тут ти запускаєш зв&apos;язку: Telegram веде тебе по щоденному циклу, а web показує поточний крок і
                  наступну дію без хаосу.
                </p>
              </div>

              <div className="rounded-[20px] border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.08)] p-4 text-sm text-white/72 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
                <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-semibold">Telegram entry</span>
                </div>
                <p className="mt-3 leading-6">
                  Після підключення бот щодня повертає тебе в систему через короткий guided flow.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {FLOW_STEPS.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.12)] text-sm font-semibold text-[rgb(var(--accent-soft-rgb))]">
                    0{index + 1}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/65">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {telegramLinkData?.url ? (
                <a href={telegramLinkData.url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button
                    disabled={isTelegramLinkLoading}
                    className="inline-flex items-center gap-2"
                    onClick={() => {
                      void trackFrontendEvent({
                        userId: null,
                        type: 'web_telegram_open_clicked',
                        source: 'web',
                        state: step,
                        payload: {
                          target: 'telegram',
                        },
                      })
                    }}
                  >
                    <Waypoints className="h-4 w-4" />
                    Відкрити Telegram
                  </Button>
                </a>
              ) : (
                <Button disabled className="inline-flex items-center gap-2">
                  <Waypoints className="h-4 w-4" />
                  {isTelegramLinkLoading ? 'Готуємо Telegram...' : 'Telegram недоступний'}
                </Button>
              )}

              <Button variant="ghost" onClick={() => navigate(ROUTES.HOME)} className="inline-flex items-center gap-2">
                Повернутися на головну
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
