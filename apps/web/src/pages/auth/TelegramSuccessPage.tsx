import { ROUTES } from '@/config/routes'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { Button } from '@/ui'
import { CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function resolveFallbackRoute(step: string, hasWebMap: boolean): string {
  if (step === 'WHEEL') {
    return ROUTES.WHEEL_START
  }

  if (step === 'DAILY_MORNING') {
    if (!hasWebMap) {
      return ROUTES.VISION
    }
    return ROUTES.DASHBOARD
  }

  return ROUTES.HOME
}

export default function TelegramSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { step, isLoading, isAuthenticated } = useUserState()
  const { data: webMap } = useGetWebMapQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: false,
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const token = searchParams.get('dl') ?? searchParams.get('token')
    if (token) {
      navigate(`${ROUTES.ONBOARDING_CONTINUE}?dl=${encodeURIComponent(token)}`, { replace: true })
      return
    }

    if (isLoading || !isAuthenticated) {
      return
    }

    if (step === 'WHEEL') {
      navigate(ROUTES.WHEEL_START, { replace: true })
      return
    }

    if (step !== 'START_FLOW') {
      navigate(resolveFallbackRoute(step, Boolean(webMap)), { replace: true })
    }
  }, [isAuthenticated, isLoading, location.search, navigate, step, webMap])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="card-surface liquid-glass p-8 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            Telegram
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">Синхронізація...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="card-surface liquid-glass p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-3xl font-bold text-white">
          {location.pathname === ROUTES.MAGIC_LOGIN ? 'Вхід без пароля' : 'Telegram підключено'}
        </h1>

        {step === 'START_FLOW' ? (
          <>
            <p className="mt-3 text-white/65">
              Перший крок готовий. Повертаємось у flow.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate(ROUTES.ONBOARDING_START, { replace: true })}>
                Продовжити
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-white/65">
            Готово, повертаємось...
          </p>
        )}
      </div>
    </div>
  )
}
