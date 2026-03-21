import { ROUTES } from '@/config/routes'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useResolveDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { Button } from '@/ui'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function resolveStepRoute(step: string): string {
  if (step === 'START_FLOW' || step === 'WHEEL') {
    return ROUTES.WHEEL_START
  }

  if (step === 'DAILY_MORNING') {
    return ROUTES.DASHBOARD
  }

  return ROUTES.HOME
}

export default function ContinueFlowPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resolveDeepLink] = useResolveDeepLinkMutation()
  const { isAuthenticated, isLoading, step, emailCompletionRequired, refetch } = useUserState()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    if (emailCompletionRequired) {
      return
    }

    const token = new URLSearchParams(location.search).get('dl')
    if (token) {
      void resolveDeepLink({ token, consume: true })
        .unwrap()
        .then(result => {
          if (result.link.path) {
            navigate(result.link.path, { replace: true })
            return
          }

          navigate(resolveStepRoute(step), { replace: true })
        })
        .catch(() => {
          navigate(resolveStepRoute(step), { replace: true })
        })
      return
    }

    navigate(resolveStepRoute(step), { replace: true })
  }, [emailCompletionRequired, isAuthenticated, isLoading, location.search, navigate, resolveDeepLink, step])

  if (emailCompletionRequired) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmailCompletionCard onCompleted={async () => { await refetch() }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="card-surface liquid-glass p-8 text-center">
        <h1 className="text-3xl font-bold text-white">Повертаємо в flow</h1>
        <p className="mt-3 text-white/65">
          Перевіряємо поточний крок і синхронізуємо контекст між каналами.
        </p>
        <div className="mt-6">
          <Button disabled>{isLoading ? 'Завантаження...' : 'Переходимо...'}</Button>
        </div>
      </div>
    </div>
  )
}
