
// packages/frontend/src/services/api.ts
import type { RootState } from '@/app/store'
import { TAG_TYPES } from '@/types/tagTypes'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// ✅ Автоматичне визначення API URL
const getApiUrl = (): string => {
  // 1. Якщо є змінна оточення - використовуємо її
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // 2. Якщо немає - визначаємо автоматично
  const isDevelopment = import.meta.env.DEV
  
  if (isDevelopment) {
    return 'http://localhost:3001'
  }
  
  return 'https://starway-backend.vercel.app/api'
}
// const API_URL = import.meta.env.VITE_API_URL

const API_URL = getApiUrl()
console.log('🌐 API URL:', API_URL)

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Беремо токен з Redux store
      const token = (getState() as RootState).auth.accessToken
      
      console.log('📡 prepareHeaders token:', token)

      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      
      return headers
    },
  }),
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
})