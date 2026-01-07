// packages/frontend/src/services/stats.api.ts
import { api } from './api';

export interface DashboardStats {
  totalUsers: number;
  totalFunnels: number;
  activeFunnels: number;
  totalRevenue: number;
  conversionRate: number;
  avgTimeOnPlatform: number;
  newUsersThisMonth: number;
  revenueGrowth: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  value: number;
  change: number;
  type: 'funnel' | 'product' | 'user';
}

export const statsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Отримання загальної статистики дашборду
     */
    getDashboardStats: builder.query<DashboardStats, { period?: '7d' | '30d' | '90d' }>({
      query: ({ period = '30d' }) => ({
        url: '/stats/dashboard',
        params: { period },
      }),
      providesTags: ['Stats'],
      transformResponse: (response: DashboardStats) => {
        console.log('✅ [Stats] Dashboard stats loaded');
        return response;
      },
    }),

    /**
     * Отримання часового ряду для графіків
     */
    getTimeSeries: builder.query<TimeSeriesData[], { metric: string; period: string }>({
      query: ({ metric, period }) => ({
        url: '/stats/timeseries',
        params: { metric, period },
      }),
      providesTags: ['Stats'],
    }),

    /**
     * Топ performers (воронки, продукти, користувачі)
     */
    getTopPerformers: builder.query<TopPerformer[], { type: 'funnels' | 'products' | 'users'; limit?: number }>({
      query: ({ type, limit = 5 }) => ({
        url: '/stats/top-performers',
        params: { type, limit },
      }),
      providesTags: ['Stats'],
    }),

    /**
     * Експорт статистики
     */
    exportStats: builder.mutation<{ url: string }, { format: 'csv' | 'xlsx'; period: string }>({
      query: ({ format, period }) => ({
        url: '/stats/export',
        method: 'POST',
        body: { format, period },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardStatsQuery,
  useLazyGetDashboardStatsQuery,
  useGetTimeSeriesQuery,
  useGetTopPerformersQuery,
  useExportStatsMutation,
} = statsApi;