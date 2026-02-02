// frontend/src/features/analytics/types/analytics.types.ts
// або src/types/analytics.types.ts
import { ReactNode } from 'react';

export type Trend = 'up' | 'down' | 'stable'

export interface DashboardStat {
  label: string
  value: string | number
  change: string
  trend: Trend
  icon: ReactNode
  color: string
}
export interface DashboardStats {
  stats: {
    label: string
    value: string | number
    change: string
    trend: Trend
    icon: ReactNode // або конкретний тип з lucide-react, якщо хочеш строго
    color: string
  }[]
  funnels: {
    name: string
    visitors: number
    conversions: number
    rate: number
  }[]
  recentActivity: {
    user: string
    action: string
    time: string
    type: 'success' | 'purchase' | 'new' | 'engagement'
  }[]
}


export interface FunnelStep {
  step: string;
  users: number;
  conversion: number;
  dropoff: number;
  icon: ReactNode;
}

export interface TopFunnel {
  name: string;
  conversions: number;
  revenue: string;
  ctr: string;
}

export interface AnalyticsData {
  stats: DashboardStat[];
  funnelSteps: FunnelStep[];
  topFunnels: TopFunnel[];
}

export interface LiveStats {
  usersOnline: number
  messagesSent: number
  activeChats: number
  activityPercent: number
}

export interface AnalyticsPrediction {
  metric: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  iconName: 'Target' | 'Users' | 'DollarSign' | 'TrendingUp';
  color: string;
}

export interface AIRecommendation {
  title: string;
  description: string;
  emoji: string;
}

export interface AnalyticsResponse {
  predictions: AnalyticsPrediction[];
  recommendations: AIRecommendation[];
}


// frontend/src/services/stats.api.ts
// import { api } from './api'

// export interface DashboardStats {
//   total_users: number
//   total_funnels: number
//   active_funnels: number
//   total_revenue: number
//   conversion_rate: number
//   avg_time_on_platform: number
//   new_users_this_month: number
//   revenue_growth: number
// }

// export interface TimeSeriesData {
//   date: string
//   value: number
// }

// export interface TopPerformer {
//   id: string
//   name: string
//   value: number
//   change: number
//   type: 'funnel' | 'product' | 'user'
// }

// export const statsApi = api.injectEndpoints({
//   endpoints: (builder) => ({
//     /** Отримання загальної статистики дашборду */
//     getDashboardStats: builder.query<DashboardStats, { period?: '7d' | '30d' | '90d' }>({
//       query: ({ period = '30d' }) => ({
//         url: '/stats/dashboard',
//         params: { period },
//       }),
//       providesTags: ['Stats'],
//       transformResponse: (response: DashboardStats) => {
//         console.log('✅ [Stats] Dashboard stats loaded')
//         return response
//       },
//     }),

//     /** Часовий ряд для графіків */
//     getTimeSeries: builder.query<TimeSeriesData[], { metric: string; period: string }>({
//       query: ({ metric, period }) => ({
//         url: '/stats/timeseries',
//         params: { metric, period },
//       }),
//       providesTags: ['Stats'],
//     }),

//     /** Топ performers */
//     getTopPerformers: builder.query<TopPerformer[], { type: 'funnels' | 'products' | 'users'; limit?: number }>({
//       query: ({ type, limit = 5 }) => ({
//         url: '/stats/top-performers',
//         params: { type, limit },
//       }),
//       providesTags: ['Stats'],
//     }),

//     /** Експорт статистики */
//     exportStats: builder.mutation<{ url: string }, { format: 'csv' | 'xlsx'; period: string }>({
//       query: ({ format, period }) => ({
//         url: '/stats/export',
//         method: 'POST',
//         body: { format, period },
//       }),
//       // invalidatesTags не потрібно, бо експорт не змінює дані
//     }),
//   }),
//   overrideExisting: false,
// })

// export const {
//   useGetDashboardStatsQuery,
//   useLazyGetDashboardStatsQuery,
//   useGetTimeSeriesQuery,
//   useGetTopPerformersQuery,
//   useExportStatsMutation,
// } = statsApi