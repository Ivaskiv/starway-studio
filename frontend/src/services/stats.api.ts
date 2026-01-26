// frontend/src/services/stats.api.ts
import { api } from './api'

export interface DashboardStats {
  total_users: number
  total_funnels: number
  active_funnels: number
  total_revenue: number
  conversion_rate: number
  avg_time_on_platform: number
  new_users_this_month: number
  revenue_growth: number
}

export interface TimeSeriesData {
  date: string
  value: number
}

export interface TopPerformer {
  id: string
  name: string
  value: number
  change: number
  type: 'funnel' | 'product' | 'user'
}

export const statsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /** Отримання загальної статистики дашборду */
    getDashboardStats: builder.query<DashboardStats, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' }) => ({
        url: '/stats/dashboard',
        params: { period },
      }),
      providesTags: ['Stats'],
      transformResponse: (response: DashboardStats) => {
        console.log('✅ [Stats] Dashboard stats loaded')
        return response
      },
    }),

    /** Часовий ряд для графіків */
    getTimeSeries: builder.query<TimeSeriesData[], { metric: string; period: string }>({
      query: ({ metric, period }) => ({
        url: '/stats/timeseries',
        params: { metric, period },
      }),
      providesTags: ['Stats'],
    }),

    /** Топ performers */
    getTopPerformers: builder.query<TopPerformer[], { type: 'funnels' | 'products' | 'users'; limit?: number }>({
      query: ({ type, limit = 5 }) => ({
        url: '/stats/top-performers',
        params: { type, limit },
      }),
      providesTags: ['Stats'],
    }),

    /** Експорт статистики */
    exportStats: builder.mutation<{ url: string }, { format: 'csv' | 'xlsx'; period: string }>({
      query: ({ format, period }) => ({
        url: '/stats/export',
        method: 'POST',
        body: { format, period },
      }),
      // invalidatesTags не потрібно, бо експорт не змінює дані
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetDashboardStatsQuery,
  useLazyGetDashboardStatsQuery,
  useGetTimeSeriesQuery,
  useGetTopPerformersQuery,
  useExportStatsMutation,
} = statsApi