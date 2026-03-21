import { ROUTES } from '@/config/routes'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { MentorFlowCard } from '@/features/auth/components/MentorFlowCard'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { WheelForm } from '@/features/wheel/components/WheelForm'
import { Button } from '@/ui'
import { useNavigate } from 'react-router-dom'

export default function WheelStartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, step, emailCompletionRequired, refetch } = useUserState()

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="card-surface liquid-glass p-8 text-center">
          <h1 className="text-3xl font-bold text-white">Wheel Start</h1>
          <p className="mt-3 text-white/65">Увійдіть, щоб продовжити до колеса балансу.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/login')}>Увійти</Button>
          </div>
        </div>
      </div>
    )
  }

  if (emailCompletionRequired) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmailCompletionCard onCompleted={async () => { await refetch() }} />
      </div>
    )
  }

  if (step !== 'WHEEL') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <MentorFlowCard autoRedirectWheel={false} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Wheel Start
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">Колесо балансу</h1>
        <p className="mt-2 text-white/65">
          Для сумісності з поточним бекендом використовується існуюча форма колеса.
        </p>
      </div>

      <WheelForm
        onComplete={() => {
          void refetch()
          navigate(ROUTES.HOME, { replace: true })
        }}
        onCancel={() => navigate(ROUTES.HOME)}
      />
    </div>
  )
}
