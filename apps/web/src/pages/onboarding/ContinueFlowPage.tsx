import { ROUTES } from '@/config/routes'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useResolveDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { Button } from '@/ui'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function resolveStepRoute(step: string, hasWebMap: boolean): string {
  if (step === 'START_FLOW' || step === 'WHEEL') {
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

function resolveDeepLinkFallbackRoute(path: string | null, step: string, hasWebMap: boolean) {
  if (path?.startsWith('/miniapp')) {
    return path
  }

  return resolveStepRoute(step, hasWebMap)
}

export default function ContinueFlowPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resolveDeepLink] = useResolveDeepLinkMutation()
  const { isAuthenticated, isLoading, step, emailCompletionRequired, refetch } = useUserState()
  const { data: webMap } = useGetWebMapQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('dl')

    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      if (token) {
        return
      }
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    if (emailCompletionRequired) {
      return
    }

    if (token) {
      void resolveDeepLink({ token, consume: true })
        .unwrap()
        .then(result => {
          if (result.link.path) {
            navigate(result.link.path, { replace: true })
            return
          }

          navigate(resolveDeepLinkFallbackRoute(result.link.path, step, Boolean(webMap)), { replace: true })
        })
        .catch(() => {
          navigate(resolveStepRoute(step, Boolean(webMap)), { replace: true })
        })
      return
    }

    navigate(resolveStepRoute(step, Boolean(webMap)), { replace: true })
  }, [emailCompletionRequired, isAuthenticated, isLoading, location.search, navigate, resolveDeepLink, step, webMap])

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
