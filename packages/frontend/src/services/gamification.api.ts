// packages/frontend/src/services/gamification.api.ts
import { Achievement, Challenge, LeaderboardEntry, Reward, Streak, UserLevel } from '@/types/gamification.types';
import { api } from './api';

export const gamificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Achievements
    getUserAchievements: builder.query<Achievement[], void>({
      query: () => '/gamification/achievements',
      providesTags: ['Achievement'],
    }),

    unlockAchievement: builder.mutation<Achievement, string>({
      query: (achievementId) => ({
        url: `/gamification/achievements/${achievementId}/unlock`,
        method: 'POST',
      }),
      invalidatesTags: ['Achievement', 'Points', 'Level'],
    }),

    // Levels
    getUserLevel: builder.query<UserLevel, void>({
      query: () => '/gamification/level',
      providesTags: ['Level'],
    }),

    claimLevelReward: builder.mutation<void, number>({
      query: (level) => ({
        url: `/gamification/level/${level}/claim`,
        method: 'POST',
      }),
      invalidatesTags: ['Level', 'Reward'],
    }),

    // Points
    getUserPoints: builder.query<{ total: number; available: number }, void>({
      query: () => '/gamification/points',
      providesTags: ['Points'],
    }),

    // Leaderboard
    getLeaderboard: builder.query<LeaderboardEntry[], { period: 'week' | 'month' | 'all'; limit?: number }>({
      query: ({ period, limit = 100 }) => ({
        url: '/gamification/leaderboard',
        params: { period, limit },
      }),
      providesTags: ['Leaderboard'],
    }),

    // Streaks
    getUserStreak: builder.query<Streak, void>({
      query: () => '/gamification/streak',
      providesTags: ['Streak'],
    }),

    updateStreak: builder.mutation<Streak, void>({
      query: () => ({
        url: '/gamification/streak/update',
        method: 'POST',
      }),
      invalidatesTags: ['Streak', 'Points'],
    }),

    // Rewards
    getAvailableRewards: builder.query<Reward[], void>({
      query: () => '/gamification/rewards',
      providesTags: ['Reward'],
    }),

    claimReward: builder.mutation<Reward, string>({
      query: (rewardId) => ({
        url: `/gamification/rewards/${rewardId}/claim`,
        method: 'POST',
      }),
      invalidatesTags: ['Reward', 'Points'],
    }),

    // Challenges
    getActiveChallenges: builder.query<Challenge[], void>({
      query: () => '/gamification/challenges/active',
      providesTags: ['Challenge'],
    }),

    updateChallengeProgress: builder.mutation<Challenge, { challengeId: string; progress: number }>({
      query: ({ challengeId, progress }) => ({
        url: `/gamification/challenges/${challengeId}/progress`,
        method: 'POST',
        body: { progress },
      }),
      invalidatesTags: ['Challenge', 'Points', 'Achievement'],
    }),
  }),
});

export const {
  useGetUserAchievementsQuery,
  useUnlockAchievementMutation,
  useGetUserLevelQuery,
  useClaimLevelRewardMutation,
  useGetUserPointsQuery,
  useGetLeaderboardQuery,
  useGetUserStreakQuery,
  useUpdateStreakMutation,
  useGetAvailableRewardsQuery,
  useClaimRewardMutation,
  useGetActiveChallengesQuery,
  useUpdateChallengeProgressMutation,
} = gamificationApi;