// features/analytics/services/analytics.api.ts
//
// Два окремих endpoint-и з різними URL та типами:
//   useGetDashboardStatsQuery  → /analytics/stats  (загальна аналітика)
//   useGetAdminStatsQuery      → /dashboard/stats  (адмін-статистика з period)
//
// ⚠️  src/services/dashboard.api.ts — ВИДАЛИТИ після цього файлу.
//     Всі споживачі useGetDashboardStatsQuery з dashboard.api.ts
//     → замінити на useGetAdminStatsQuery звідси.

import { api } from '@/services/api'
import type { AnalyticsData, DashboardStats } from '../types/types'

// ─── Тип для адмін-статистики (був у services/dashboard.api.ts) ───────────────

export interface AdminStats {
  total_funnels:        number
  total_users:          number
  total_revenue:        number
  new_users_this_month: number
  active_funnels:       number
  conversion_rate:      number
  revenue_growth:       number
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const analyticsApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: builder => ({

    // Аналітика по конкретному фунелу / періоду
    getAnalytics: builder.query<AnalyticsData, { funnelId?: string; period?: string }>({
      query: ({ funnelId, period }) => ({
        url: '/analytics',
        params: { funnelId, period },
      }),
      providesTags: ['Analytics'],
    }),

    // Загальна статистика дашборду (з analytics.api.ts)
    getDashboardStats: builder.query<DashboardStats, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' } = {}) => `/analytics/stats?period=${period}`,
      providesTags: ['Stats'],
    }),

    // Адмін-статистика (був окремий dashboard.api.ts → поглинуто сюди)
    getAdminStats: builder.query<AdminStats, { period: string }>({
      query: params => ({
        url: '/dashboard/stats',
        params,
      }),
      providesTags: ['Stats'],
    }),
  }),
})

export const {
  useGetAnalyticsQuery,
  useGetDashboardStatsQuery, // /analytics/stats
  useGetAdminStatsQuery,     // /dashboard/stats (замінює dashboard.api.ts)
} = analyticsApi