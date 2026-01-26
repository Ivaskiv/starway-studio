// frontend/src/services/mentor.api.ts
// mentor.api.ts — щоденні завдання, сесії, чат, цілі року (основний щоденний ментор)

// frontend/src/services/mentor.api.ts

import type {
  ChatHistory,
  ChatMessage,
  DailySession,
  DailyTask,
  MentorStats,
  Recommendation,
  SmartAction,
  TodaySessions,
  TodayTasks,
  YearlyGoal,
} from '../shared/types/mentor.types';
import api from './api';

// ============ MENTOR DAILY API ============
export const mentorApi = api.injectEndpoints({
  endpoints: builder => ({
    // Stats
    getMentorStats: builder.query<MentorStats, void>({
      query: () => '/mentor/stats',
      providesTags: ['Progress'],
    }),

    // Sessions
    getTodaySessions: builder.query<TodaySessions, void>({
      query: () => '/mentor/session/today',
      providesTags: ['Session'],
    }),

    startSession: builder.mutation<DailySession, { type: 'morning' | 'evening' }>({
      query: body => ({
        url: '/mentor/session/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),

    saveSessionAnswer: builder.mutation<
      { success: boolean },
      { sessionId: string; questionKey: string; answer: string }
    >({
      query: body => ({
        url: '/mentor/session/answer',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),

    completeSession: builder.mutation<
      { xpEarned: number; aiFeedback: string },
      { sessionId: string }
    >({
      query: body => ({
        url: '/mentor/session/complete',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session', 'Progress'],
    }),

    // Tasks
    getTodayTasks: builder.query<TodayTasks, void>({
      query: () => '/mentor/tasks/today',
      providesTags: ['Task'],
    }),

    createTask: builder.mutation<
      DailyTask,
      { title: string; description?: string; scheduledTime?: string; durationMin?: number }
    >({
      query: body => ({
        url: '/mentor/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Task'],
    }),

    completeTask: builder.mutation<{ xpEarned: number }, string>({
      query: taskId => ({
        url: `/mentor/tasks/${taskId}/complete`,
        method: 'PUT',
      }),
      invalidatesTags: ['Task', 'Progress'],
    }),

    deleteTask: builder.mutation<{ success: boolean }, string>({
      query: taskId => ({
        url: `/mentor/tasks/${taskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task'],
    }),

    // Goals (yearly)
    getYearlyGoals: builder.query<YearlyGoal[], void>({
      query: () => '/mentor/goals/yearly',
      providesTags: ['Goals'],
    }),
    getRecommendations: builder.query<Recommendation[], void>({
      query: () => '/mentor/recommendations',
    }),

    updateYearlyGoals: builder.mutation<{ success: boolean }, YearlyGoal[]>({
      query: goals => ({
        url: '/mentor/goals/yearly',
        method: 'PUT',
        body: { goals },
      }),
      invalidatesTags: ['Goals'],
    }),

    // Chat
    getChatHistory: builder.query<ChatHistory, number | void>({
      query: (limit = 20) => `/mentor/chat/history?limit=${limit}`,
      providesTags: ['Chat'],
    }),

    sendChatMessage: builder.mutation<
      { message: ChatMessage; aiResponse: ChatMessage },
      { content: string }
    >({
      query: body => ({
        url: '/mentor/chat/message',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chat'],
    }),
    // compareWheels: builder.query<
    //   { original: string; smart: SmartAction }[],
    //   { actions: string[] }
    // >({
    //   query: (body) => ({
    //     url: '/mentor/smart-convert',
    //     method: 'POST',
    //     body,
    //   }),
    // },),
    // SMART Converter
    convertToSmart: builder.mutation<
      Array<{ original: string; smart: SmartAction }>,
      { actions: string[] }
    >({
      query: body => ({
        url: '/mentor/smart-convert',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetMentorStatsQuery,
  useGetTodaySessionsQuery,
  useStartSessionMutation,
  useSaveSessionAnswerMutation,
  useCompleteSessionMutation,
  useGetTodayTasksQuery,
  useCreateTaskMutation,
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useGetYearlyGoalsQuery,
  useUpdateYearlyGoalsMutation,
  useGetRecommendationsQuery,
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
  useConvertToSmartMutation,
  // useCompareWheelsMutation,
} = mentorApi;
