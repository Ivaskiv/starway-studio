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
import type {
  AnalyticsData,
  AnalyticsFunnel,
  FounderAnalytics,
  AnalyticsInsights,
  AnalyticsLiveEvent,
  AnalyticsOverview,
  AnalyticsQuestion,
  AnalyticsRetention,
  DashboardStats,
} from '../types/types'

// ─── Тип для адмін-статистики (був у services/dashboard.api.ts) ───────────────

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  avgActionsPerUser: number
  streakUsers: number
  topEvents: Array<{
    type: string
    count: number
  }>
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
        url: '/analytics/overview',
        params,
      }),
      providesTags: ['Stats'],
    }),

    getAnalyticsOverview: builder.query<AnalyticsOverview, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' } = {}) => ({
        url: '/analytics/overview',
        params: { period },
      }),
      providesTags: ['Stats'],
    }),

    getAnalyticsFunnel: builder.query<AnalyticsFunnel, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' } = {}) => ({
        url: '/analytics/funnel',
        params: { period },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalyticsQuestions: builder.query<{ questions: AnalyticsQuestion[] }, { period?: '7d' | '30d' | '90d'; limit?: number }>({
      query: ({ period = '30d', limit = 10 } = {}) => ({
        url: '/analytics/questions',
        params: { period, limit },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalyticsLive: builder.query<{ events: AnalyticsLiveEvent[] }, { limit?: number }>({
      query: ({ limit = 20 } = {}) => ({
        url: '/analytics/live',
        params: { limit },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalyticsRetention: builder.query<AnalyticsRetention, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' } = {}) => ({
        url: '/analytics/retention',
        params: { period },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalyticsInsights: builder.query<AnalyticsInsights, { period?: '7d' | '30d' | '90d'; limit?: number }>({
      query: ({ period = '30d', limit = 8 } = {}) => ({
        url: '/analytics/insights',
        params: { period, limit },
      }),
      providesTags: ['Analytics'],
    }),

    getFounderAnalytics: builder.query<FounderAnalytics, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' } = {}) => ({
        url: '/analytics/founder',
        params: { period },
      }),
      providesTags: ['Analytics'],
    }),
  }),
})

export const {
  useGetAnalyticsQuery,
  useGetDashboardStatsQuery, // /analytics/stats
  useGetAdminStatsQuery,     // /dashboard/stats (замінює dashboard.api.ts)
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsFunnelQuery,
  useGetAnalyticsQuestionsQuery,
  useGetAnalyticsLiveQuery,
  useGetAnalyticsRetentionQuery,
  useGetAnalyticsInsightsQuery,
  useGetFounderAnalyticsQuery,
} = analyticsApi
