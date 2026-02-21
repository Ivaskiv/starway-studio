// frontend/src/features/microTask/api/api.ts
import api from '@/services/api'
import { MicroTask } from '../types/types'

export const microTaskApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getActiveMicroTasks: builder.query<MicroTask[], void>({
      query: () => '/microTasks',
    }),
    answerMicroTask: builder.mutation<void, { microTaskId: string; answer?: string }>({
      query: ({ microTaskId, answer }) => ({
        url: `/microTasks/${microTaskId}/answer`,
        method: 'POST',
        body: { answer },
      }),
      invalidatesTags: ['MicroTasks'],
    }),
  }),
  overrideExisting: true,
})

export const { useGetActiveMicroTasksQuery, useAnswerMicroTaskMutation } = microTaskApi
