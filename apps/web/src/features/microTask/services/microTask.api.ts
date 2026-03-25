import type { MicroTask } from '../types/types'
import { api } from '@/services/api'

export const microTaskApi = api.injectEndpoints({
  endpoints: builder => ({
    getMicroTasks: builder.query<MicroTask[], void>({
      query: () => '/mentor/micro-tasks',
      providesTags: ['MicroTasks'],
    }),
    completeMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: ['MicroTasks', 'Journal', 'GamificationProfile', 'Streak', 'Progress'],
    }),
    skipMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/skip`, method: 'PATCH' }),
      invalidatesTags: ['MicroTasks', 'Journal'],
    }),
    updateMicroTaskStep: builder.mutation<void, { id: string; stepIndex: number; done: boolean }>({
      query: ({ id, stepIndex, done }) => ({
        url: `/mentor/micro-tasks/${id}/step`,
        method: 'PATCH',
        body: { stepIndex, done },
      }),
      invalidatesTags: ['MicroTasks'],
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetMicroTasksQuery,
  useCompleteMicroTaskMutation,
  useSkipMicroTaskMutation,
  useUpdateMicroTaskStepMutation,
} = microTaskApi
