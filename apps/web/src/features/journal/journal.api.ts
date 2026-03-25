import { api } from '@/services/api'
import type { JournalEvent } from './types'

export type JournalQueryParams =
  | { month: number; year: number; startDate?: never; endDate?: never }
  | { startDate: string; endDate: string; month?: never; year?: never }

export const journalApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJournalEvents: builder.query<JournalEvent[], JournalQueryParams>({
      query: (params) => ({
        url: '/journal',
        params,
      }),
      transformResponse: (response: { success: boolean; events: JournalEvent[] }) => response.events,
      providesTags: ['Journal'],
    }),
    getJournalRange: builder.query<JournalEvent[], { start: string; end: string }>({
      query: ({ start, end }) => ({
        url: '/journal/range',
        params: { startDate: start, endDate: end },
      }),
      transformResponse: (response: { success: boolean; events: JournalEvent[] }) => response.events,
      providesTags: ['Journal'],
    }),
  }),
})

export const { useGetJournalEventsQuery, useGetJournalRangeQuery } = journalApi
