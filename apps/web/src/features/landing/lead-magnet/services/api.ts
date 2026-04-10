import { api } from '@/services/api'

export interface LeadMagnetRegisterRequest {
  name: string
  phone?: string
  email?: string
  packageType: 'free' | 'trial' | 'paid'
  expertId?: string
  utm_source?: string
  utm_campaign?: string
  product_id?: string
}

export interface LeadMagnetRegisterResponse {
  ok: boolean
  accessToken: string
  user: { id: string; name: string; email: string }
  packageType: string
  message: string
}

export const leadMagnetApi = api.injectEndpoints({
  endpoints: (builder) => ({
    registerLeadMagnet: builder.mutation<LeadMagnetRegisterResponse, LeadMagnetRegisterRequest>({
      query: (body) => ({
        url: '/lead-magnet/register',
        method: 'POST',
        body,
      }),
    }),
    getLeadMagnetStatus: builder.query<{ plan: string; status: string; trialEndsAt: string | null }, void>({
      query: () => '/lead-magnet/status',
    }),
  }),
})

export const {
  useRegisterLeadMagnetMutation,
  useGetLeadMagnetStatusQuery,
} = leadMagnetApi
