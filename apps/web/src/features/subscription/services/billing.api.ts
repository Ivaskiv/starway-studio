import api from '@/services/api'

type BillingPlan = 'monthly' | 'yearly'

export type ProductRoomCard = {
  key: 'FOCUS' | 'STANKEY' | 'ABsystem'
  title: string
  state: 'active' | 'trial' | 'paused' | 'onboarding-started' | 'inactive'
  selectedFlow: string
  roomId: string
  accessSource: string
  mentorMode: 'silent' | 'soft' | 'medium' | 'aggressive'
  activationState: 'inactive' | 'trial' | 'active' | 'paused' | 'gifted' | 'bonus' | 'manual' | 'affiliate' | 'restore' | 'upsell' | 'onboarding-started'
  progressState: {
    currentLesson: string | null
    completedLessons: number
    streak: number
    lastActivityAt: string | null
  }
  reminderState: {
    enabled: boolean
    streak: boolean
    scheduledJobs: boolean
    productScoped: boolean
    roomScoped: boolean
    lifecycleScoped: boolean
  }
  gamificationState: {
    streak: number
    completedLessons: number
    checkpoints: string[]
  }
  behaviorState: string
  behaviorPolicy: {
    primaryCta: string
    secondaryCtas: string[]
    onboardingBehavior: string
    reminderCadence: string
    reminderTone: string
    mentorIntensity: string
    activationStrategy: string
    streakStrategy: string
    gamificationStrategy: string
    winbackStrategy: string
    completionStrategy: string
    upsellStrategy: string
    roomBehavior: string
    lifecycleBehavior: string
  }
  upsellState: 'none' | 'soft' | 'ready'
  retentionState: 'none' | 'warm' | 'watch' | 'restore'
  paymentUrl: string | null
  openUrl: string | null
  progressUrl: string | null
}

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
  productRooms: ProductRoomCard[]
  primaryProductRoom: ProductRoomCard | null
  productProgress: {
    streak: number
    completedLessons: number
    currentLesson: string | null
    onboardingStage: string | null
    lastActivityAt: string | null
    paymentStatus: 'paid' | 'trial' | 'paused' | 'unpaid'
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
    createProductPayment: builder.mutation<
      (
      {
        status: 'already_active'
        action?: 'resend_access'
        message?: string
      } | {
        status?: 'ok'
        checkoutUrl?: string
        paymentUrl: string
        payment?: Record<string, unknown>
        productId: string
        planCode: string
        orderReference?: string
      }
      ),
      { productId: string; planCode: string; linkToken?: string; source?: 'web' | 'telegram'; targetPath?: string }
    >({
      query: (body) => ({
        url: '/subscriptions/payments/wayforpay/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription', 'Payment'],
    }),
    activateGrant: builder.mutation<
      { success: boolean; productId: string; lifecycleState: string; roomSwitch: { roomId: string; state: string; selectedFlow: string; primaryCta: string } | null },
      { code: string }
    >({
      query: (body) => ({
        url: '/subscriptions/grants/activate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription', 'Payment'],
    }),
  }),
})

export const {
  useActivateGrantMutation,
  useCreatePaymentMutation,
  useCreateProductPaymentMutation,
  useGetSubscriptionQuery,
} = billingApi
