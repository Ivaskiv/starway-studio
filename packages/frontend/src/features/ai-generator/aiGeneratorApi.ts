// packages/frontend/src/store/api/aiApi.ts

import { baseApi } from './baseApi'

interface AIGenerationRequest {
  field: string
  prompt: string
  systemPrompt?: string
  context?: any
}

interface AIGenerationResponse {
  success: boolean
  result: string
  remaining: number
}

interface GenerationLimitResponse {
  canGenerate: boolean
  remaining: number
}

interface GenerationHistory {
  id: string
  field: string
  result: string
  timestamp: string
}

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Generate with AI
    generateWithAI: builder.mutation<AIGenerationResponse, AIGenerationRequest>({
      query: (data) => ({
        url: '/api/ai/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AI'],
    }),

    // Check generation limit
    checkGenerationLimit: builder.query<GenerationLimitResponse, void>({
      query: () => '/api/ai/limit',
      providesTags: ['AI'],
    }),

    // Get generation history
    getGenerationHistory: builder.query<GenerationHistory[], void>({
      query: () => '/api/ai/history',
      providesTags: ['AI'],
    }),
  }),
})

export const {
  useGenerateWithAIMutation,
  useCheckGenerationLimitQuery,
  useGetGenerationHistoryQuery,
} = aiApi