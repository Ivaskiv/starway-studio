import { useAppDispatch } from '@/app/hooks'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getToken } from '@/features/auth/services/token'
import { userStateApi } from '@/features/auth/services/user-state.api'
import { useNavigate } from 'react-router-dom'

export function usePostAuthNavigation() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()

  return async () => {
    try {
      await dispatch(
        userStateApi.endpoints.getUserState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      ).unwrap()

      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      console.warn('[usePostAuthNavigation] Failed to resolve user step', error)
      if (user?.id || getToken()) {
        navigate(ROUTES.DASHBOARD, { replace: true })
        return
      }
      navigate(ROUTES.HOME, { replace: true })
    }
  }
}
