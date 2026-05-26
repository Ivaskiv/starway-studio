import { api } from '@/services/api'
import type { PlatformAccess, PlatformMetricReport, PlatformWheelSummary } from '../types/platformAccess.types'
export type { PlatformAccess, PlatformAccessStatus, PlatformMetricReport, PlatformWheelSummary } from '../types/platformAccess.types'

export const platformApi = api.injectEndpoints({
  endpoints: builder => ({
    getPlatformAccess: builder.query<PlatformAccess, void>({
      query: () => '/platform/access',
      providesTags: ['Platform', 'Access'],
    }),
    getPlatformTodayCycle: builder.query<Record<string, unknown>, void>({
      query: () => '/platform/cycle/today',
      providesTags: ['Platform', 'DailyCycle'],
    }),
    getPlatformCycleHistory: builder.query<Record<string, unknown>[], number | void>({
      query: days => ({
        url: '/platform/cycle/history',
        params: { days: days ?? 7 },
      }),
      providesTags: ['Platform', 'DailyCycle'],
    }),
    getPlatformWheel: builder.query<PlatformWheelSummary, void>({
      query: () => '/platform/wheel',
      providesTags: ['Platform', 'Wheel'],
    }),
    getPlatformWeeklyReport: builder.query<PlatformMetricReport, void>({
      query: () => '/platform/reports/weekly',
      providesTags: ['Platform', 'WeeklyReport'],
    }),
    generatePlatformWeeklyReport: builder.mutation<Record<string, unknown>, void>({
      query: () => ({
        url: '/platform/reports/weekly/generate',
        method: 'POST',
      }),
      invalidatesTags: ['Platform', 'WeeklyReport'],
    }),
    getPlatformMonthlyReport: builder.query<PlatformMetricReport, void>({
      query: () => '/platform/reports/monthly',
      providesTags: ['Platform'],
    }),
  }),
})

export const {
  useGeneratePlatformWeeklyReportMutation,
  useGetPlatformAccessQuery,
  useGetPlatformCycleHistoryQuery,
  useGetPlatformMonthlyReportQuery,
  useGetPlatformTodayCycleQuery,
  useGetPlatformWeeklyReportQuery,
  useGetPlatformWheelQuery,
} = platformApi
