import { api } from '@/services/api'
import type {
  ContentStudioAIStrategy,
  ContentStudioInputs,
  ContentStudioItem,
  ContentStudioLeadMagnetPayload,
  ContentStudioLeadMagnetPublishResult,
  MarketResearchPayload,
} from '../types/contentStudio.types'

type GenerateBundleResponse = {
  ok: boolean
  items: ContentStudioItem[]
  generatedAt: string
}

type PublishItemResponse = {
  ok: boolean
  item: ContentStudioItem
  publishedAt: string
}

type GenerateImagesResponse = {
  ok: boolean
  item: ContentStudioItem
  generatedAt: string
}

type RefreshResearchResponse = {
  ok: boolean
  message: string
  updated: number
  errors: string[]
  nextRefresh: string
}

export const contentStudioApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateContentBundle: builder.mutation<GenerateBundleResponse, { inputs: ContentStudioInputs; formats?: Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>; strategy?: ContentStudioAIStrategy | null }>({
      query: (body) => ({
        url: '/admin/content-studio/generate',
        method: 'POST',
        body,
      }),
      async onQueryStarted(payload, { queryFulfilled }) {
        console.log('[DNA][content-studio] submit payload', payload)
        try {
          const response = await queryFulfilled
          console.log('[DNA][content-studio] response', response.data)
        } catch (error) {
          console.error('[DNA][content-studio] error', error)
        }
      },
    }),
    regenerateContentItem: builder.mutation<ContentStudioItem, { item: ContentStudioItem; inputs: ContentStudioInputs; strategy?: ContentStudioAIStrategy | null }>({
      query: (body) => ({
        url: '/admin/content-studio/regenerate',
        method: 'POST',
        body,
      }),
    }),
    publishContentItem: builder.mutation<PublishItemResponse, { item: ContentStudioItem }>({
      query: (body) => ({
        url: '/admin/content-studio/publish',
        method: 'POST',
        body,
      }),
    }),
    generateContentImages: builder.mutation<GenerateImagesResponse, { item: ContentStudioItem; count?: number }>({
      query: (body) => ({
        url: '/admin/content-studio/generate-images',
        method: 'POST',
        body,
      }),
    }),
    saveLeadMagnet: builder.mutation<ContentStudioLeadMagnetPublishResult, { payload: ContentStudioLeadMagnetPayload }>({
      query: (body) => ({
        url: '/admin/content-studio/lead-magnet/save',
        method: 'POST',
        body,
      }),
    }),
    testLeadMagnetTelegram: builder.mutation<ContentStudioLeadMagnetPublishResult, { payload: ContentStudioLeadMagnetPayload; telegramToken: string; telegramChatId: string }>({
      query: (body) => ({
        url: '/admin/content-studio/lead-magnet/test',
        method: 'POST',
        body,
      }),
    }),
    publishLeadMagnet: builder.mutation<ContentStudioLeadMagnetPublishResult, { payload: ContentStudioLeadMagnetPayload; telegramToken?: string; telegramChatId?: string }>({
      query: (body) => ({
        url: '/admin/content-studio/lead-magnet/publish',
        method: 'POST',
        body,
      }),
    }),
    getContentStudioResearch: builder.query<MarketResearchPayload, void>({
      query: () => ({
        url: '/admin/content-studio/research',
        method: 'GET',
      }),
      providesTags: ['Analytics'],
    }),
    refreshContentStudioResearch: builder.mutation<RefreshResearchResponse, void>({
      query: () => ({
        url: '/admin/content-studio/research/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Analytics'],
    }),
  }),
})

export const {
  useGenerateContentBundleMutation,
  useGenerateContentImagesMutation,
  useSaveLeadMagnetMutation,
  useTestLeadMagnetTelegramMutation,
  usePublishLeadMagnetMutation,
  usePublishLeadMagnetMutation: usePublishLeadMagnetTelegramMutation,
  useGetContentStudioResearchQuery,
  useRegenerateContentItemMutation,
  usePublishContentItemMutation,
  useRefreshContentStudioResearchMutation,
} = contentStudioApi
