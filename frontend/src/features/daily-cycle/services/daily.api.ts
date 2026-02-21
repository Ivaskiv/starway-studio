// daily.api.ts
/**
 * Daily Cycle API
 */

import { DailyCycleEntry, DailyCycleInput } from '@/features/daily-cycle/types/daily.types';
import { api } from '@/services/api';

export const dailyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Submit daily entry
    submitDailyCycle: builder.mutation<DailyCycleEntry, DailyCycleInput>({
      query: (body) => ({
        url: '/mentor/daily-cycle',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Daily', 'Streak']
    }),

    // Get today's entry
    getTodayEntry: builder.query<DailyCycleEntry | null, void>({
      query: () => '/mentor/daily-entry/today',
      providesTags: ['Daily']
    }),

    // Get latest entry
    getLatestEntry: builder.query<DailyCycleEntry | null, void>({
      query: () => '/mentor/daily-entry/latest',
      providesTags: ['Daily']
    })
  })
});

export const {
  useSubmitDailyCycleMutation,
  useGetTodayEntryQuery,
  useGetLatestEntryQuery
} = dailyApi;