import { useEffect } from 'react'
import { useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { selectCurrentUser, selectUserRole } from '@/features/auth/services/auth.slice'
import MiniAppLayout from '@/components/miniapp/MiniAppLayout'
import { useSearchParams } from 'react-router-dom'
import { CoachZoomPanel } from '../CoachZoomPanel'
import { UserZoomPanel } from '../UserZoomPanel'
import { isCoachRole } from '../utils/zoomCalendarRoute.utils'

// Canonical Telegram Zoom owner: render USER calendar without Focus gating; protect actions by entitlement and retain this MiniAppLayout → panel ownership (never route via ZoomCalendarPage or add another owner).
export default function MiniAppCalendarRoute() {
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  const { authRestoreStatus, restoreSession } = useSessionOrchestrator()
  const [searchParams, setSearchParams] = useSearchParams()
  const effectiveRole = user?.activeRole ?? role ?? user?.role ?? null
  const canSwitchZoomRole = Boolean(user && isCoachRole(effectiveRole))
  const requestedZoomRole = searchParams.get('zoomRole')
  const isUserPreview = canSwitchZoomRole && requestedZoomRole === 'user'
  const isCoach = canSwitchZoomRole && !isUserPreview
  const isRestoringSession = authRestoreStatus === 'idle' || authRestoreStatus === 'restoring'

  useEffect(() => {
    if (import.meta.env.DEV) {
      const webApp = window.Telegram?.WebApp
      console.info('[USER_ZOOM_MENU_TRACE]', {
        phase: 'calendar_route_bootstrap',
        pathname: window.location.pathname,
        search: window.location.search,
        hasTelegramWebApp: Boolean(webApp),
        hasInitData: Boolean(webApp?.initData?.trim()),
      })
    }
    if (!user?.id) void restoreSession('manual')
  }, [user?.id, restoreSession])

  const roleSwitch = canSwitchZoomRole ? (
    <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {(['user', 'coach'] as const).map((zoomRole) => {
        const active = zoomRole === (isCoach ? 'coach' : 'user')
        return (
          <button
            key={zoomRole}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('zoomRole', zoomRole)
              setSearchParams(next, { replace: true })
            }}
            className={[
              'rounded-lg px-3 py-2 text-xs font-semibold transition',
              active ? 'bg-sky-500/20 text-sky-100' : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
            ].join(' ')}
            aria-pressed={active}
          >
            {zoomRole === 'user' ? 'USER calendar' : 'COACH calendar'}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <MiniAppLayout activeTab="home" navVariant={isCoach ? 'coach' : 'user'}>
      {isCoach ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28">
          {roleSwitch}
          <CoachZoomPanel expertId={user?.expertId ?? null} />
        </main>
      ) : user ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28">
          {roleSwitch}
          <UserZoomPanel userId={user.id} />
        </main>
      ) : isRestoringSession ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 text-sm text-white/55">
          Завантаження…
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 pb-28 text-center">
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6">
            <p className="text-sm font-semibold text-white">Не вдалося відкрити календар</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Повторіть відновлення сесії Telegram.
            </p>
            <button
              type="button"
              onClick={() => void restoreSession('manual')}
              className="mt-4 rounded-xl border border-sky-300/30 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
            >
              Спробувати ще раз
            </button>
          </div>
        </main>
      )}
    </MiniAppLayout>
  )
}
