import type { MicroTask } from '../types/types'
import { api } from '@/services/api'

export const microTaskApi = api.injectEndpoints({
  endpoints: builder => ({
    getMicroTasks: builder.query<MicroTask[], void>({
      query: () => '/mentor/micro-tasks',
      providesTags: ['MicroTasks'],
    }),
    createManualMicroTask: builder.mutation<
      MicroTask,
      {
        title: string
        description?: string
        why?: string
        steps?: string[]
        dueDate?: string
        replaceExisting?: boolean
        date?: string
      }
    >({
      query: body => ({
        url: '/mentor/micro-tasks/manual',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MicroTasks', 'Journal'],
    }),
    replaceManualMicroTasks: builder.mutation<
      MicroTask[],
      { date: string; tasks: string[] }
    >({
      query: body => ({
        url: '/mentor/micro-tasks/replace',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MicroTasks', 'Journal', 'Progress'],
    }),
    completeMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: ['MicroTasks', 'Journal', 'GamificationProfile', 'Streak', 'Progress'],
    }),
    skipMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}/skip`, method: 'PATCH' }),
      invalidatesTags: ['MicroTasks', 'Journal', 'Progress'],
    }),
    deleteMicroTask: builder.mutation<void, string>({
      query: id => ({ url: `/mentor/micro-tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MicroTasks', 'Journal', 'Progress'],
    }),
    updateMicroTaskProgress: builder.mutation<void, { id: string; progressPercent: number }>({
      query: ({ id, progressPercent }) => ({
        url: `/mentor/micro-tasks/${id}/progress`,
        method: 'PATCH',
        body: { progressPercent },
      }),
      invalidatesTags: ['MicroTasks', 'Journal', 'Progress'],
    }),
    updateMicroTaskStep: builder.mutation<void, { id: string; stepIndex: number; done: boolean }>({
      query: ({ id, stepIndex, done }) => ({
        url: `/mentor/micro-tasks/${id}/step`,
        method: 'PATCH',
        body: { stepIndex, done },
      }),
      invalidatesTags: ['MicroTasks', 'Journal', 'GamificationProfile', 'Streak', 'Progress'],
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetMicroTasksQuery,
  useCreateManualMicroTaskMutation,
  useReplaceManualMicroTasksMutation,
  useCompleteMicroTaskMutation,
  useDeleteMicroTaskMutation,
  useSkipMicroTaskMutation,
  useUpdateMicroTaskProgressMutation,
  useUpdateMicroTaskStepMutation,
} = microTaskApi
