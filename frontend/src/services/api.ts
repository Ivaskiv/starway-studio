// frontend/src/services/api.ts
import { 
  createApi, 
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError 
} from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/app/store/store'
import { TAG_TYPES } from '@/shared/types/tagTypes'

// ===========================
// CONSTANTS
// ===========================
const TOKEN_KEY = 'starway_auth_token'

// ===========================
// API URL LOGIC
// ===========================
const getApiUrl = (): string => {
  // Development: використовуємо Vite proxy
  if (import.meta.env.DEV) {
    return '/api'
  }
  
  // Production: використовуємо env або дефолт
  return import.meta.env.VITE_API_URL || 'https://starway-backend.vercel.app/api'
}

// ===========================
// BASE QUERY WITH REAUTH
// ===========================
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  
  const baseQuery = fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers, { getState }) => {
      // Пріоритет: Redux state → localStorage
      const state = getState() as RootState
      const token = state.auth.accessToken || localStorage.getItem(TOKEN_KEY)
      
      const url = typeof args === 'string' ? args : args.url
      if (token && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      
      headers.set('Content-Type', 'application/json')
      
      return headers
    },
  })

  // Виконуємо запит
  const result = await baseQuery(args, api, extraOptions)

  // Auto-logout при 401/403
  if (result.error?.status === 401 || result.error?.status === 403) {
    console.warn('🔒 [API] Unauthorized, clearing credentials')
    
    // Очищаємо localStorage
    localStorage.removeItem(TOKEN_KEY)
    
    // Очищаємо Redux state (якщо є clearAuth action)
    try {
      const { clearAuth } = await import('@/features/auth/services/auth.slice')
      api.dispatch(clearAuth())
    } catch {
      // Ignore if clearAuth not available
    }
    
    // Redirect на home (опціонально)
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  return result
}

// ===========================
// API INSTANCE
// ===========================
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
})

// ===========================
// HELPERS
// ===========================
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

export default api