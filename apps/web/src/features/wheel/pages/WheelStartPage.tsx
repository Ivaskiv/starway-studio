// features/wheel/pages/WheelStartPage.tsx
import { ROUTES } from '@/config/routes'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { WheelForm } from '@/features/wheel/components/WheelForm'
import { resetWheelPersistedState } from '@/features/wheel/hooks/useWheelFlowState'
import { Button } from '@/ui'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function WheelStartPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAuthenticated, emailCompletionRequired, refetch } = useUserState()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    resetWheelPersistedState()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || emailCompletionRequired) return
    void trackFrontendEvent({
      userId: user?.id ?? null,
      type: 'founder_wheel_started',
      source: 'web',
      state: 'wheel',
    })
  }, [emailCompletionRequired, isAuthenticated, trackFrontendEvent, user?.id])

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="card-surface liquid-glass rounded-2xl p-8 text-center space-y-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            Колесо балансу
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Увійди, щоб продовжити
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Діагностика доступна після входу в систему
          </p>
          <Button onClick={() => navigate('/login')} variant="solid" className="hero-cta-primary w-full">
            Увійти
          </Button>
        </div>
      </div>
    )
  }

  if (emailCompletionRequired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmailCompletionCard onCompleted={async () => { await refetch() }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Крок самодіагностики
        </p>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Колесо балансу
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Оціни кожну сферу чесно — де ти зараз, не де хочеш бути
        </p>
      </div>

      <WheelForm
        freshStart
        onComplete={() => {
          void trackFrontendEvent({
            userId: user?.id ?? null,
            type: 'founder_wheel_completed',
            source: 'web',
            state: 'wheel',
          })
          void refetch()
          navigate(ROUTES.GOALS, { replace: true })
        }}
        onCancel={() => navigate(ROUTES.WHEEL)}
      />
    </div>
  )
}
