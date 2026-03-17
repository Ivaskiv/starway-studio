import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { api } from '@/services/api'

type RegisterExpertBotInput = {
  botToken: string
  displayName: string
  specialty?: string
  bio?: string
  avatarUrl?: string
}

interface RegisterExpertBotResponse {
  ok: boolean
  role: string
  username?: string
}

export const expertsApi = api.injectEndpoints({
  endpoints: builder => ({
    registerExpertBot: builder.mutation<RegisterExpertBotResponse, RegisterExpertBotInput>({
      query: body => ({
        url: '/experts/register-bot',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useRegisterExpertBotMutation,
} = expertsApi
