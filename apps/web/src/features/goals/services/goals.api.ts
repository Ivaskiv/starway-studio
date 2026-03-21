// frontend/src/features/goals/services/goals.api.ts
/**
 * Goals API
 */

import { api } from '@/services/api';
import { GoalsSet } from '../types/goals.types';

export const goalsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    setGoals: builder.mutation<GoalsSet, { goals: string[]; primaryIndex: number }>({
      query: (body) => ({
        url: '/goals',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Goals', 'Onboarding']
    }),

    getGoals: builder.query<GoalsSet | null, void>({
      query: () => '/goals',
      providesTags: ['Goals']
    })
  })
});

export const {
  useSetGoalsMutation,
  useGetGoalsQuery
} = goalsApi;