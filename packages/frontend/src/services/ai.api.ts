// packages/frontend/src/services/ai.api.ts
import { api } from './api';

export interface AnalyzedPrompt {
  theme: string;
  targetAudience: string;
  mainProblem: string;
  solution: string;
  uniqueValue: string;
  duration: string;
  platform: string;
  monetization: string;
}

interface GenerateStepVariantsRequest {
  stepNumber: number;
  stepTitle: string;
  stepDescription: string;
  analysis: AnalyzedPrompt;
}

export interface AIPromptHistory {
  id: string;
  prompt: string;
  analysis: AnalyzedPrompt;
  createdAt: string;
}

export interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: 'funnel' | 'product' | 'content' | 'email';
  prompt: string;
  variables: {
    name: string;
    type: 'text' | 'number' | 'select';
    required: boolean;
    options?: string[];
  }[];
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
}

export interface AIContentGeneration {
  id: string;
  type: 'title' | 'description' | 'email' | 'post' | 'script';
  input: string;
  output: string;
  model: 'gpt-4' | 'gpt-3.5-turbo';
  tokens: number;
  createdAt: string;
}

export interface AIAnalysis {
  id: string;
  funnelId: string;
  type: 'conversion' | 'engagement' | 'content' | 'competitor';
  insights: {
    category: string;
    insight: string;
    score: number;
    recommendation: string;
  }[];
  createdAt: string;
}

export const aiApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Main AI Generation
    analyzePrompt: builder.mutation<AnalyzedPrompt, string>({
      query: (prompt) => ({
        url: '/ai/analyze-prompt',
        method: 'POST',
        body: { prompt },
      }),
      transformResponse: (response: { success: boolean; analysis: AnalyzedPrompt }) => {
        console.log('✅ [AI] Analysis received');
        return response.analysis;
      },
      invalidatesTags: ['AI', 'AIPrompt'],
    }),

    generateStepVariants: builder.mutation<string[], GenerateStepVariantsRequest>({
      query: (data) => ({
        url: '/ai/generate-step',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: { success: boolean; variants: string[] }) => {
        console.log('✅ [AI] Variants generated');
        return response.variants;
      },
      transformErrorResponse: (error: any, meta, arg) => {
        console.error(`❌ [AI] Step ${arg.stepNumber} error:`, error);
        return {
          data: [
            `Варіант 1 для ${arg.stepTitle}`,
            `Варіант 2 для ${arg.stepTitle}`,
            `Варіант 3 для ${arg.stepTitle}`,
          ],
        };
      },
      invalidatesTags: ['AI'],
    }),

    // AI Content Generation
    generateContent: builder.mutation<string, { type: string; prompt: string; context?: any }>({
      query: ({ type, prompt, context }) => ({
        url: '/ai/generate-content',
        method: 'POST',
        body: { type, prompt, context },
      }),
      transformResponse: (response: { content: string }) => response.content,
      invalidatesTags: ['AI'],
    }),

    improveText: builder.mutation<string, { text: string; instruction: string }>({
      query: ({ text, instruction }) => ({
        url: '/ai/improve-text',
        method: 'POST',
        body: { text, instruction },
      }),
      transformResponse: (response: { improved: string }) => response.improved,
    }),

    generateTitle: builder.mutation<string[], { description: string; count?: number }>({
      query: ({ description, count = 5 }) => ({
        url: '/ai/generate-title',
        method: 'POST',
        body: { description, count },
      }),
      transformResponse: (response: { titles: string[] }) => response.titles,
    }),

    generateDescription: builder.mutation<string, { title: string; keywords?: string[] }>({
      query: ({ title, keywords }) => ({
        url: '/ai/generate-description',
        method: 'POST',
        body: { title, keywords },
      }),
      transformResponse: (response: { description: string }) => response.description,
    }),

    // AI Prompt History
    getPromptHistory: builder.query<AIPromptHistory[], { limit?: number }>({
      query: ({ limit = 10 }) => ({
        url: '/ai/prompts/history',
        params: { limit },
      }),
      providesTags: ['AIPrompt'],
    }),

    savePrompt: builder.mutation<AIPromptHistory, { prompt: string; analysis: AnalyzedPrompt }>({
      query: (data) => ({
        url: '/ai/prompts/save',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AIPrompt'],
    }),

    deletePrompt: builder.mutation<void, string>({
      query: (id) => ({
        url: `/ai/prompts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AIPrompt'],
    }),

    // AI Templates
    getAITemplates: builder.query<AITemplate[], { category?: string }>({
      query: ({ category }) => ({
        url: '/ai/templates',
        params: { category },
      }),
      providesTags: ['AITemplate'],
    }),

    createAITemplate: builder.mutation<AITemplate, Partial<AITemplate>>({
      query: (data) => ({
        url: '/ai/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AITemplate'],
    }),

    useAITemplate: builder.mutation<string, { templateId: string; variables: Record<string, any> }>({
      query: ({ templateId, variables }) => ({
        url: `/ai/templates/${templateId}/use`,
        method: 'POST',
        body: { variables },
      }),
      transformResponse: (response: { result: string }) => response.result,
    }),

    deleteAITemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/ai/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AITemplate'],
    }),

    // AI Analysis
    analyzeFunnel: builder.mutation<AIAnalysis, { funnelId: string; type: string }>({
      query: ({ funnelId, type }) => ({
        url: '/ai/analyze-funnel',
        method: 'POST',
        body: { funnelId, type },
      }),
      invalidatesTags: ['AIAnalysis'],
    }),

    getAIAnalyses: builder.query<AIAnalysis[], { funnelId?: string }>({
      query: ({ funnelId }) => ({
        url: '/ai/analyses',
        params: { funnelId },
      }),
      providesTags: ['AIAnalysis'],
    }),

    // AI Chat Assistant
    chatWithAI: builder.mutation<{ response: string; suggestions?: string[] }, { message: string; context?: any }>({
      query: ({ message, context }) => ({
        url: '/ai/chat',
        method: 'POST',
        body: { message, context },
      }),
    }),

    // AI Image Generation
    generateImage: builder.mutation<{ url: string }, { prompt: string; size?: string }>({
      query: ({ prompt, size = '1024x1024' }) => ({
        url: '/ai/generate-image',
        method: 'POST',
        body: { prompt, size },
      }),
      invalidatesTags: ['AI'],
    }),

    // AI Translation
    translateText: builder.mutation<string, { text: string; targetLanguage: string }>({
      query: ({ text, targetLanguage }) => ({
        url: '/ai/translate',
        method: 'POST',
        body: { text, targetLanguage },
      }),
    }),

    // AI SEO Optimization
    optimizeSEO: builder.mutation<{
      title: string;
      description: string;
      keywords: string[];
      suggestions: string[];
    }, { content: string }>({
      query: ({ content }) => ({
        url: '/ai/optimize-seo',
        method: 'POST',
        body: { content },
      }),
    }),
  }),
});

export const {
  useAnalyzePromptMutation,
  useGenerateStepVariantsMutation,
  useGenerateContentMutation,
  useImproveTextMutation,
  useGenerateTitleMutation,
  useGenerateDescriptionMutation,
  useGetPromptHistoryQuery,
  useSavePromptMutation,
  useDeletePromptMutation,
  useGetAITemplatesQuery,
  useCreateAITemplateMutation,
  useUseAITemplateMutation,
  useDeleteAITemplateMutation,
  useAnalyzeFunnelMutation,
  useGetAIAnalysesQuery,
  useChatWithAIMutation,
  useGenerateImageMutation,
  useTranslateTextMutation,
  useOptimizeSEOMutation,
} = aiApi;