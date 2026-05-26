import { api } from '@/services/api'
import type {
  AiAssistantWorkspace,
  GenerateRequest,
  GenerationResult,
  UpdateWorkspaceRequest,
} from '@ai/types/salesAssistant.types'
import type { AgentKey } from '@/features/sales-assistant/components/SpecializedAgentsSection'

type PresetKey = 'noise' | 'stuck' | 'battle' | 'tactic'
type AgentGenerationResult = {
  agent: AgentKey
  status: 'fulfilled' | 'rejected'
  result: string | null
  error: string | null
  model: 'claude' | 'gpt' | 'gemini'
  durationMs: number
  contentType?: string
  jobId?: string
}
type GenerateWithAgentsRequest = {
  selectedAgents: AgentKey[]
  selectedPreset?: PresetKey | null
  audiencePain: string
  targetAction: string
  product?: string
  additionalNotes?: string
  userId?: string
  protocol?: 'raw_truth' | 'architect' | 'psychology'
  tone?: 'clear' | 'warm' | 'expert' | 'bold'
  generationMode?: 'FAST' | 'BALANCED' | 'DEEP'
  accessTier?: 'free' | 'premium' | 'enterprise'
}
type GenerateWithAgentsResponse = {
  success: boolean
  results: AgentGenerationResult[]
  generationSession?: {
    id: string
    status: string
    totalJobs: number
    completedJobs: number
    failedJobs: number
  }
  generationJobs?: Array<{
    id: string
    contentType: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
    attempt: number
    maxAttempts: number
    error?: string
    failureClass?:
      | 'BALANCE_EXHAUSTED'
      | 'RATE_LIMIT'
      | 'INVALID_API_KEY'
      | 'TEMPORARY_UNAVAILABLE'
      | 'TIMEOUT'
      | 'FEATURE_NOT_SUPPORTED'
      | 'PROVIDER_DOWN'
    provider?: 'claude' | 'gpt' | 'gemini'
    fallbackProvider?: 'claude' | 'gpt' | 'gemini'
    degraded?: boolean
    blockedPremium?: boolean
    paused?: boolean
  }>
  providerStatuses?: Array<{
    provider: 'claude' | 'gpt' | 'gemini'
    available: boolean
    status:
      | 'ok'
      | 'degraded'
      | 'ACTIVE'
      | 'DEGRADED'
      | 'RATE_LIMITED'
      | 'OUT_OF_CREDITS'
      | 'UNAVAILABLE'
      | 'DISABLED'
      | 'BALANCE_EXHAUSTED'
      | 'RATE_LIMIT'
      | 'INVALID_API_KEY'
      | 'TEMPORARY_UNAVAILABLE'
      | 'TIMEOUT'
      | 'FEATURE_NOT_SUPPORTED'
      | 'PROVIDER_DOWN'
    message?: string
  }>
  gatingDecision?: {
    allowed: boolean
    reason?: 'feature_blocked' | 'provider_unavailable' | 'provider_credits' | 'provider_disabled'
    message?: string
    upgradeCta?: string
    fallbackOption?: string
    availableProviders: Array<'gpt' | 'claude' | 'gemini' | 'runway'>
  }
  error?: string
}

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
      async onQueryStarted(payload, { queryFulfilled }) {
        console.log('[DNA][frontend] submit payload', payload)
        try {
          const response = await queryFulfilled
          console.log('[DNA][frontend] response', response.data)
        } catch (error) {
          console.error('[DNA][frontend] error', error)
        }
      },
    }),
    generateWithAgents: builder.mutation<GenerateWithAgentsResponse, GenerateWithAgentsRequest>({
      query: (body) => ({
        url: '/ai/sales-assistant/generate-with-agents',
        method: 'POST',
        body,
      }),
      async onQueryStarted(payload, { queryFulfilled }) {
        console.log('[DNA][frontend] submit agents payload', payload)
        try {
          const response = await queryFulfilled
          console.log('[DNA][frontend] agents response', response.data)
        } catch (error) {
          console.error('[DNA][frontend] agents error', error)
        }
      },
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
  useGenerateWithAgentsMutation,
  useGetCampaignMemoryQuery,
  useGetLexiconQuery,
  useGetWorkspaceQuery,
  useUpdateCampaignMemoryMutation,
  useUpdateWorkspaceMutation,
} = aiAssistantApi
