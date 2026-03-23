import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import type { MicroTask } from '../types/types'

export const microTaskApi = createApi({
  reducerPath: 'microTaskApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: headers => {
      const token = localStorage.getItem('starway_access_token')
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['MicroTask'],
  endpoints: builder => ({
    getMicroTasks: builder.query<MicroTask[], void>({
      query: () => '/mentor/micro-tasks',
      providesTags: ['MicroTask'],
    }),
    completeMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: ['MicroTask'],
    }),
    skipMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/skip`, method: 'PATCH' }),
      invalidatesTags: ['MicroTask'],
    }),
  }),
})

export const {
  useGetMicroTasksQuery,
  useCompleteMicroTaskMutation,
  useSkipMicroTaskMutation,
} = microTaskApi
