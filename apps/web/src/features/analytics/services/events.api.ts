import { api } from '@/services/api'

export interface TrackFrontendEventInput {
  userId?: string | null
  type: string
  source: 'web' | 'miniapp'
  state?: string | null
  payload?: Record<string, unknown>
}

export const eventsApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: builder => ({
    trackFrontendEvent: builder.mutation<{ ok: boolean }, TrackFrontendEventInput>({
      query: body => ({
        url: '/events/track',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useTrackFrontendEventMutation,
} = eventsApi
