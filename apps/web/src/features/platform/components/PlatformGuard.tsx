import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import { useGetPlatformAccessQuery } from '../services/platform.api'
import { hasPlatformAccess } from '../utils/platformAccess'
import type { PlatformAccessDecision } from '../types/platformAccess.types'

type PlatformGuardProps = {
  children: ReactNode
  fallback?: ReactNode | ((decision: PlatformAccessDecision) => ReactNode)
  loading?: ReactNode
  redirectTo?: string
  redirect?: boolean
  requirePaidModules?: boolean
}

function DefaultFallback({ decision }: { decision: PlatformAccessDecision }) {
  const title = decision.reason === 'trial_expired'
    ? 'Trial завершився'
    : decision.reason === 'premium_required'
      ? 'Потрібен Premium доступ'
      : decision.reason === 'guest'
        ? 'Потрібен вхід'
        : 'Доступ до платформи закритий'

  const copy = decision.reason === 'trial_expired'
    ? '7 днів пробного доступу минули. Щоб продовжити daily cycle, wheel і reports, онови доступ.'
    : decision.reason === 'premium_required'
      ? 'Цей модуль доступний після оплати або під час paid onboarding.'
      : decision.reason === 'guest'
        ? 'Увійди в акаунт, щоб система перевірила твій доступ.'
        : 'Для цього розділу потрібен активний platform доступ.'

  return (
    <section className="mx-auto my-8 max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Platform access</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{copy}</p>
      {decision.remainingTrialDays > 0 ? (
        <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Trial days left: {decision.remainingTrialDays}</p>
      ) : null}
    </section>
  )
}

export default function PlatformGuard({
  children,
  fallback,
  loading,
  redirect = false,
  redirectTo = '/dashboard/subscription',
  requirePaidModules = false,
}: PlatformGuardProps) {
  const { authRestoreStatus, canRunProtectedQueries } = useSessionOrchestrator()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const user = useAppSelector(selectCurrentUser)
  const shouldSkip = !canRunProtectedQueries
  const { data: access, isLoading, isFetching } = useGetPlatformAccessQuery(undefined, {
    skip: shouldSkip,
  })

  if (authRestoreStatus === 'idle' || authRestoreStatus === 'restoring' || isLoading || isFetching) {
    return <>{loading ?? <LoadingFallback />}</>
  }

  const decision = hasPlatformAccess({
    isAuthenticated,
    access,
    user,
    requirePaidModules,
  })

  if (decision.allowed) {
    return <>{children}</>
  }

  if (redirect) {
    return <Navigate to={redirectTo} replace />
  }

  if (typeof fallback === 'function') {
    return <>{fallback(decision)}</>
  }

  return <>{fallback ?? <DefaultFallback decision={decision} />}</>
}
