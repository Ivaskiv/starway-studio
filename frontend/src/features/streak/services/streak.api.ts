// frontend/src/features/streak/services/streak.api.ts
/**
 * Streak API
 */

import { api } from '@/services/api';

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
  totalDays: number;
  stabilityDays: number;
  drainDays: number;
}

export const streakApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get streak
    getStreak: builder.query<Streak, void>({
      query: () => '/streak',
      providesTags: ['Streak']
    })
  })
});

export const {
  useGetStreakQuery
} = streakApi;