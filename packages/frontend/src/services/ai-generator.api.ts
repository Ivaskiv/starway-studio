// packages/frontend/src/services/ai-generator.api.ts

import type { FunnelBlueprint } from '@/features/ai-generator/types/generator.types';
import { api } from './api';

interface GenerateStepRequest {
  stepNumber: number;
  userInput: string;
  context: Record<string, any>;
}

interface GenerateStepResponse {
  success: boolean;
  variants: string[];
  remainingAttempts: number;
}

interface GenerateBlueprintRequest {
  stepsData: Array<{
    number: number;
    userInput: string;
    selectedContent: string;
  }>;
}

export const aiGeneratorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Генерація варіантів для кроку
     */
    generateStepVariants: builder.mutation<GenerateStepResponse, GenerateStepRequest>({
      query: (data) => ({
        url: '/ai/generator/step', 
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        console.log('✅ [AI] Generated step variants');
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('❌ [AI] Step generation error:', response);
        return response;
      },
    }),

    /**
     * Генерація фінального blueprint воронки
     */
    generateFunnelBlueprint: builder.mutation<FunnelBlueprint, GenerateBlueprintRequest>({
      query: (data) => ({
        url: '/ai/generator/blueprint', 
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        console.log('✅ [AI] Generated funnel blueprint');
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('❌ [AI] Blueprint error:', response);
        return response;
      },
    }),

    /**
     * Збереження згенерованої воронки
     */
    saveFunnelFromBlueprint: builder.mutation<{ funnelId: string }, { blueprint: FunnelBlueprint }>({
      query: ({ blueprint }) => ({
        url: '/ai/generator/save-funnel',  
        method: 'POST',
        body: { blueprint },
      }),
      invalidatesTags: ['Funnel'],
    }),

    /**
     * Отримання статистики генерацій користувача
     */
    getGenerationStats: builder.query<{
      totalGenerated: number;
      savedFunnels: number;
      attemptsUsed: number;
      successRate: number;
    }, void>({
      query: () => '/ai/generator/stats',  
      providesTags: ['Stats'],
    }),
  }),
  overrideExisting: true,  
});

export const {
  useGenerateStepVariantsMutation,
  useGenerateFunnelBlueprintMutation,
  useSaveFunnelFromBlueprintMutation,
  useGetGenerationStatsQuery,
} = aiGeneratorApi;