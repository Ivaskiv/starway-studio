// packages/frontend/src/features/auth/hooks/useAuth.ts

import { useGetMeQuery, useLogOutMutation } from '../services/auth.api'
import { useCallback } from 'react'

type AuthStatus = 'loading' | 'guest' | 'authenticated'

export function useAuth() {
  const hasToken = Boolean(localStorage.getItem('starway_auth_token'))
  
  const { data, isLoading, isError, isUninitialized } = useGetMeQuery(undefined, {
    skip: !hasToken,
  })

  const [logOutMutation] = useLogOutMutation()

  // ✅ Визначаємо статус
  let authStatus: AuthStatus = 'guest'
  
  if (!hasToken) {
    authStatus = 'guest'
  } else if (isUninitialized || isLoading) {
    authStatus = 'loading'
  } else if (isError || !data?.user) {
    authStatus = 'guest'
  } else {
    authStatus = 'authenticated'
  }

  const user = data?.user ?? null

  const logout = useCallback(async () => {
    try {
      await logOutMutation().unwrap()
    } catch {
      // ignore
    }
    localStorage.removeItem('starway_auth_token')
    window.location.href = '/auth'
  }, [logOutMutation])

  return {
    authStatus,
    user,
    logout,
    isLoading: authStatus === 'loading',
    isAuthenticated: authStatus === 'authenticated',
    isGuest: authStatus === 'guest',
  }
}