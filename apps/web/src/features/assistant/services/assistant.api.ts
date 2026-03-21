import { api, buildGetQuery, buildPostMutation } from '@/services/api'

type AssistantStateResponse = Record<string, unknown>

type AssistantChatRequest = {
  message: string
}

type AssistantChatResponse = Record<string, unknown>

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
