import api from '@/services/api'

type BillingPlan = 'monthly' | 'yearly'

type CreatePaymentResponse = {
  paymentUrl: string
  payment: Record<string, unknown>
  orderReference: string
  plan: BillingPlan
  variant: 'A' | 'B'
}

type SubscriptionStatusResponse = {
  success: boolean
  subscription: {
    status: string | null
    endsAt?: string | null
    autoRenew?: boolean
    daysLeft?: number
  } | null
  trial: {
    isActive: boolean
    startsAt?: string
    endsAt?: string
    daysLeft: number
  } | null
}

export const billingApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getSubscription: builder.query<SubscriptionStatusResponse, void>({
      query: () => '/subscriptions/status',
      providesTags: ['Subscription'],
    }),
    createPayment: builder.mutation<CreatePaymentResponse, { plan: BillingPlan; variant?: 'A' | 'B' }>({
      query: (body) => ({
        url: '/billing/pay',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription', 'Payment'],
    }),
  }),
})

export const {
  useCreatePaymentMutation,
  useGetSubscriptionQuery,
} = billingApi
