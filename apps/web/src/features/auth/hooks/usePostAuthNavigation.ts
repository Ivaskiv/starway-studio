import { useAppDispatch } from '@/app/hooks'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { accessApi } from '@/features/auth/services/accessApi'
import { hasPaidAccess, isTrialAccess } from '@/features/auth/utils/access.utils'
import { getToken } from '@/features/auth/services/token'
import { userStateApi } from '@/features/auth/services/user-state.api'
import { useNavigate } from 'react-router-dom'

export function usePostAuthNavigation() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()

  return async () => {
    try {
      const access = await dispatch(
        accessApi.endpoints.getMyAccess.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      ).unwrap()

      await dispatch(
        userStateApi.endpoints.getUserState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      ).unwrap()

      if (access.plan === 'free') {
        navigate(ROUTES.SUBSCRIPTION, { replace: true })
        return
      }

      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      console.warn('[usePostAuthNavigation] Failed to resolve user step', error)
      if (user?.id || getToken()) {
        navigate(hasPaidAccess(user) || isTrialAccess(user) ? ROUTES.DASHBOARD : ROUTES.SUBSCRIPTION, { replace: true })
        return
      }
      navigate(ROUTES.HOME, { replace: true })
    }
  }
}
