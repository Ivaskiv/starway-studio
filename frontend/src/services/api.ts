// frontend/src/services/api.ts
import { RootState } from '@/app/store'
import { TAG_TYPES } from '@/shared/types/tagTypes'
import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react'

const TOKEN_KEY = 'starway_auth_token'

const getApiUrl = (): string => {
  if (import.meta.env.DEV) {
    console.log('[API Config] Development mode - using proxy: /api')
    return '/api'
  }
  const url = import.meta.env.VITE_API_URL || 'https://starway-backend.vercel.app/api'
  console.log('[API Config] Production URL:', url)
  return url
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      const tokenFromState = state.auth.accessToken
      const tokenFromStorage = localStorage.getItem(TOKEN_KEY)
      const token = tokenFromState || tokenFromStorage

      const url = typeof args === 'string' ? args : args.url
      const isAuthRoute = url.startsWith('/auth/login') || url.startsWith('/auth/register')
      const isPdfRoute = url.includes('/pdf')

      console.log('[API Request]', {
        url,
        hasToken: !!token,
        tokenSource: tokenFromState ? 'Redux' : tokenFromStorage ? 'localStorage' : 'none',
        isAuthRoute,
        isPdfRoute,
      })

      if (token && !isAuthRoute) {
        headers.set('Authorization', `Bearer ${token}`)
        console.log('[API Headers] ✅ Authorization header set')
      } else {
        console.log('[API Headers] ⚠️ No auth header')
      }

      if (!isPdfRoute) {
        headers.set('Content-Type', 'application/json')
      }

      return headers
    },
  })

  const result = await baseQuery(args, api, extraOptions)

  if (result.error) {
    console.error('[API Error]', {
      status: result.error.status,
      url: typeof args === 'string' ? args : args.url,
      error: result.error,
    })

    if (result.error?.status === 401 || result.error?.status === 403) {
      console.log('[API Auth] 401/403 detected - clearing auth')
      localStorage.removeItem(TOKEN_KEY)

      try {
        const { clearAuth } = await import('@/features/auth/services/auth.slice')
        api.dispatch(clearAuth())
        console.log('[API Auth] Redux auth cleared')
      } catch (err) {
        console.error('[API Auth] Failed to clear Redux:', err)
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        console.log('[API Auth] Redirecting to home')
        window.location.href = '/'
      }
    }
  } else {
    console.log('[API Success]', typeof args === 'string' ? args : args.url)
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
})

export const saveToken = (token: string): void => {
  console.log('[API Token] Saving:', token.substring(0, 20) + '...')
  localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY)
  console.log('[API Token] Get:', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
  return token
}

export const removeToken = (): void => {
  console.log('[API Token] Removing')
  localStorage.removeItem(TOKEN_KEY)
}

export default api