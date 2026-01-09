// packages/frontend/src/features/ai-mentor/aiMentorApi.ts

import { api } from '../../../services/api';
import type {
  ChatMessage,
  CourseRecommendation,
  DailySession,
  EveningSessionAnswers,
  GamificationState,
  Goal,
  MentorUserProfile,
  MonthlyAudit,
  MorningSessionAnswers,
  ScheduledNotification,
  SessionType,
  UserMetrics,
  WeeklyAnalysis,
  WheelAssessment,
  WheelScore,
} from '../types/ai-mentor.types';

// ============ AI MENTOR API ============
export const aiMentorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ========== WHEEL OF BALANCE ==========
    getWheelAssessments: builder.query<WheelAssessment[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 10 }) => `/ai-mentor/wheel/${userId}?limit=${limit}`,
      providesTags: ['AIMentor', 'Wheel'],
    }),

    createWheelAssessment: builder.mutation<WheelAssessment, { userId: string; scores: WheelScore[] }>({
      query: ({ userId, scores }) => ({
        url: `/ai-mentor/wheel/${userId}`,
        method: 'POST',
        body: { scores },
      }),
      invalidatesTags: ['AIMentor', 'Wheel'],
    }),

    // ========== USER PROFILE ==========
    getMentorProfile: builder.query<MentorUserProfile, string>({
      query: (userId) => `/ai-mentor/profile/${userId}`,
      providesTags: ['AIMentor', 'Profile'],
    }),

    initMentorProfile: builder.mutation<MentorUserProfile, {
      telegramId: string;
      name: string;
      timezone: string;
    }>({
      query: (data) => ({
        url: '/ai-mentor/profile/init',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AIMentor', 'Profile'],
    }),

    updateMentorProfile: builder.mutation<MentorUserProfile, Partial<MentorUserProfile> & { userId: string }>({
      query: ({ userId, ...data }) => ({
        url: `/ai-mentor/profile/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AIMentor', 'Profile'],
    }),

    // ========== DAILY SESSIONS ==========
    getDailySessions: builder.query<DailySession[], {
      userId: string;
      type?: SessionType;
      startDate?: string;
      endDate?: string;
    }>({
      query: ({ userId, type, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return `/ai-mentor/sessions/${userId}?${params.toString()}`;
      },
      providesTags: ['AIMentor', 'Sessions'],
    }),

    getTodaySession: builder.query<DailySession | null, { userId: string; type: SessionType }>({
      query: ({ userId, type }) => `/ai-mentor/sessions/${userId}/today?type=${type}`,
      providesTags: ['AIMentor', 'Sessions'],
    }),

    submitMorningSession: builder.mutation<DailySession, {
      userId: string;
      answers: MorningSessionAnswers;
    }>({
      query: ({ userId, answers }) => ({
        url: `/ai-mentor/sessions/${userId}/morning`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: ['AIMentor', 'Sessions', 'Gamification'],
    }),

    submitEveningSession: builder.mutation<DailySession, {
      userId: string;
      answers: EveningSessionAnswers;
    }>({
      query: ({ userId, answers }) => ({
        url: `/ai-mentor/sessions/${userId}/evening`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: ['AIMentor', 'Sessions', 'Gamification'],
    }),

    // ========== AI-GENERATED CONTENT ==========
    generateSmartActions: builder.mutation<{ actions: string[]; affirmation: string }, {
      userId: string;
      context: {
        wheelScores: WheelScore[];
        goals: Goal[];
        recentSessions: DailySession[];
        focusArea: string;
      };
    }>({
      query: ({ userId, context }) => ({
        url: `/ai-mentor/ai/generate-actions/${userId}`,
        method: 'POST',
        body: context,
      }),
    }),

    generateAffirmation: builder.mutation<{ affirmation: string }, {
      userId: string;
      mood: string;
      focusArea: string;
    }>({
      query: ({ userId, mood, focusArea }) => ({
        url: `/ai-mentor/ai/affirmation/${userId}`,
        method: 'POST',
        body: { mood, focusArea },
      }),
    }),

    analyzePatterns: builder.mutation<{ triggers: string[]; recommendations: string[] }, {
      userId: string;
      sessions: DailySession[];
    }>({
      query: ({ userId, sessions }) => ({
        url: `/ai-mentor/ai/analyze-patterns/${userId}`,
        method: 'POST',
        body: { sessions },
      }),
    }),

    // ========== GOALS ==========
    getGoals: builder.query<Goal[], { userId: string; status?: string }>({
      query: ({ userId, status }) => {
        const params = status ? `?status=${status}` : '';
        return `/ai-mentor/goals/${userId}${params}`;
      },
      providesTags: ['AIMentor', 'Goals'],
    }),

    createGoal: builder.mutation<Goal, Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'status'>>({
      query: (goal) => ({
        url: '/ai-mentor/goals',
        method: 'POST',
        body: goal,
      }),
      invalidatesTags: ['AIMentor', 'Goals'],
    }),

    updateGoal: builder.mutation<Goal, { goalId: string; updates: Partial<Goal> }>({
      query: ({ goalId, updates }) => ({
        url: `/ai-mentor/goals/${goalId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['AIMentor', 'Goals'],
    }),

    updateGoalProgress: builder.mutation<Goal, { goalId: string; progress: number }>({
      query: ({ goalId, progress }) => ({
        url: `/ai-mentor/goals/${goalId}/progress`,
        method: 'PATCH',
        body: { progress },
      }),
      invalidatesTags: ['AIMentor', 'Goals'],
    }),

    generateGoalPlan: builder.mutation<{
      milestones: { title: string; deadline: string }[];
      microActions: { title: string; category: string }[];
    }, { goalId: string }>({
      query: ({ goalId }) => ({
        url: `/ai-mentor/goals/${goalId}/generate-plan`,
        method: 'POST',
      }),
    }),

    // ========== WEEKLY ANALYSIS ==========
    getWeeklyAnalyses: builder.query<WeeklyAnalysis[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 4 }) => `/ai-mentor/weekly/${userId}?limit=${limit}`,
      providesTags: ['AIMentor', 'Weekly'],
    }),

    generateWeeklyAnalysis: builder.mutation<WeeklyAnalysis, { userId: string; weekStart: string }>({
      query: ({ userId, weekStart }) => ({
        url: `/ai-mentor/weekly/${userId}/generate`,
        method: 'POST',
        body: { weekStart },
      }),
      invalidatesTags: ['AIMentor', 'Weekly'],
    }),

    // ========== MONTHLY AUDIT ==========
    getMonthlyAudits: builder.query<MonthlyAudit[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 3 }) => `/ai-mentor/monthly/${userId}?limit=${limit}`,
      providesTags: ['AIMentor', 'Monthly'],
    }),

    generateMonthlyAudit: builder.mutation<MonthlyAudit, { userId: string; month: string }>({
      query: ({ userId, month }) => ({
        url: `/ai-mentor/monthly/${userId}/generate`,
        method: 'POST',
        body: { month },
      }),
      invalidatesTags: ['AIMentor', 'Monthly', 'Wheel'],
    }),

    // ========== GAMIFICATION ==========
    getGamificationState: builder.query<GamificationState, string>({
      query: (userId) => `/ai-mentor/gamification/${userId}`,
      providesTags: ['AIMentor', 'Gamification'],
    }),

    checkAchievements: builder.mutation<{ newBadges: string[] }, string>({
      query: (userId) => ({
        url: `/ai-mentor/gamification/${userId}/check`,
        method: 'POST',
      }),
      invalidatesTags: ['AIMentor', 'Gamification'],
    }),

    // ========== ANALYTICS & METRICS ==========
    getUserMetrics: builder.query<UserMetrics, string>({
      query: (userId) => `/ai-mentor/metrics/${userId}`,
      providesTags: ['AIMentor', 'Metrics'],
    }),

    getTopTriggers: builder.query<string[], string>({
      query: (userId) => `/ai-mentor/metrics/${userId}/triggers`,
      providesTags: ['AIMentor', 'Metrics'],
    }),

    // ========== COURSE RECOMMENDATIONS ==========
    getCourseRecommendations: builder.query<CourseRecommendation[], string>({
      query: (userId) => `/ai-mentor/courses/${userId}/recommendations`,
      providesTags: ['AIMentor', 'Courses'],
    }),

    // ========== NOTIFICATIONS ==========
    getScheduledNotifications: builder.query<ScheduledNotification[], string>({
      query: (userId) => `/ai-mentor/notifications/${userId}`,
      providesTags: ['AIMentor', 'Notifications'],
    }),

    scheduleNotification: builder.mutation<ScheduledNotification, Omit<ScheduledNotification, 'id' | 'sentAt'>>({
      query: (notification) => ({
        url: '/ai-mentor/notifications/schedule',
        method: 'POST',
        body: notification,
      }),
      invalidatesTags: ['AIMentor', 'Notifications'],
    }),

    // ========== SUBSCRIPTION ==========
    checkSubscription: builder.query<{
      isActive: boolean;
      daysRemaining: number;
      endDate: string;
    }, string>({
      query: (userId) => `/ai-mentor/subscription/${userId}`,
      providesTags: ['AIMentor', 'Subscription'],
    }),

    // ========== CHAT (Telegram Mini-App) ==========
    getChatHistory: builder.query<ChatMessage[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 50 }) => `/ai-mentor/chat/${userId}?limit=${limit}`,
      providesTags: ['AIMentor', 'Chat'],
    }),

    sendChatMessage: builder.mutation<ChatMessage, { userId: string; content: string }>({
      query: ({ userId, content }) => ({
        url: `/ai-mentor/chat/${userId}`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: ['AIMentor', 'Chat'],
    }),
  }),
});

// ============ EXPORT HOOKS ==========
export const {
  // Wheel
  useGetWheelAssessmentsQuery,
  useCreateWheelAssessmentMutation,
  
  // Profile
  useGetMentorProfileQuery,
  useInitMentorProfileMutation,
  useUpdateMentorProfileMutation,
  
  // Sessions
  useGetDailySessionsQuery,
  useGetTodaySessionQuery,
  useSubmitMorningSessionMutation,
  useSubmitEveningSessionMutation,
  
  // AI
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
  
  // Chat
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
} = aiMentorApi;