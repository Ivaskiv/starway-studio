import { api } from '@/services/api'
import type {
  AiAssistantWorkspace,
  GenerateRequest,
  GenerationResult,
  UpdateWorkspaceRequest,
} from '@ai/types/salesAssistant.types'

type LexiconItem = {
  id: string
  word: string
  type: 'REQUIRED' | 'FORBIDDEN'
}

type CampaignMemory = {
  launchContext: string
  audienceTemp: string
  objections: string
  resistance: string
}

export const aiAssistantApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspace: builder.query<AiAssistantWorkspace, void>({
      query: () => ({
        url: '/ai/sales-assistant/workspace',
        method: 'GET',
      }),
      keepUnusedDataFor: 300,
    }),
    updateWorkspace: builder.mutation<AiAssistantWorkspace, UpdateWorkspaceRequest>({
      query: (body) => ({
        url: '/ai/sales-assistant/workspace',
        method: 'PUT',
        body,
      }),
    }),
    generateContent: builder.mutation<GenerationResult, GenerateRequest>({
      query: (body) => ({
        url: '/ai/sales-assistant/generate',
        method: 'POST',
        body,
      }),
    }),
    getLexicon: builder.query<LexiconItem[], void>({
      query: () => '/ai/sales-assistant/lexicon',
      providesTags: ['Lexicon'],
    }),
    addLexicon: builder.mutation<{ id: string }, { word: string; type: 'REQUIRED' | 'FORBIDDEN' }>({
      query: (body) => ({
        url: '/ai/sales-assistant/lexicon',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lexicon'],
    }),
    deleteLexicon: builder.mutation<void, string>({
      query: (id) => ({
        url: `/ai/sales-assistant/lexicon/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Lexicon'],
    }),
    getCampaignMemory: builder.query<CampaignMemory | null, void>({
      query: () => '/ai/sales-assistant/campaign-memory',
      providesTags: ['CampaignMemory'],
    }),
    updateCampaignMemory: builder.mutation<CampaignMemory, CampaignMemory>({
      query: (body) => ({
        url: '/ai/sales-assistant/campaign-memory',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CampaignMemory'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useAddLexiconMutation,
  useDeleteLexiconMutation,
  useGenerateContentMutation,
  useGetCampaignMemoryQuery,
  useGetLexiconQuery,
  useGetWorkspaceQuery,
  useUpdateCampaignMemoryMutation,
  useUpdateWorkspaceMutation,
} = aiAssistantApi
