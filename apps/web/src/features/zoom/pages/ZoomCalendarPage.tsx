import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser, selectAuthStatus } from '@/features/auth/services/auth.slice'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { buildTelegramDeepLink } from '@/shared/telegram/telegramDeepLinks'
import { CoachZoomPanel } from '@/features/zoom/CoachZoomPanel'
import { UserZoomPanel } from '@/features/zoom/UserZoomPanel'
import { hasPaidAccess } from '@/features/user/types/user.types'
import { useEffect, useState } from 'react'

type ViewState = 'locked' | 'personal' | 'pending'

type ZoomCalendarPageProps = Record<string, never>

function resolveViewState(input: {
  canSeePersonalCalendar: boolean
  isBrowserFallback: boolean
  shouldWaitForStandaloneAuth: boolean
}): ViewState {
  if (input.canSeePersonalCalendar) {
    return 'personal'
  }

  if (input.isBrowserFallback) {
    return 'locked'
  }

  if (input.shouldWaitForStandaloneAuth) {
    return 'pending'
  }

  return 'locked'
}

export default function ZoomCalendarPage(_: ZoomCalendarPageProps) {
  const user = useAppSelector(selectCurrentUser)
  const authStatus = useAppSelector(selectAuthStatus)
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : ''
  const isTelegramRuntime = isTelegramMiniApp(pathname)
  const hasTelegramInitData = Boolean(
    typeof window !== 'undefined' &&
      (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim()
  )
  const isCoach = Boolean(user && ['SUPERADMIN', 'ADMIN', 'EXPERT'].includes(user.role))
  const canSeePersonalCalendar = Boolean(user && (isCoach || hasPaidAccess(user)))
  const shouldShowPersonalCalendar = canSeePersonalCalendar
  const isBrowserFallback = !isTelegramRuntime || !hasTelegramInitData
  const shouldWaitForStandaloneAuth = authStatus === 'loading' && !isTelegramRuntime
  const [viewState, setViewState] = useState<ViewState>(() =>
    resolveViewState({
      canSeePersonalCalendar,
      isBrowserFallback,
      shouldWaitForStandaloneAuth,
    })
  )

  useEffect(() => {
    setViewState(
      resolveViewState({
        canSeePersonalCalendar,
        isBrowserFallback,
        shouldWaitForStandaloneAuth,
      })
    )
  }, [canSeePersonalCalendar, isBrowserFallback, shouldWaitForStandaloneAuth])

  if (viewState === 'pending') {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Авторизуємо Zoom Calendar…
      </div>
    )
  }

  if (shouldShowPersonalCalendar && user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {isCoach ? (
          <CoachZoomPanel expertId={user.expertId ?? null} />
        ) : (
          <UserZoomPanel userId={user.id} />
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-4 px-4 py-10 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h1 className="text-2xl font-semibold">Zoom Calendar</h1>
        <p className="mt-2 text-sm text-white/70">
          Персональний календар доступний тільки після входу через Telegram Mini App або з активним доступом ФОКУС.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="/focus"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/22"
          >
            Активувати ФОКУС
          </a>
          {!isTelegramRuntime ? (
            <a
              href={buildTelegramDeepLink({ source: 'DIRECT', startParam: 'zoom_calendar' })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Відкрити в Telegram
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
