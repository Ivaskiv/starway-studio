import { api } from '@/services/api'

export type PlatformAccessStatus =
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAID_ONBOARDING'
  | 'PAID_ACTIVE'
  | 'FOCUS_ONLY'
  | 'BLOCKED'

export type PlatformAccess = {
  status: PlatformAccessStatus
  trialDay: number | null
  daysLeft: number | null
  focusPaid: boolean
  aiUpgraded: boolean
  onboardingDone: boolean
  canAccessPlatform: boolean
  canAccessPaidModules: boolean
}

export type PlatformMetricReport = {
  period: 'weekly' | 'monthly'
  metrics: {
    from: string
    to: string
    days: number
    dailyEntries: number
    microTasksDone: number
    microTasksTotal: number
    mentorSessions: number
    wheelEntries: number
    avgWheelScore: number | null
  }
  summary: string[]
}

export type PlatformWheelSummary = {
  latest: {
    id: string
    createdAt: string
    updatedAt: string
    scores: Array<{ categoryId: string; score: number }>
    notes: string | null
  } | null
  cooldown: {
    canFill: boolean
    regenCount: number
    regenLeft: number
    nextWheelAt: string | null
    lastWheelAt: string | null
  }
  analytics: {
    totalAssessments: number
    balanceIndex: number
    trend: 'improving' | 'declining' | 'stable'
  }
  history: Array<{
    id: string
    createdAt: string
    updatedAt: string
    scores: Array<{ categoryId: string; score: number }>
  }>
}

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
