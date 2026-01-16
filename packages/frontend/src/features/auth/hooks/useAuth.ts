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
// 🐛 DEBUG
  const rootState = useSelector((s: RootState) => s);
  console.log('🔍 Root state:', rootState);
  
  const authState = useSelector((s: RootState) => s.auth);
  
  if (!authState) {
    console.error('❌ Auth state is undefined!');
    console.error('Available keys:', Object.keys(rootState));
  }
  
const accessToken = authState?.accessToken || null;      // ← accessToken, не token!
const user = authState?.user || null;  
  console.log('✅ accessToken:', accessToken);
  console.log('✅ user:', user);
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
