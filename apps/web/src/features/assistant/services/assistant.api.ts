import { api, buildGetQuery, buildPostMutation } from '@/services/api'

type AssistantStateResponse = Record<string, unknown>

type AssistantChatRequest = {
  message: string
}

export type AssistantChatResponse = {
  message: string
  reply: string
  mentorMessage: {
    content: string
  }
  meta: {
    platform: 'telegram' | 'miniapp' | 'website' | 'web' | 'backend'
    requestId: string
    scenario: string
    provider: string | null
    lifecycle: string | null
    subscription: string | null
    fallbackActivated: boolean
    durationMs: number
  }
}

export const assistantApi = api.injectEndpoints({
  endpoints: builder => ({
    getAssistantState: builder.query<AssistantStateResponse, void>({
      query: buildGetQuery('/assistant/state'),
      providesTags: ['AssistantProgress'],
    }),
    sendAssistantMessage: builder.mutation<AssistantChatResponse, AssistantChatRequest>({
      query: buildPostMutation('/assistant/chat'),
      invalidatesTags: ['AssistantProgress'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetAssistantStateQuery,
  useSendAssistantMessageMutation,
} = assistantApi

export async function getAssistantState() {
  return Promise.reject(
    new Error('Use useGetAssistantStateQuery from RTK Query instead of imperative getAssistantState().'),
  )
}

export async function sendAssistantMessage(message: string) {
  return Promise.reject(
    new Error(
      `Use useSendAssistantMessageMutation from RTK Query instead of imperative sendAssistantMessage("${message}").`,
    ),
  )
}
