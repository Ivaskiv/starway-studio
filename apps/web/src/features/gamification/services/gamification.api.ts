import { api } from '@/services/api'
import type { GamificationEventType, GamificationProfile, GamificationSummary, StreakSummary } from '../types'

export const gamificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<GamificationSummary, void>({
      query: () => '/gamification/summary',
      transformResponse: (response: { success: boolean; summary: GamificationSummary }) => response.summary,
      providesTags: ['GamificationProfile', 'Streak', 'UserProgress'],
    }),
    getProfile: builder.query<GamificationProfile, void>({
      query: () => '/gamification/profile',
      transformResponse: (response: { success: boolean; profile: GamificationProfile }) => response.profile,
      providesTags: ['GamificationProfile'],
    }),
    getUserStreak: builder.query<StreakSummary, void>({
      query: () => '/gamification/streak',
      transformResponse: (response: { success: boolean; summary: StreakSummary }) => response.summary,
      providesTags: ['Streak'],
    }),
    emitGamificationEvent: builder.mutation<GamificationSummary, { event: GamificationEventType; source?: 'web' | 'miniapp' | 'tg' }>({
      query: ({ event, source = 'web' }) => ({
        url: '/gamification/events',
        method: 'POST',
        body: { event, source },
      }),
      transformResponse: (response: { success: boolean; summary: GamificationSummary }) => response.summary,
      invalidatesTags: ['GamificationProfile', 'Streak', 'UserProgress'],
    }),
  }),
})

export const {
  useEmitGamificationEventMutation,
  useGetProfileQuery,
  useGetSummaryQuery,
  useGetUserStreakQuery,
} = gamificationApi
