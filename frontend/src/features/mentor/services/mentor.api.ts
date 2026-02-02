// frontend/src/features/mentor/services/mentor.api.ts
import { api } from '@/services/api';

export const mentorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    completeSession: builder.mutation<void, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: `/mentor/session/${sessionId}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Progress'],
    }),
    completeTask: builder.mutation<void, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/mentor/task/${taskId}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Progress'],
    }),
    convertToSmart: builder.mutation<void, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/mentor/task/${taskId}/convert`,
        method: 'POST',
      }),
      invalidatesTags: ['Progress'],
    }),
    createTask: builder.mutation<void, { title: string; date: string }>({
      query: (body) => ({
        url: '/mentor/task',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Progress'],
    }),
    deleteTask: builder.mutation<void, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/mentor/task/${taskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Progress'],
    }),
    getChatHistory: builder.query<any[], { chatId: string }>({
      query: ({ chatId }) => `/mentor/chat/${chatId}`,
      providesTags: ['Chat'],
    }),
    getMentorStats: builder.query<any, void>({
      query: () => '/mentor/stats',
      providesTags: ['Progress'],
    }),
    getTodaySessions: builder.query<any[], void>({
      query: () => '/mentor/sessions/today',
      providesTags: ['Progress'],
    }),
    getTodayTasks: builder.query<any[], void>({
      query: () => '/mentor/tasks/today',
      providesTags: ['Progress'],
    }),
    getYearlyGoals: builder.query<any, void>({
      query: () => '/mentor/goals/yearly',
      providesTags: ['Progress'],
    }),
    saveSessionAnswer: builder.mutation<void, { sessionId: string; answer: string }>({
      query: ({ sessionId, answer }) => ({
        url: `/mentor/session/${sessionId}/answer`,
        method: 'POST',
        body: { answer },
      }),
      invalidatesTags: ['Progress'],
    }),
    sendChatMessage: builder.mutation<void, { chatId: string; message: string }>({
      query: ({ chatId, message }) => ({
        url: `/mentor/chat/${chatId}`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['Chat'],
    }),
    startSession: builder.mutation<void, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/mentor/session/start`,
        method: 'POST',
        body: { taskId },
      }),
      invalidatesTags: ['Progress'],
    }),
    updateYearlyGoals: builder.mutation<void, any>({
      query: (body) => ({
        url: '/mentor/goals/yearly',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Progress'],
    }),
  }),
});

export const {
  useCompleteSessionMutation,
  useCompleteTaskMutation,
  useConvertToSmartMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetChatHistoryQuery,
  useGetMentorStatsQuery,
  useGetTodaySessionsQuery,
  useGetTodayTasksQuery,
  useGetYearlyGoalsQuery,
  useSaveSessionAnswerMutation,
  useSendChatMessageMutation,
  useStartSessionMutation,
  useUpdateYearlyGoalsMutation,
} = mentorApi;
