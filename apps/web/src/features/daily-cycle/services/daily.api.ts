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
    regenerateMicroTasks?: boolean
    finalize?: boolean
  }

export type SaveMorningAnswerInput = {
  date: string
  answers: Record<string, string>
}

export type SaveSessionAnswerInput = {
  entryId: string
  session: 'morning' | 'evening'
  questionId: string
  answer: string
  date: string
  lastQuestionIndex: number
}

export type SkipPreviousDayInput = {
  date: string
}

export const dailyCycleApi = api.injectEndpoints({
  endpoints: builder => ({
    saveMorningAnswer: builder.mutation<DailyCycleEntry, SaveMorningAnswerInput>({
      query: payload => ({
        url: '/daily/morning/answer',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DailyCycle' as const, id: 'ENTRY' },
      ],
    }),

    saveSessionAnswer: builder.mutation<DailyCycleEntry, SaveSessionAnswerInput>({
      query: ({ entryId, ...payload }) => ({
        url: `/daily/session/${entryId}/answer`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DailyCycle' as const, id: 'ENTRY' },
      ],
    }),

    skipPreviousDay: builder.mutation<DailyCycleEntry, SkipPreviousDayInput>({
      query: payload => ({
        url: '/daily/skip',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DailyCycle' as const, id: 'ENTRY' },
        { type: 'DailyCycle' as const, id: 'HISTORY' },
        'Journal',
        'Streak',
        'Progress',
      ],
    }),

    submitDailyCycle: builder.mutation<DailyCycleEntry, SubmitDailyCycleInput>({
      query: payload => ({
        url: '/daily/entry',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DailyCycle' as const, id: 'ENTRY' },
        { type: 'DailyCycle' as const, id: 'HISTORY' },
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

    getDailyEntryByDate: builder.query<DailyCycleEntry | null, string>({
      query: date => ({
        url: '/daily/today',
        params: { date },
      }),
      providesTags: (_result, _error, date) => [{ type: 'DailyCycle' as const, id: `ENTRY:${date}` }],
    }),

    getDailyHistory: builder.query<DailyCycleEntry[], void>({
      query: () => '/daily/history',
      providesTags: [{ type: 'DailyCycle' as const, id: 'HISTORY' }],
    }),
  }),
})

export const {
  useSaveMorningAnswerMutation,
  useSaveSessionAnswerMutation,
  useSkipPreviousDayMutation,
  useSubmitDailyCycleMutation,
  useGetTodayEntryQuery,
  useGetDailyEntryByDateQuery,
  useGetDailyHistoryQuery,
} = dailyCycleApi
