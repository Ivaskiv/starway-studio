// frontend/src/features/auth/hooks/useAuth.ts
import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { useGetMeQuery, useLogoutMutation } from '../services/auth.api'
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAccessToken,
  setLoading,
  hydrateAuth,
  clearAuth,
} from '../services/auth.slice'
import { getToken, removeToken } from '@/services/api'
import { api } from '@/services/api'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const user = useAppSelector(selectCurrentUser)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectIsLoading)
  const accessToken = useAppSelector(selectAccessToken)

  // === Авто-fetch / hydrate user ===
  const { data: meData, isLoading: isFetching, isError, refetch } = useGetMeQuery(undefined, {
    skip: !accessToken,
    refetchOnMountOrArgChange: true,
  })

  // === Logout mutation ===
  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation()

  // === Hydrate auth при старті ===
  useEffect(() => {
    const token = getToken()
    if (token && !user) {
      dispatch(setLoading(true))
    }

    if (meData && !user) {
      dispatch(hydrateAuth({ user: meData.user }))
      dispatch(setLoading(false))
    }

    if (isError) {
      console.warn('⚠️ [useAuth] Failed to fetch user, clearing auth')
      dispatch(clearAuth())
      removeToken()
    }
  }, [meData, user, isError, dispatch])

  // === Logout function ===
  const logout = useCallback(async () => {
    try {
      await logoutMutation().unwrap()
    } catch {}
    dispatch(clearAuth())
    removeToken()
    dispatch(api.util.resetApiState())
    navigate('/auth', { replace: true })
  }, [dispatch, logoutMutation, navigate])

  // === Force refresh user ===
  const refreshUser = useCallback(() => {
    if (accessToken) refetch()
  }, [accessToken, refetch])

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading: isLoading || isFetching || isLogoutLoading,
    logout,
    refreshUser,
  }
}

// ============================
// Demo user hook для dev/testing
// ============================
export function useDemoUser() {
  const dispatch = useAppDispatch()
  const demoUser = useAppSelector(selectCurrentUser)

  useEffect(() => {
    // перевіряємо localStorage
    const demoData = localStorage.getItem('demoUser')
    if (demoData) {
      try {
        const parsed = JSON.parse(demoData)
        dispatch(hydrateAuth({ user: parsed }))
      } catch {
        localStorage.removeItem('demoUser')
      }
    }
  }, [dispatch])

  const setDemoUser = (user: any) => {
    localStorage.setItem('demoUser', JSON.stringify(user))
    dispatch(hydrateAuth({ user }))
  }

  const clearDemoUser = () => {
    localStorage.removeItem('demoUser')
    dispatch(clearAuth())
  }

  return { demoUser, setDemoUser, clearDemoUser }
}
