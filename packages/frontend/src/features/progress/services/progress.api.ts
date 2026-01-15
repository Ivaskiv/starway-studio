// packages/frontend/src/features/progress/services/progress.api.ts

import { api } from '../../../services/api'

export const progressApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProgressOverview: builder.query<any, void>({
      query: () => '/progress/overview',
      providesTags: ['UserProgress'],
    }),

    getAdminProgressOverview: builder.query<any, void>({
      query: () => '/progress/admin/overview',
      providesTags: ['AdminProgress'],
    }),

    getProgressQuery: builder.query<any, void>({
      query: () => '/progress/query',
      providesTags: ['UserProgress'],
    }),

    getProgress: builder.query<any, void>({
      query: () => '/progress',
      providesTags: ['UserProgress'],
    }),

    getProgressByDate: builder.query<any, void>({
      query: () => '/progress/date',
      providesTags: ['UserProgress'],
    }),

    getWeeklyActivity: builder.query<any, void>({
      query: () => '/progress/weekly',
      providesTags: ['UserProgress'],
    })
  }),
})

export const {
  useGetProgressOverviewQuery,
  useGetAdminProgressOverviewQuery,
  useGetProgressQuery,
  useGetWeeklyActivityQuery
} = progressApi