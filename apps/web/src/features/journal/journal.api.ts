import { api } from '@/services/api'
import type { JournalResponse } from './types'

export type JournalQueryParams =
  | { month: number; year: number; startDate?: never; endDate?: never }
  | { startDate: string; endDate: string; month?: never; year?: never }

export const journalApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJournalEvents: builder.query<JournalResponse, JournalQueryParams>({
      query: (params) => ({
        url: '/journal',
        params,
      }),
      transformResponse: (response: { success: boolean } & JournalResponse) => ({
        events: response.events,
        days: response.days,
      }),
      providesTags: ['Journal'],
    }),
    getJournalRange: builder.query<JournalResponse, { start: string; end: string }>({
      query: ({ start, end }) => ({
        url: '/journal/range',
        params: { startDate: start, endDate: end },
      }),
      transformResponse: (response: { success: boolean } & JournalResponse) => ({
        events: response.events,
        days: response.days,
      }),
      providesTags: ['Journal'],
    }),
  }),
})

export const { useGetJournalEventsQuery, useGetJournalRangeQuery } = journalApi
