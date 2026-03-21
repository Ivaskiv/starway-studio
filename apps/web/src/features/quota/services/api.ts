import { api } from '@/services/api'

type QuotaResponse = {
  available: number
  used: number
  purchased: number
  periodStart: string
  baseLimit: number
}

export const quotaApi = api.injectEndpoints({
  endpoints: builder => ({
    getMyQuota: builder.query<QuotaResponse, void>({
      query: () => '/quota/me',
      providesTags: ['Quota'],
    }),
    purchaseQuota: builder.mutation<QuotaResponse, { amount: number; costUsd?: number }>({
      query: body => ({
        url: '/quota/purchase',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Quota'],
    }),
  }),
  overrideExisting: false,
})

export const { useGetMyQuotaQuery, usePurchaseQuotaMutation } = quotaApi
