// features/mentor/services/mentor.api.ts
/**
 * AI-MENTOR API SERVICE
 * RTK Query API для всіх операцій AI-ментора
 */

import { api } from '@/services/api';
import type {
  MentorAccess,
  MentorChatContext,
  MentorContext,
  MentorReply,
  OnboardingProgress,
  SendMentorPayload,
  TrialProgress
} from '../types/mentor.types';

export interface WeeklyReportItem {
  id: string
  weekStart: string
  weekEnd: string
  overallScore: number | null
  completionRate: number | null
  streakDays: number | null
  nextWeekFocus: string | null
  pdfUrl: string | null
}

export interface WeeklyReportFull extends WeeklyReportItem {
  metrics?: {
    sessions?: number | null
    reflections?: number | null
    tasksDone?: number | null
    tasksTotal?: number | null
    wheels?: number | null
    streakDays?: number | null
  } | null
  topInsights?: string[] | null
  growthAreas?: string[] | null
  struggleAreas?: string[] | null
  wheelDelta?: Array<{ sphere: string; delta: number }> | null
  summaryText?: string | null
  motivationText?: string | null
  nextWeekTasks?: string[] | null
  analysis?: Record<string, unknown> | null
}

export interface MonthlyConversationHighlight {
  id: string
  title: string
  updatedAt: string
  preview: string
  messageCount: number
}

export interface MonthlyGoalItem {
  text: string
  isPrimary: boolean
}

export interface MonthlySubscriptionSummary {
  status: string
  planCode: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  autoRenew: boolean
}

export interface MonthlyZoomSummaryItem {
  topic: string
  scheduledAt: string
  status: string
  attended: boolean
  note: unknown
}

export interface MonthlyConversationSummary {
  totalConversations: number
  totalMessages: number
  userMessages: number
  assistantMessages: number
  topThemes: string[]
  recentHighlights: MonthlyConversationHighlight[]
  goals?: MonthlyGoalItem[]
  subscription?: MonthlySubscriptionSummary | null
  zoomSummary?: MonthlyZoomSummaryItem[]
}

interface MentorMessageRequest {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  context?: MentorChatContext;
}

// ============================================================================
// TAGS
// ============================================================================

const TAGS = {
  MENTOR_ACCESS: 'MentorAccess',
  ONBOARDING: 'Onboarding',
  TRIAL: 'Trial'
} as const;

type UiOnboardingStage = 'vision' | 'goal' | 'context';

function mapUiStageToBackendNextStage(stage: UiOnboardingStage): 'GOAL' | 'CHOICE' | 'COMPLETED' {
  if (stage === 'vision') return 'GOAL';
  if (stage === 'goal') return 'CHOICE';
  return 'COMPLETED';
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const mentorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ========================================================================
    // GET MENTOR ACCESS
    // ========================================================================
    getMentorAccess: builder.query<MentorAccess, void>({
      query: () => '/mentor/access',
      providesTags: [TAGS.MENTOR_ACCESS]
    }),

    // ========================================================================
    // ONBOARDING
    // ========================================================================
    getOnboardingProgress: builder.query<OnboardingProgress, void>({
      query: () => '/mentor/onboarding/progress',
      providesTags: [TAGS.ONBOARDING]
    }),

    startOnboarding: builder.mutation<OnboardingProgress, void>({
      query: () => ({
        url: '/mentor/onboarding/start',
        method: 'POST'
      }),
      invalidatesTags: [TAGS.ONBOARDING, TAGS.MENTOR_ACCESS]
    }),

    completeOnboardingStage: builder.mutation<
      OnboardingProgress,
      { stage: string; data?: any }
    >({
      query: ({ stage, data }) => ({
        // fix code_x: backend onboarding API is mounted under /api/onboarding.
        url: '/onboarding/update-progress',
        method: 'POST',
        body: {
          stage: String(stage || '').toUpperCase(),
          metadata: data ?? {},
        }
      }),
      invalidatesTags: [TAGS.ONBOARDING]
    }),

    submitOnboardingAnswer: builder.mutation<
      { success: true; nextStage: string },
      { stage: UiOnboardingStage; answer: string }
    >({
      query: ({ stage, answer }) => ({
        url: '/onboarding/update-progress',
        method: 'POST',
        body: {
          stage: mapUiStageToBackendNextStage(stage),
          metadata: { answer },
        },
      }),
      transformResponse: (_raw: unknown, _meta, arg) => ({
        success: true,
        nextStage: mapUiStageToBackendNextStage(arg.stage),
      }),
      invalidatesTags: [TAGS.ONBOARDING],
    }),

    // ========================================================================
    // TRIAL
    // ========================================================================
    getTrialProgress: builder.query<TrialProgress, void>({
      query: () => '/mentor/trial/progress',
      providesTags: [TAGS.TRIAL]
    }),

    startTrial: builder.mutation<TrialProgress, void>({
      query: () => ({
        url: '/mentor/trial/start',
        method: 'POST'
      }),
      invalidatesTags: [TAGS.TRIAL, TAGS.MENTOR_ACCESS]
    }),

    completeTrialDay: builder.mutation<TrialProgress, { day: number }>({
      query: ({ day }) => ({
        url: `/mentor/trial/complete/${day}`,
        method: 'POST'
      }),
      invalidatesTags: [TAGS.TRIAL]
    }),

    // getMentorContext: builder.query<MentorChatContext, void>({
    //   query: () => '/mentor/context',
    //         providesTags: ['MentorContext'],

    // }),

    // sendMentorMessage: builder.mutation<ChatResponseDTO, MentorMessageRequest>({
    //   query: (body) => ({
    //     url: '/mentor/chat',
    //     method: 'POST',
    //     body,
    //   }),
 getMentorContext: builder.query<MentorContext, string>({
      query: userId => `/mentor/context/${userId}`,
      providesTags: ['MentorContext'],
    }),

    sendMentorMessage: builder.mutation<MentorReply, SendMentorPayload>({
      query: body => ({ url: '/mentor/chat', method: 'POST', body }),
      // зберігаємо повідомлення — інвалідуємо контекст після
      invalidatesTags: ['MentorContext'],
    }),

    getMyWeeklyReport: builder.query<WeeklyReportFull | null, void>({
      query: () => '/mentor/my-report',
      transformResponse: (response: { report: WeeklyReportFull | null }) => response.report ?? null,
      providesTags: ['Progress'],
    }),

    getMyWeeklyReports: builder.query<WeeklyReportItem[], void>({
      query: () => '/mentor/my-reports',
      transformResponse: (response: { reports: WeeklyReportItem[] }) => response.reports ?? [],
      providesTags: ['Progress'],
    }),

    getWeeklyReportById: builder.query<WeeklyReportFull | null, string>({
      query: reportId => `/mentor/my-reports/${reportId}`,
      transformResponse: (response: { report: WeeklyReportFull | null }) => response.report ?? null,
      providesTags: ['Progress'],
    }),

    getMonthlyConversationSummary: builder.query<MonthlyConversationSummary | null, void>({
      query: () => '/mentor/monthly-context',
      transformResponse: (response: { summary: MonthlyConversationSummary | null }) => response.summary ?? null,
      providesTags: ['Progress'],
    }),

  }),
  
  overrideExisting: false,
  })

// ============================================================================
// EXPORT HOOKS
// ============================================================================

export const {
  // Access
  useGetMentorAccessQuery,

  // Onboarding
  useGetOnboardingProgressQuery,
  useStartOnboardingMutation,
  useCompleteOnboardingStageMutation,
  useSubmitOnboardingAnswerMutation,

  // Trial
  useGetTrialProgressQuery,
  useStartTrialMutation,
  useCompleteTrialDayMutation,
  useGetMentorContextQuery,
  useSendMentorMessageMutation,
  useGetMyWeeklyReportQuery,
  useGetMyWeeklyReportsQuery,
  useGetWeeklyReportByIdQuery,
  useLazyGetWeeklyReportByIdQuery,
  useGetMonthlyConversationSummaryQuery,
} = mentorApi;

export default mentorApi;

// import { api } from '@/services/api';
// import {
//   MentorStats,
//   MentorTask,
//   MentorSession,
//   YearlyGoals,
// } from '../types/mentor.types';

// export const mentorApi = api.injectEndpoints({
//   endpoints: builder => ({
//     // ===== TASKS =====
//     getTodayTasks: builder.query<MentorTask[], void>({
//       query: () => '/mentor/tasks/today',
//       providesTags: ['Progress'],
//     }),

//     createTask: builder.mutation<void, { title: string; date: string }>({
//       query: body => ({
//         url: '/mentor/task',
//         method: 'POST',
//         body,
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     completeTask: builder.mutation<void, { taskId: string }>({
//       query: ({ taskId }) => ({
//         url: `/mentor/task/${taskId}/complete`,
//         method: 'POST',
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     deleteTask: builder.mutation<void, { taskId: string }>({
//       query: ({ taskId }) => ({
//         url: `/mentor/task/${taskId}`,
//         method: 'DELETE',
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     // ===== SESSIONS =====
//     getTodaySessions: builder.query<MentorSession[], void>({
//       query: () => '/mentor/sessions/today',
//       providesTags: ['Progress'],
//     }),

//     startSession: builder.mutation<void, { taskId: string }>({
//       query: body => ({
//         url: '/mentor/session/start',
//         method: 'POST',
//         body,
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     saveSessionAnswer: builder.mutation<void, { sessionId: string; answer: string }>({
//       query: ({ sessionId, answer }) => ({
//         url: `/mentor/session/${sessionId}/answer`,
//         method: 'POST',
//         body: { answer },
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     completeSession: builder.mutation<void, { sessionId: string }>({
//       query: ({ sessionId }) => ({
//         url: `/mentor/session/${sessionId}/complete`,
//         method: 'POST',
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     // ===== ANALYTICS =====
//     getMentorStats: builder.query<MentorStats, void>({
//       query: () => '/mentor/stats',
//       providesTags: ['Progress'],
//     }),

//     getYearlyGoals: builder.query<YearlyGoals, void>({
//       query: () => '/mentor/goals/yearly',
//       providesTags: ['Progress'],
//     }),

//     updateYearlyGoals: builder.mutation<void, YearlyGoals>({
//       query: body => ({
//         url: '/mentor/goals/yearly',
//         method: 'PUT',
//         body,
//       }),
//       invalidatesTags: ['Progress'],
//     }),

//     // ===== CHAT =====
//     getChatHistory: builder.query<any[], { chatId: string }>({
//       query: ({ chatId }) => `/mentor/chat/${chatId}`,
//       providesTags: ['Chat'],
//     }),

//     sendChatMessage: builder.mutation<void, { chatId: string; message: string }>({
//       query: ({ chatId, message }) => ({
//         url: `/mentor/chat/${chatId}`,
//         method: 'POST',
//         body: { message },
//       }),
//       invalidatesTags: ['Chat'],
//     }),
//   }),
// });
