import { api } from '@/services/api'
import type { GamificationProfile, StreakSummary } from '../types'

export const gamificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
})

export const { useGetProfileQuery, useGetUserStreakQuery } = gamificationApi
