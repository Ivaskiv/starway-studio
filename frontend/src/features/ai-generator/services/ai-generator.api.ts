// features/ai-generator/services/ai-generator.api.ts

import { api } from '@/services/api';
import type {
  FunnelBlueprint,
  OwnerOnboardingProfile,
} from '../../products/types/generator.types';

interface GenerateStepRequest {
  stepNumber: number;
  userInput: string;
  context?: Record<string, string>;
}

interface GenerateStepResponse {
  success: boolean;
  variants: string[];
  remainingAttempts: number;
}

interface GenerateBlueprintRequest {
  stepsData: {
    number: number;
    userInput: string;
    communityPrompt?: string;
    selectedContent: string;
  }[];
}

interface SaveFunnelRequest {
  blueprint: FunnelBlueprint;
  onboarding?: OwnerOnboardingProfile;
}

interface SaveFunnelResponse {
  success: boolean;
  funnelId: string;
}

interface WorkflowPayload {
  currentStep: number;
  stepsData: {
    number: number;
    userInput: string;
    selectedContent: string;
  }[];
  totalRemainingAttempts: number;
  generatedBlueprint: FunnelBlueprint | null;
  onboarding: OwnerOnboardingProfile;
  updatedAt?: string;
}

export const aiGeneratorApi = api.injectEndpoints({
  endpoints: builder => ({
    getWorkflow: builder.query<{ success: boolean; workflow: WorkflowPayload | null }, void>({
      query: () => ({
        url: '/ai/generator/workflow',
        method: 'GET',
      }),
    }),

    saveWorkflow: builder.mutation<{ success: boolean; updatedAt: string }, { workflow: WorkflowPayload }>({
      query: (body) => ({
        url: '/ai/generator/workflow',
        method: 'PUT',
        body,
      }),
    }),

    generateStepVariants: builder.mutation<GenerateStepResponse, GenerateStepRequest>({
      query: data => ({
        url: '/ai/generator/step',
        method: 'POST',
        body: data,
      }),
    }),

    generateFunnelBlueprint: builder.mutation<FunnelBlueprint, GenerateBlueprintRequest>({
      query: data => ({
        url: '/ai/generator/blueprint',
        method: 'POST',
        body: data,
      }),
    }),

    saveFunnelFromBlueprint: builder.mutation<SaveFunnelResponse, SaveFunnelRequest>({
      query: data => ({
        url: '/ai/generator/save-funnel',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Funnel'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetWorkflowQuery,
  useGenerateStepVariantsMutation,
  useGenerateFunnelBlueprintMutation,
  useSaveWorkflowMutation,
  useSaveFunnelFromBlueprintMutation,
} = aiGeneratorApi;
