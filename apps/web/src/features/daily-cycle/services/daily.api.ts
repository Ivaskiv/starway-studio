// frontend/src/features/daily-cycle/services/daily.api.ts

import { api } from '@/services/api'
import type { DailyCycleEntry, DailyCycleInput } from '../types/daily.types'

export type SubmitDailyCycleInput =
  | (DailyCycleInput & {
    id?: string
    date?: string
  })
  | {
    session: 'morning' | 'evening'
    answers: Record<string, string>
    date: string
  }

export const dailyCycleApi = api.injectEndpoints({
  endpoints: builder => ({
    submitDailyCycle: builder.mutation<DailyCycleEntry, SubmitDailyCycleInput>({
      query: payload => ({
        url: '/daily/entry',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DailyCycle' as const, id: 'ENTRY' },
        'Journal',
        'GamificationProfile',
        'Streak',
        'Progress',
        'MicroTasks',
      ],
    }),

    getTodayEntry: builder.query<DailyCycleEntry, void>({
      query: () => '/daily/today',
      providesTags: [{ type: 'DailyCycle' as const, id: 'ENTRY' }],
    }),

    getDailyHistory: builder.query<DailyCycleEntry[], void>({
      query: () => '/daily/history',
      providesTags: [{ type: 'DailyCycle' as const, id: 'HISTORY' }],
    }),
  }),
})

export const {
  useSubmitDailyCycleMutation,
  useGetTodayEntryQuery,
  useGetDailyHistoryQuery,
} = dailyCycleApi
