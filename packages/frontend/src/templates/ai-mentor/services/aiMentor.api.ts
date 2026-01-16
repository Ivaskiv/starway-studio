// packages/frontend/src/features/ai-mentor/services/aiMentor.api.ts
// aiMentor.api.ts — глибокий AI-аналіз, колесо балансу, 
// профіль ментора, гейміфікація, аналітика, рекомендації (більш "важкий" AI-контент)

import { api } from '@/services/api';

import { WheelScore } from '@/features/wheel';
import { ChatMessage } from '@/types/mentor.types';
import type {
  Affirmation,
  CourseRecommendation,
  DailySession,
  EveningSessionAnswers,
  GamificationState,
  Goal,
  GoalPlan,
  MentorUserProfile,
  MonthlyAudit,
  MorningSessionAnswers,
  PatternAnalysis,
  ScheduledNotification,
  SessionType,
  SmartAction,
  UserMetrics,
  WeeklyAnalysis,
  WheelAnalysis,
  WheelAssessment,
} from '../types/ai-mentor.types';

// ============ AI MENTOR DEEP API ============
export const aiMentorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ========== WHEEL OF BALANCE ==========
    getWheelAssessments: builder.query<WheelAssessment[], { user_id: string; limit?: number }>({
      query: ({ user_id, limit = 10 }) => `/ai-mentor/wheel/${user_id}?limit=${limit}`,
      providesTags: (result, error, { user_id }) => [
        { type: 'Wheel', id: 'LIST' },
        { type: 'Wheel', id: user_id },
      ],
    }),

    getLatestWheelAssessment: builder.query<WheelAssessment | null, string>({
      query: (user_id) => `/ai-mentor/wheel/${user_id}/latest`,
      providesTags: (result, error, user_id) => [
        { type: 'Wheel', id: user_id },
      ],
    }),

    createWheelAssessment: builder.mutation<WheelAssessment, { user_id: string; scores: WheelScore[] }>({
      query: ({ user_id, scores }) => ({
        url: `/ai-mentor/wheel/${user_id}`,
        method: 'POST',
        body: { scores },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Wheel', id: user_id },
        { type: 'Wheel', id: 'LIST' },
        'UserProgress',
      ],
    }),

    analyzeWheel: builder.mutation<WheelAnalysis, { user_id: string; assessmentId: string }>({
      query: ({ user_id, assessmentId }) => ({
        url: `/ai-mentor/wheel/${user_id}/${assessmentId}/analyze`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Wheel', id: user_id },
      ],
    }),

    // ========== MENTOR USER PROFILE ==========
    getMentorProfile: builder.query<MentorUserProfile, string>({
      query: (user_id) => `/ai-mentor/profile/${user_id}`,
      providesTags: (result, error, user_id) => [
        { type: 'Profile', id: user_id },
      ],
    }),

    initMentorProfile: builder.mutation<MentorUserProfile, {
      telegram_id: string
      name: string
      timezone: string
      birthDate?: string
      gender?: 'male' | 'female' | 'other'
    }>({
      query: (data) => ({
        url: '/ai-mentor/profile/init',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Profile', 'AIMentor'],
    }),

    updateMentorProfile: builder.mutation<MentorUserProfile, Partial<MentorUserProfile> & { user_id: string }>({
      query: ({ user_id, ...data }) => ({
        url: `/ai-mentor/profile/${user_id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Profile', id: user_id },
      ],
    }),

    // ========== DAILY DEEP SESSIONS ==========
    getDailySessions: builder.query<DailySession[], {
      user_id: string
      type?: SessionType
      startDate?: string
      endDate?: string
    }>({
      query: ({ user_id, type, startDate, endDate }) => {
        const params = new URLSearchParams()
        if (type) params.append('type', type)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        return `/ai-mentor/sessions/${user_id}?${params.toString()}`
      },
      providesTags: (result, error, { user_id }) => [
        { type: 'Sessions', id: user_id },
      ],
    }),

    getTodaySession: builder.query<DailySession | null, { user_id: string; type: SessionType }>({
      query: ({ user_id, type }) => `/ai-mentor/sessions/${user_id}/today?type=${type}`,
      providesTags: (result, error, { user_id }) => [
        { type: 'Sessions', id: user_id },
      ],
    }),

    submitMorningSession: builder.mutation<DailySession, {
      user_id: string
      answers: MorningSessionAnswers
    }>({
      query: ({ user_id, answers }) => ({
        url: `/ai-mentor/sessions/${user_id}/morning`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Sessions', id: user_id },
        'Gamification',
        'UserProgress',
      ],
    }),

    submitEveningSession: builder.mutation<DailySession, {
      user_id: string
      answers: EveningSessionAnswers
    }>({
      query: ({ user_id, answers }) => ({
        url: `/ai-mentor/sessions/${user_id}/evening`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Sessions', id: user_id },
        'Gamification',
        'UserProgress',
      ],
    }),

    // ========== AI-GENERATED DEEP CONTENT ==========
    generateSmartActions: builder.mutation<{ actions: SmartAction[]; affirmation: Affirmation }, {
      user_id: string
      context: {
        wheel_scores: WheelScore[]
        goals: Goal[]
        recentSessions: DailySession[]
        focus_area: string
      }
    }>({
      query: ({ user_id, context }) => ({
        url: `/ai-mentor/ai/generate-actions/${user_id}`,
        method: 'POST',
        body: context,
      }),
    }),

    generateAffirmation: builder.mutation<{ affirmation: Affirmation }, {
      user_id: string
      mood: string
      focus_area: string
      context?: string
    }>({
      query: ({ user_id, mood, focus_area, context }) => ({
        url: `/ai-mentor/ai/affirmation/${user_id}`,
        method: 'POST',
        body: { mood, focus_area, context },
      }),
    }),

    analyzePatterns: builder.mutation<PatternAnalysis, {
      user_id: string
      sessions: DailySession[]
      period?: 'week' | 'month' | 'year'
    }>({
      query: ({ user_id, sessions, period = 'week' }) => ({
        url: `/ai-mentor/ai/analyze-patterns/${user_id}?period=${period}`,
        method: 'POST',
        body: { sessions },
      }),
    }),

    // ========== GOALS (deep AI support) ==========
    getGoals: builder.query<Goal[], { user_id: string; status?: string; category?: string }>({
      query: ({ user_id, status, category }) => {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        if (category) params.append('category', category)
        return `/ai-mentor/goals/${user_id}?${params.toString()}`
      },
      providesTags: (result, error, { user_id }) => [
        { type: 'Goals', id: user_id },
        { type: 'Goals', id: 'LIST' },
      ],
    }),

    createGoal: builder.mutation<Goal, Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'progress' | 'status'>>({
      query: (goal) => ({
        url: '/ai-mentor/goals',
        method: 'POST',
        body: goal,
      }),
      invalidatesTags: (result, error, goal) => [
        { type: 'Goals', id: 'LIST' },
      ],
    }),

    updateGoal: builder.mutation<Goal, { goalId: string; updates: Partial<Goal> }>({
      query: ({ goalId, updates }) => ({
        url: `/ai-mentor/goals/${goalId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { goalId }) => [
        { type: 'Goals', id: goalId },
      ],
    }),

    updateGoalProgress: builder.mutation<Goal, { goalId: string; progress: number }>({
      query: ({ goalId, progress }) => ({
        url: `/ai-mentor/goals/${goalId}/progress`,
        method: 'PATCH',
        body: { progress },
      }),
      invalidatesTags: (result, error, { goalId }) => [
        { type: 'Goals', id: goalId },
      ],
    }),

    generateGoalPlan: builder.mutation<GoalPlan, { goalId: string }>({
      query: ({ goalId }) => ({
        url: `/ai-mentor/goals/${goalId}/generate-plan`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { goalId }) => [
        { type: 'Goals', id: goalId },
      ],
    }),

    // ========== WEEKLY DEEP ANALYSIS ==========
    getWeeklyAnalyses: builder.query<WeeklyAnalysis[], { user_id: string; limit?: number }>({
      query: ({ user_id, limit = 4 }) => `/ai-mentor/weekly/${user_id}?limit=${limit}`,
      providesTags: (result, error, { user_id }) => [
        { type: 'Weekly', id: user_id },
      ],
    }),

    generateWeeklyAnalysis: builder.mutation<WeeklyAnalysis, { user_id: string; weekStart: string }>({
      query: ({ user_id, weekStart }) => ({
        url: `/ai-mentor/weekly/${user_id}/generate`,
        method: 'POST',
        body: { weekStart },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Weekly', id: user_id },
        'UserProgress',
      ],
    }),

    // ========== MONTHLY AUDIT ==========
    getMonthlyAudits: builder.query<MonthlyAudit[], { user_id: string; limit?: number }>({
      query: ({ user_id, limit = 3 }) => `/ai-mentor/monthly/${user_id}?limit=${limit}`,
      providesTags: (result, error, { user_id }) => [
        { type: 'Monthly', id: user_id },
      ],
    }),

    generateMonthlyAudit: builder.mutation<MonthlyAudit, { user_id: string; month: string }>({
      query: ({ user_id, month }) => ({
        url: `/ai-mentor/monthly/${user_id}/generate`,
        method: 'POST',
        body: { month },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Monthly', id: user_id },
        'Wheel',
        'UserProgress',
      ],
    }),

    // ========== GAMIFICATION & ACHIEVEMENTS ==========
    getGamificationState: builder.query<GamificationState, string>({
      query: (user_id) => `/ai-mentor/gamification/${user_id}`,
      providesTags: (result, error, user_id) => [
        { type: 'Gamification', id: user_id },
      ],
    }),

    checkAchievements: builder.mutation<{ newBadges: string[]; xpEarned: number }, string>({
      query: (user_id) => ({
        url: `/ai-mentor/gamification/${user_id}/check`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, user_id) => [
        { type: 'Gamification', id: user_id },
        'UserProgress',
      ],
    }),

    // ========== USER ANALYTICS & METRICS ==========
    getUserMetrics: builder.query<UserMetrics, string>({
      query: (user_id) => `/ai-mentor/metrics/${user_id}`,
      providesTags: (result, error, user_id) => [
        { type: 'Metrics', id: user_id },
      ],
    }),

    getTopTriggers: builder.query<string[], string>({
      query: (user_id) => `/ai-mentor/metrics/${user_id}/triggers`,
      providesTags: (result, error, user_id) => [
        { type: 'Metrics', id: user_id },
      ],
    }),

    // ========== COURSE RECOMMENDATIONS ==========
    getCourseRecommendations: builder.query<CourseRecommendation[], string>({
      query: (user_id) => `/ai-mentor/courses/${user_id}/recommendations`,
      providesTags: (result, error, user_id) => [
        { type: 'Courses', id: user_id },
      ],
    }),

    // ========== SCHEDULED NOTIFICATIONS ==========
    getScheduledNotifications: builder.query<ScheduledNotification[], string>({
      query: (user_id) => `/ai-mentor/notifications/${user_id}`,
      providesTags: (result, error, user_id) => [
        { type: 'Notifications', id: user_id },
      ],
    }),

    scheduleNotification: builder.mutation<ScheduledNotification, Omit<ScheduledNotification, 'id' | 'sentAt'>>({
      query: (notification) => ({
        url: '/ai-mentor/notifications/schedule',
        method: 'POST',
        body: notification,
      }),
      invalidatesTags: (result, error, notification) => [
        { type: 'Notifications', id: notification.user_id },
      ],
    }),

    // ========== SUBSCRIPTION & ACCESS ==========
    checkSubscription: builder.query<{
      is_active: boolean
      daysRemaining: number
      endDate: string
      plan?: string
    }, string>({
      query: (user_id) => `/ai-mentor/subscription/${user_id}`,
      providesTags: (result, error, user_id) => [
        { type: 'Subscription', id: user_id },
      ],
    }),

    // ========== ADVANCED CHAT (deep context) ==========
    getChatHistory: builder.query<{ messages: ChatMessage[] }, { user_id: string; limit?: number }>({
      query: ({ user_id, limit = 50 }) => `/ai-mentor/chat/${user_id}?limit=${limit}`,
      providesTags: ['Chat'],
    }),

    sendChatMessage: builder.mutation<ChatMessage, { user_id: string; content: string; context?: string }>({
      query: ({ user_id, content, context }) => ({
        url: `/ai-mentor/chat/${user_id}`,
        method: 'POST',
        body: { content, context },
      }),
      invalidatesTags: (result, error, { user_id }) => [
        { type: 'Chat', id: user_id },
      ],
    }),
  }),
})

// ============ ЕКСПОРТ ВСІХ ХУКІВ ============
export const {
  // Wheel
  useGetWheelAssessmentsQuery,
  useGetLatestWheelAssessmentQuery,
  useCreateWheelAssessmentMutation,
  useAnalyzeWheelMutation,

  // Profile
  useGetMentorProfileQuery,
  useInitMentorProfileMutation,
  useUpdateMentorProfileMutation,

  // Sessions
  useGetDailySessionsQuery,
  useGetTodaySessionQuery,
  useSubmitMorningSessionMutation,
  useSubmitEveningSessionMutation,

  // AI Generated
  useGenerateSmartActionsMutation,
  useGenerateAffirmationMutation,
  useAnalyzePatternsMutation,

  // Goals
  useGetGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useUpdateGoalProgressMutation,
  useGenerateGoalPlanMutation,

  // Weekly
  useGetWeeklyAnalysesQuery,
  useGenerateWeeklyAnalysisMutation,

  // Monthly
  useGetMonthlyAuditsQuery,
  useGenerateMonthlyAuditMutation,

  // Gamification
  useGetGamificationStateQuery,
  useCheckAchievementsMutation,

  // Metrics
  useGetUserMetricsQuery,
  useGetTopTriggersQuery,

  // Courses
  useGetCourseRecommendationsQuery,

  // Notifications
  useGetScheduledNotificationsQuery,
  useScheduleNotificationMutation,

  // Subscription
  useCheckSubscriptionQuery,

  // Advanced Chat
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
} = aiMentorApi