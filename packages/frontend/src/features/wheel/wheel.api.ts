// packages/frontend/src/services/wheel.api.ts

import { WheelScore } from "@/features/wheel/types/wheel.types"
import { api } from "@/services"


// export interface WheelScore {
//   category_id: string
//   score: number
// }

export interface WheelAssessment {
  id: string
  scores: WheelScore[]
  total_score: number
  average_score: number
  strengths: string[]
  gaps: string[]
  created_at: string
}

export interface WheelData {
  current: {
    id: string
    scores: WheelScore[]
    average: number
    total_score: number
    strengths: string[]
    gaps: string[]
    completed_at: string
  } | null
  history: WheelAssessment[]
  canFillNew: boolean
  daysUntilNext: number
}

export interface WheelCooldown {
  canFill: boolean
  daysLeft: number
  lastFilledAt: string | null
}

export const wheelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWheel: builder.query<WheelData, void>({
      query: () => '/wheel',
      providesTags: ['Wheel'],
    }),

    saveWheel: builder.mutation<WheelAssessment, { scores: WheelScore[] }>({
      query: (body) => ({ url: '/wheel', method: 'POST', body }),
      invalidatesTags: ['Wheel', 'Progress'],
    }),

    getWheelCooldown: builder.query<WheelCooldown, void>({
      query: () => '/wheel/cooldown',
      providesTags: ['Wheel'],
    }),

    getLatestWheel: builder.query<WheelAssessment | null, string>({
      query: (user_id) => `/wheel/latest/${user_id}`,
      providesTags: ['Wheel'],
    }),

    getWheelHistory: builder.query<WheelAssessment[], { user_id?: string; limit?: number }>({
      query: ({ limit = 12 }) => `/wheel?limit=${limit}`,
      transformResponse: (response: WheelData) => response.history || [],
      providesTags: ['Wheel'],
    }),
  }),
})

export const {
  useGetWheelQuery,
  useSaveWheelMutation,
  useGetWheelCooldownQuery,
  useGetLatestWheelQuery,
  useGetWheelHistoryQuery,
} = wheelApi