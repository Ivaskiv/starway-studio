// packages/frontend/src/store/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.REACT_APP_API_URL || 'http://localhost:3001',
    prepareHeaders: (headers) => {
      // якщо потрібен токен
      const token = localStorage.getItem('token')
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['AI'],
  endpoints: () => ({}),
})
