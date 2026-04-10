import { api } from '@/services/api'

export interface MentorQuestionSet {
  id: string
  name: string
  isActive: boolean
  morning: unknown
  evening: unknown
  createdAt?: string
}

export const questionSetsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuestionSets: builder.query<MentorQuestionSet[], void>({
      query: () => '/admin/question-sets',
      providesTags: ['Questions'],
    }),
    createQuestionSet: builder.mutation<
      MentorQuestionSet,
      { name: string; morning?: unknown; evening?: unknown }
    >({
      query: (body) => ({
        url: '/admin/question-sets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Questions'],
    }),
    activateQuestionSet: builder.mutation<{ ok: boolean; id: string }, string>({
      query: (id) => ({
        url: `/admin/question-sets/${id}/activate`,
        method: 'PUT',
      }),
      invalidatesTags: ['Questions'],
    }),
    deleteQuestionSet: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/admin/question-sets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Questions'],
    }),
  }),
})

export const {
  useGetQuestionSetsQuery,
  useCreateQuestionSetMutation,
  useActivateQuestionSetMutation,
  useDeleteQuestionSetMutation,
} = questionSetsApi
