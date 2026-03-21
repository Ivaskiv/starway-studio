// frontend/src/features/ai-aIMentor/services/setup.api.ts
/**
 * Setup API
 * RTK Query endpoints for aIMentor setup wizard
 */

import { api } from '@/services/api';

export interface SetupProgress {
  userId: string;
  wheelCompleted: boolean;
  questionsConfigured: boolean;
  setupCompletedAt?: string;
  currentStep: 'wheel' | 'questions' | 'complete';
}

export interface QuestionsConfig {
  frequency: 'morning' | 'evening' | 'both' | 'daily';
  morningQuestions?: string[];
  eveningQuestions?: string[];
  dailyQuestions?: string[];
  customQuestions?: string[];
  telegramContact?: string;
}

export interface GeneratedQuestionsVariant {
  id: string;
  title: string;
  morningQuestions: string[];
  eveningQuestions: string[];
}

export interface WheelScore {
  categoryId: string;
  score: number;
  comment?: string;
}

const setupApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get setup progress
    getSetupProgress: builder.query<SetupProgress, void>({
      query: () => '/mentor/setup/progress',
      providesTags: ['MentorSetup']
    }),

    // Configure wheel
    setupWheel: builder.mutation<{ wheelId: string; nextStep: string }, WheelScore[]>({
      query: (scores) => ({
        url: '/mentor/setup/wheel',
        method: 'POST',
        body: { scores }
      }),
      invalidatesTags: ['MentorSetup', 'Wheel']
    }),

    // Configure questions
    setupQuestions: builder.mutation<{ setupComplete: boolean }, QuestionsConfig>({
      query: (config) => ({
        url: '/mentor/setup/questions',
        method: 'POST',
        body: config
      }),
      invalidatesTags: ['MentorSetup']
    }),

    generateQuestionsVariants: builder.mutation<
      { variants: GeneratedQuestionsVariant[] },
      { frequency: QuestionsConfig['frequency']; goal?: string; audience?: string; tone?: string }
    >({
      query: (body) => ({
        url: '/mentor/setup/questions/generate',
        method: 'POST',
        body,
      }),
    }),

    // Complete setup
    completeSetup: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/mentor/setup/complete',
        method: 'POST'
      }),
      invalidatesTags: ['MentorSetup', 'MentorAccess', 'Onboarding']
    })
  })
});

export const {
  useGetSetupProgressQuery,
  useSetupWheelMutation,
  useSetupQuestionsMutation,
  useGenerateQuestionsVariantsMutation,
  useCompleteSetupMutation
} = setupApi;

export default setupApi;
