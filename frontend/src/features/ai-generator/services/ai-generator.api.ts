// features/ai-generator/services/ai-generator.api.ts

import { api } from '@/services/api'
import type { FunnelBlueprint } from '../types/generator.types'

interface GenerateStepRequest {
  stepNumber: number
  userInput: string
  context?: Record<string, string>
}

interface GenerateStepResponse {
  success: boolean
  variants: string[]
  remainingAttempts: number
}

interface GenerateBlueprintRequest {
  stepsData: {
    number: number
    userInput: string
    selectedContent: string
  }[]
}

interface SaveFunnelRequest {
  blueprint: FunnelBlueprint
}

interface SaveFunnelResponse {
  success: boolean
  funnelId: string
}

export const aiGeneratorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateStepVariants: builder.mutation<GenerateStepResponse, GenerateStepRequest>({
      query: (data) => ({
        url: '/ai/generator/step',
        method: 'POST',
        body: data,
      }),
    }),

    generateFunnelBlueprint: builder.mutation<FunnelBlueprint, GenerateBlueprintRequest>({
      query: (data) => ({
        url: '/ai/generator/blueprint',
        method: 'POST',
        body: data,
      }),
    }),

    saveFunnelFromBlueprint: builder.mutation<SaveFunnelResponse, SaveFunnelRequest>({
      query: (data) => ({
        url: '/ai/generator/save-funnel',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Funnel'],
    }),
  }),
  overrideExisting: true,
})

export const {
  useGenerateStepVariantsMutation,
  useGenerateFunnelBlueprintMutation,
  useSaveFunnelFromBlueprintMutation,
} = aiGeneratorApi