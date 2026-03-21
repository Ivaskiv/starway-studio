import { api } from '@/services/api'

interface ResolveDeepLinkResponse {
  ok: boolean
  link: {
    userId: string
    token: string
    action: 'bind_telegram' | 'continue_flow' | 'open_web' | 'open_miniapp' | 'resume_task' | 'open_mentor'
    source: 'telegram' | 'web' | 'miniapp'
    target: 'telegram' | 'web' | 'miniapp'
    path: string | null
    payload: Record<string, unknown> | null
  }
  state: string | null
  telegramUrl: string
  webUrl: string
}

export const deeplinksApi = api.injectEndpoints({
  endpoints: builder => ({
    resolveDeepLink: builder.mutation<ResolveDeepLinkResponse, { token: string; consume?: boolean }>({
      query: body => ({
        url: '/deeplinks/resolve',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useResolveDeepLinkMutation,
} = deeplinksApi
