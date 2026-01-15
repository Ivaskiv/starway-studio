// packages/frontend/src/features/auth/hooks/useAuth.ts

import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import { api } from '@/services/api'
import type { User } from '../../../types/user.types'
import { useGetMeQuery } from '../services/auth.api'
import { logout, setCredentials } from '../services/auth.slice'

export type AuthStatus = 'loading' | 'guest' | 'authenticated'

export function useAuth() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { accessToken, user } = useSelector((s: RootState) => s.auth)

  const { data, isLoading } = useGetMeQuery(undefined, {
    skip: !accessToken,
  })

  useEffect(() => {
    if (data?.user && data.tokens?.accessToken) {
      dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.tokens.accessToken,
        })
      )
    }
  }, [data, dispatch])

  const logoutUser = useCallback(() => {
    dispatch(logout())
    dispatch(api.util.resetApiState())
    navigate('/auth', { replace: true })
  }, [dispatch, navigate])

  let authStatus: AuthStatus = 'guest'
  if (isLoading) authStatus = 'loading'
  else if (user && accessToken) authStatus = 'authenticated'

  const setAuth = useCallback(
    (payload: { user: User; accessToken: string }) => {
      dispatch(setCredentials(payload))
    },
    [dispatch]
  )

  return {
    user,
    authStatus,
    isAuthenticated: authStatus === 'authenticated',
    isLoading: authStatus === 'loading',
    logout: logoutUser,
    setCredentials: setAuth,
  }
}
