// features/wheel/api/wheel.api.ts

import { api } from '@/services/api'
import type { WheelAssessment, WheelScore, WheelAnalysis } from '../types/wheel.types'

export const wheelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Останній результат
    getLatestWheel: builder.query<WheelAssessment | null, string>({
      query: (userId) => `/wheel/latest/${userId}`,
      providesTags: ['Wheel'],
    }),

    // Історія оцінок
    getWheelHistory: builder.query<WheelAssessment[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 12 }) => `/wheel/history/${userId}?limit=${limit}`,
      providesTags: ['Wheel'],
    }),

    // Порівняння двох оцінок
    compareWheels: builder.query<{
      previous: WheelAssessment
      current: WheelAssessment
      changes: { categoryId: string; delta: number }[]
    }, { userId: string; previousId?: string }>({
      query: ({ userId, previousId }) => 
        `/wheel/compare/${userId}${previousId ? `?previousId=${previousId}` : ''}`,
      providesTags: ['Wheel'],
    }),

    // Надіслати нову оцінку
    submitWheel: builder.mutation<WheelAssessment, { userId: string; scores: WheelScore[] }>({
      query: ({ userId, scores }) => ({
        url: '/wheel',
        method: 'POST',
        body: { userId, scores },
      }),
      invalidatesTags: ['Wheel'],
    }),

    // AI аналіз колеса
    analyzeWheel: builder.mutation<WheelAnalysis, { userId: string; scores: WheelScore[] }>({
      query: ({ userId, scores }) => ({
        url: '/wheel/analyze',
        method: 'POST',
        body: { userId, scores },
      }),
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetLatestWheelQuery,
  useGetWheelHistoryQuery,
  useCompareWheelsQuery,
  useSubmitWheelMutation,
  useAnalyzeWheelMutation,
} = wheelApi