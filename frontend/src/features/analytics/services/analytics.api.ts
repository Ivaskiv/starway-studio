// frontend/src/features/analytics/services/analytics.api.ts
import { api } from '@/services/api'
import { DashboardStats, AnalyticsData } from '../types/analytics.types'

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAnalytics: builder.query<AnalyticsData, { funnelId?: string; period?: string }>({
      query: ({ funnelId, period }) => ({
        url: '/analytics',
        method: 'GET',
        params: { funnelId, period },
      }),
      providesTags: ['Analytics'],
    }),

    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/analytics/stats',
      providesTags: ['Stats'],
    }),
  }),
})

export const { useGetAnalyticsQuery, useGetDashboardStatsQuery } = analyticsApi