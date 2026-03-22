// frontend/src/features/producer/services/weekly-analysis.api.ts
// Новий файл у вже існуючій папці features/producer/services/

import api from "@/services/api"


export interface WeeklyReportSummary {
  id:            string
  weekStart:     string
  weekEnd:       string
  overallScore:  number
  completionRate:number
  streakDays:    number
  nextWeekFocus: string
  pdfUrl:        string | null
}

export interface WeeklyReportFull extends WeeklyReportSummary {
  topInsights:    string[]
  growthAreas:    string[]
  struggleAreas:  string[]
  wheelDelta:     { sphere: string; delta: number }[]
  summaryText:    string
  motivationText: string
  nextWeekTasks:  string[]
}

export interface MentorProfile {
  id:               string
  userId:           string
  weekStart:        string
  createdAt:        string
  behaviorPattern:  string
  engagementRhythm: string
  mainPainThisWeek: string
  emotionalTone:    string
  retentionRisk:    number
  retentionFactors: string[]
  churnSignals:     string[]
  upsellReady:      boolean
  upsellProduct:    string
  upsellTiming:     string
  upsellReasoning:  string
  recommendedOffer: string
  nextMessageTone:  string
  triggerForContact:string
  systemNotes:      string
  offerShownAt:     string | null
  user: { id: string; email: string; name: string }
}

export const weeklyAnalysisApi = api.injectEndpoints({
  endpoints: build => ({

    // Користувач — свій останній звіт
    getMyWeeklyReport: build.query<{ report: WeeklyReportFull | null }, void>({
      query: () => '/mentor/weekly/my-report',
      providesTags: ['WeeklyReport'],
    }),

    // Користувач — список звітів
    getMyWeeklyReports: build.query<{ reports: WeeklyReportSummary[] }, void>({
      query: () => '/mentor/weekly/my-reports',
      providesTags: ['WeeklyReport'],
    }),

    // Адмін — всі профілі з фільтрами
    getAdminProfiles: build.query<
      { profiles: MentorProfile[]; total: number; page: number },
      { risk?: 'low' | 'medium' | 'high'; upsell?: boolean; page?: number }
    >({
      query: ({ risk, upsell, page = 1 } = {}) => ({
        url: '/mentor/weekly/admin/profiles',
        params: { risk, upsell, page },
      }),
      providesTags: ['MentorProfile'],
    }),

    // Адмін — профіль одного юзера (з історією)
    getUserProfiles: build.query<
      { profiles: MentorProfile[]; reports: WeeklyReportFull[] },
      string
    >({
      query: userId => `/mentor/weekly/admin/profiles/${userId}`,
      providesTags: ['MentorProfile'],
    }),

    // Адмін — ручний запуск аналізу
    runAnalysis: build.mutation<{ ok: boolean; retentionRisk: number }, string>({
      query: userId => ({
        url:    `/mentor/weekly/admin/run/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['MentorProfile'],
    }),

    // Адмін — позначити оффер показаним
    markOfferShown: build.mutation<{ ok: boolean }, string>({
      query: profileId => ({
        url:    `/mentor/weekly/admin/profiles/${profileId}/offer-shown`,
        method: 'PATCH',
      }),
      invalidatesTags: ['MentorProfile'],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetMyWeeklyReportQuery,
  useGetMyWeeklyReportsQuery,
  useGetAdminProfilesQuery,
  useGetUserProfilesQuery,
  useRunAnalysisMutation,
  useMarkOfferShownMutation,
} = weeklyAnalysisApi