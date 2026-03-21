import { useAppDispatch } from '@/app/hooks'
import type { RootState } from '@/app/store'
import { ROUTES } from '@/config/routes'
import { userStateApi, type UserStep } from '@/features/auth/services/user-state.api'
import type { User } from '@/features/user/types/user.types'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

function resolveRoute(step: UserStep): string {
  switch (step) {
    case 'START_FLOW':
      return ROUTES.ONBOARDING_START
    case 'WHEEL':
      return ROUTES.WHEEL_START
    default:
      return ROUTES.HOME
  }
}

export function usePostAuthNavigation() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const currentUser = useSelector((state: RootState) => state.auth.user)

  return async (userOverride?: Pick<User, 'email'> | null) => {
    const email = userOverride?.email ?? currentUser?.email ?? null

    // Missing email stays on the landing flow where the blocking completion guard already lives.
    if (!email) {
      navigate(ROUTES.HOME, { replace: true })
      return
    }

    try {
      const result = await dispatch(
        userStateApi.endpoints.getUserState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      ).unwrap()

      navigate(resolveRoute(result.step), { replace: true })
    } catch (error) {
      console.warn('[usePostAuthNavigation] Failed to resolve user step', error)
      navigate(ROUTES.HOME, { replace: true })
    }
  }
}
