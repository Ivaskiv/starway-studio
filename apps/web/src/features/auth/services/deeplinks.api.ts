import { api } from '@/services/api'
import type { User } from '@/features/user/types/user.types'

interface ResolveDeepLinkResponse {
  ok: boolean
  link: {
    userId: string
    token: string
    action: 'bind_telegram' | 'continue_flow' | 'open_web' | 'open_miniapp' | 'resume_task' | 'open_mentor' | 'magic_login'
    source: 'telegram' | 'web' | 'miniapp'
    target: 'telegram' | 'web' | 'miniapp'
    path: string | null
    payload: Record<string, unknown> | null
  }
  state: string | null
  telegramUrl: string
  webUrl: string
}

interface RestoreDeepLinkSessionResponse extends ResolveDeepLinkResponse {
  user: User
  accessToken: string
  expiresIn: number
}

interface GenerateDeepLinkResponse {
  ok: boolean
  deepLink: {
    userId: string
    token: string
    action: 'bind_telegram' | 'continue_flow' | 'open_web' | 'open_miniapp' | 'resume_task' | 'open_mentor' | 'magic_login'
    source: 'telegram' | 'web' | 'miniapp'
    target: 'telegram' | 'web' | 'miniapp'
    path: string | null
    payload: Record<string, unknown> | null
  }
  telegramUrl: string
  webUrl: string
}

export const deeplinksApi = api.injectEndpoints({
  endpoints: builder => ({
    generateDeepLink: builder.mutation<
      GenerateDeepLinkResponse,
      {
        action: 'bind_telegram' | 'continue_flow' | 'open_web' | 'open_miniapp' | 'resume_task' | 'open_mentor' | 'magic_login'
        source: 'telegram' | 'web' | 'miniapp'
        target: 'telegram' | 'web' | 'miniapp'
        path?: string | null
        payload?: Record<string, unknown>
      }
    >({
      query: body => ({
        url: '/deeplinks/generate',
        method: 'POST',
        body,
      }),
    }),
    resolveDeepLink: builder.mutation<ResolveDeepLinkResponse, { token: string; consume?: boolean }>({
      query: body => ({
        url: '/deeplinks/resolve',
        method: 'POST',
        body,
      }),
    }),
    restoreDeepLinkSession: builder.mutation<RestoreDeepLinkSessionResponse, { token: string; consume?: boolean }>({
      query: body => ({
        url: '/deeplinks/resolve-session',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGenerateDeepLinkMutation,
  useResolveDeepLinkMutation,
  useRestoreDeepLinkSessionMutation,
} = deeplinksApi
