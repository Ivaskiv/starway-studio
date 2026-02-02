// frontend/src/features/auth/hooks/useAuth.ts
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { getToken, removeToken } from '@/services/api'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetMeQuery, useLogoutMutation } from '../services/auth.api'
import { clearAuth, hydrateAuth, selectAccessToken, selectCurrentUser } from '../services/auth.slice'

export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const user = useAppSelector(selectCurrentUser)
  const tokenFromState = useAppSelector(selectAccessToken)
  const tokenFromStorage = getToken()
  const accessToken = tokenFromState || tokenFromStorage

  console.log('[useAuth] State:', {
    hasUser: !!user,
    hasTokenInState: !!tokenFromState,
    hasTokenInStorage: !!tokenFromStorage,
    finalToken: accessToken ? accessToken.substring(0, 20) + '...' : 'NO TOKEN'
  })

  const { data: meData, isLoading: isFetching, isError } = useGetMeQuery(undefined, {
    skip: !accessToken,
  })

  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation()

  useEffect(() => {
    if (!accessToken) {
      console.log('[useAuth] No token - skipping getMe')
      return
    }

    if (meData?.user && !user) {
      console.log('[useAuth] Hydrating user from getMe:', meData.user)
      dispatch(hydrateAuth(meData.user))
    }

    if (isError) {
      console.log('[useAuth] GetMe error - clearing auth')
      dispatch(clearAuth())
      removeToken()
    }
  }, [meData, isError, accessToken, user, dispatch])

  const logout = useCallback(async () => {
    console.log('[useAuth] Logout initiated')
    try {
      await logoutMutation().unwrap()
    } catch (err) {
      console.error('[useAuth] Logout mutation failed:', err)
    }
    dispatch(clearAuth())
    removeToken()
    console.log('[useAuth] Navigating to home')
    navigate('/', { replace: true })
  }, [dispatch, logoutMutation, navigate])

  return {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading: isFetching || isLogoutLoading,
    logout,
  }
}