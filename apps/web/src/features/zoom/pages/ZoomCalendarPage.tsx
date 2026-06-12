import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser, selectAuthStatus } from '@/features/auth/services/auth.slice'
import { useTelegramMiniAppAuthMutation } from '@/features/auth/services/auth.api'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { buildTelegramDeepLink } from '@/shared/telegram/telegramDeepLinks'
import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import { useGetPublicWeekOverviewQuery } from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { hasPaidAccess } from '@/features/user/types/user.types'
import { useEffect, useMemo, useRef, useState } from 'react'

type ViewState = 'public' | 'personal' | 'pending'

type ZoomCalendarPageProps = {
  isPublic?: boolean
}

function formatRange(week: ZoomWeekOverview['week']): string {
  const from = new Date(week.from)
  const to = new Date(week.to)
  return `${from.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', timeZone: week.timezone })}–${to.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', timeZone: week.timezone })}`
}

function PublicWeekOverview({
  overview,
  showTelegramButton,
  hint,
}: {
  overview: ZoomWeekOverview
  showTelegramButton: boolean
  hint: string
}) {
  const range = formatRange(overview.week)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Публічний календар</p>
        <h1 className="mt-2 text-2xl font-semibold">Zoom Calendar</h1>
        <p className="mt-2 text-sm text-white/70">Період {range}. Публічний розклад доступний одразу, а персональний календар відкривається через Telegram Mini App.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="/focus"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/22"
          >
            Активувати ФОКУС
          </a>
          {showTelegramButton && (
            <a
              href={buildTelegramDeepLink({ source: 'DIRECT', startParam: 'zoom_calendar' })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Відкрити в Telegram
            </a>
          )}
        </div>
        <p className="mt-3 text-xs text-white/45">{hint}</p>
      </div>

      <div className="grid gap-3">
        {overview.sessions.length > 0 ? overview.sessions.map((session) => (
          <div key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs text-white/45">
                  {new Date(session.scheduledAt).toLocaleString('uk-UA', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: overview.week.timezone,
                  })}
                </p>
                <h2 className="mt-1 text-lg font-medium">{session.topic}</h2>
                <p className="mt-1 text-sm text-white/60">
                  {session.attendeesCount} учасників · {session.hasAudio ? 'є аудіо' : 'без аудіо'}
                </p>
              </div>
              <span className={[
                'inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium',
                session.status === 'SCHEDULED' ? 'bg-sky-500/15 text-sky-200' : 'bg-emerald-500/15 text-emerald-200',
              ].join(' ')}>
                {session.status}
              </span>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            На цей тиждень публічних Zoom-сесій поки немає.
          </div>
        )}
      </div>
    </div>
  )
}

export default function ZoomCalendarPage({ isPublic = false }: ZoomCalendarPageProps) {
  const user = useAppSelector(selectCurrentUser)
  const authStatus = useAppSelector(selectAuthStatus)
  const [telegramMiniAppAuth] = useTelegramMiniAppAuthMutation()
  const [viewState, setViewState] = useState<ViewState>(isPublic ? 'public' : 'public')
  const authAttemptedRef = useRef(false)
  const isTelegramRuntime = isTelegramMiniApp('/zoom-calendar')
  const hasTelegramInitData = Boolean(
    typeof window !== 'undefined' &&
      (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim()
  )
  const isCoach = Boolean(user && ['SUPERADMIN', 'ADMIN', 'EXPERT'].includes(user.role))
  const canSeePersonalCalendar = Boolean(user && (isCoach || hasPaidAccess(user)))
  const shouldShowPersonalCalendar = !isPublic && canSeePersonalCalendar
  const isBrowserFallback = !isTelegramRuntime || !hasTelegramInitData

  const { data: publicOverview, isLoading: isPublicLoading, isError: isPublicError } = useGetPublicWeekOverviewQuery(undefined, {
    skip: shouldShowPersonalCalendar || viewState === 'pending',
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (isPublic) {
      setViewState('public')
      return
    }

    if (canSeePersonalCalendar) {
      setViewState('personal')
      return
    }

    if (isBrowserFallback) {
      setViewState('public')
      return
    }

    if (authAttemptedRef.current) return
    authAttemptedRef.current = true
    setViewState('pending')

    const initData = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim() ?? ''
    if (!initData) {
      setViewState('public')
      return
    }

    void telegramMiniAppAuth({ initData })
      .unwrap()
      .then(() => setViewState('personal'))
      .catch(() => setViewState('public'))
  }, [canSeePersonalCalendar, isBrowserFallback, isPublic, telegramMiniAppAuth])

  const personalMode = useMemo(() => {
    return isCoach ? 'coach' : 'user'
  }, [isCoach])

  if (viewState === 'pending' || (!isPublic && isTelegramRuntime && authStatus === 'loading' && !user && hasTelegramInitData)) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Авторизуємо Zoom Calendar…
      </div>
    )
  }

  if (shouldShowPersonalCalendar && user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <ZoomCalendar mode={personalMode} userId={user.id} expertId={user.expertId ?? undefined} />
      </div>
    )
  }

  if (isPublicError) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Не вдалося завантажити публічний Zoom Calendar.
      </div>
    )
  }

  if (isPublicLoading || !publicOverview) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        {isTelegramRuntime && hasTelegramInitData ? 'Підключаємо Telegram та завантажуємо календар…' : 'Завантажуємо публічний Zoom Calendar…'}
      </div>
    )
  }

  return (
    <PublicWeekOverview
      overview={publicOverview}
      showTelegramButton={!isTelegramRuntime}
      hint={
        isTelegramRuntime
          ? 'Публічний розклад показується одразу. Персональний календар відкриється після автоматичного Telegram-входу.'
          : 'Щоб побачити персональний календар, відкрий сторінку через Telegram Mini App.'
      }
    />
  )
}
