// frontend/src/features/wheel/services/wheel.api.ts
import { api } from '@/services/api'
import type { WheelAssessment, WheelScore, WheelAnalysis } from '@/features/wheel/types/wheel.types'

export const wheelApi = api.injectEndpoints({
  endpoints: builder => ({

    // Отримати останню оцінку колеса користувача
    getWheelAssessment: builder.query<WheelAssessment, string>({
      query: userId => `/wheel/assessment/${userId}`,
      providesTags: ['Wheel'],
    }),
 getWheelAssessments: builder.query<WheelAssessment[], string>({
      query: userId => `/wheel/assessments/${userId}`, // повертає масив
      providesTags: ['Wheel'],
    }),
    // Створити нову оцінку
    createWheelAssessment: builder.mutation<WheelAssessment, { userId: string; scores: WheelScore[] }>({
      query: body => ({
        url: '/wheel/assessment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wheel'],
    }),

    // Аналіз колеса
    getWheelAnalysis: builder.query<WheelAnalysis, string>({
      query: userId => `/wheel/analysis/${userId}`,
      providesTags: ['Wheel'],
    }),

    // 🔹 Cooldown
    getWheelCooldown: builder.query<{ canFill: boolean; daysLeft: number; lastFilledAt: string | null }, string>({
      query: userId => `/wheel/cooldown/${userId}`,
      providesTags: ['Wheel'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetWheelAssessmentQuery,
  useGetWheelAssessmentsQuery,
  useCreateWheelAssessmentMutation,
  useGetWheelAnalysisQuery,
  useGetWheelCooldownQuery,
} = wheelApi
