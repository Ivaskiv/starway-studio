// frontend/src/services/monetization.api.ts
import { api } from './api';

export interface PricingPlan {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  price: number;
  currency: 'UAH' | 'USD' | 'EUR';
  billingPeriod: 'once' | 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  trialDays?: number;
  maxUsers?: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  currency?: 'UAH' | 'USD' | 'EUR';
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  applicableTo?: {
    type: 'all' | 'products' | 'plans';
    ids?: string[];
  };
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'payment' | 'refund' | 'subscription';
  amount: number;
  currency: 'UAH' | 'USD' | 'EUR';
  status: 'PENDING' | 'COMPLETED' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'paypal' | 'crypto' | 'bank_transfer';
  description?: string;
  metadata?: any;
  createdAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  number: string;
  amount: number;
  currency: 'UAH' | 'USD' | 'EUR';
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate?: string;
  paidAt?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  pdf?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  transactionId: string;
  amount: number;
  currency: 'UAH' | 'USD' | 'EUR';
  reason?: string;
  status: 'PENDING' | 'COMPLETED' | 'failed';
  createdAt: string;
}

export const monetizationApi = api.injectEndpoints({
  endpoints: builder => ({
    // Pricing Plans
    getPricingPlans: builder.query<PricingPlan[], { productId?: string }>({
      query: ({ productId }) => ({
        url: '/monetization/pricing',
        params: { productId },
      }),
      providesTags: ['Pricing'],
    }),

    createPricingPlan: builder.mutation<PricingPlan, Partial<PricingPlan>>({
      query: data => ({
        url: '/monetization/pricing',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Pricing'],
    }),

    updatePricingPlan: builder.mutation<PricingPlan, { id: string; data: Partial<PricingPlan> }>({
      query: ({ id, data }) => ({
        url: `/monetization/pricing/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Pricing'],
    }),

    deletePricingPlan: builder.mutation<void, string>({
      query: id => ({
        url: `/monetization/pricing/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pricing'],
    }),

    // Coupons
    getCoupons: builder.query<Coupon[], { active?: boolean }>({
      query: ({ active }) => ({
        url: '/monetization/coupons',
        params: { active },
      }),
      providesTags: ['Coupon'],
    }),

    createCoupon: builder.mutation<Coupon, Partial<Coupon>>({
      query: data => ({
        url: '/monetization/coupons',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Coupon'],
    }),

    updateCoupon: builder.mutation<Coupon, { id: string; data: Partial<Coupon> }>({
      query: ({ id, data }) => ({
        url: `/monetization/coupons/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Coupon'],
    }),

    validateCoupon: builder.mutation<{ valid: boolean; discount: number }, string>({
      query: code => ({
        url: '/monetization/coupons/validate',
        method: 'POST',
        body: { code },
      }),
    }),

    deleteCoupon: builder.mutation<void, string>({
      query: id => ({
        url: `/monetization/coupons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),

    // Subscriptions
    getUserSubscriptions: builder.query<Subscription[], void>({
      query: () => '/monetization/subscriptions',
      providesTags: ['Subscription'],
    }),

    createSubscription: builder.mutation<Subscription, { planId: string; couponCode?: string }>({
      query: ({ planId, couponCode }) => ({
        url: '/monetization/subscriptions',
        method: 'POST',
        body: { planId, couponCode },
      }),
      invalidatesTags: ['Subscription', 'Transaction'],
    }),

    cancelSubscription: builder.mutation<Subscription, { id: string; immediate?: boolean }>({
      query: ({ id, immediate = false }) => ({
        url: `/monetization/subscriptions/${id}/cancel`,
        method: 'POST',
        body: { immediate },
      }),
      invalidatesTags: ['Subscription'],
    }),

    resumeSubscription: builder.mutation<Subscription, string>({
      query: id => ({
        url: `/monetization/subscriptions/${id}/resume`,
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),

    // Transactions
    getTransactions: builder.query<Transaction[], { status?: string; limit?: number }>({
      query: ({ status, limit = 50 }) => ({
        url: '/monetization/transactions',
        params: { status, limit },
      }),
      providesTags: ['Transaction'],
    }),

    createPayment: builder.mutation<
      Transaction,
      { planId: string; amount: number; currency: string; couponCode?: string }
    >({
      query: data => ({
        url: '/monetization/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Transaction'],
    }),

    // Invoices
    getInvoices: builder.query<Invoice[], { status?: string }>({
      query: ({ status }) => ({
        url: '/monetization/invoices',
        params: { status },
      }),
      providesTags: ['Invoice'],
    }),

    getInvoiceById: builder.query<Invoice, string>({
      query: id => `/monetization/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    downloadInvoice: builder.mutation<{ url: string }, string>({
      query: id => ({
        url: `/monetization/invoices/${id}/download`,
        method: 'GET',
      }),
    }),

    // Refunds
    getRefunds: builder.query<Refund[], void>({
      query: () => '/monetization/refunds',
      providesTags: ['Refund'],
    }),

    createRefund: builder.mutation<
      Refund,
      { transactionId: string; amount?: number; reason?: string }
    >({
      query: ({ transactionId, amount, reason }) => ({
        url: '/monetization/refunds',
        method: 'POST',
        body: { transactionId, amount, reason },
      }),
      invalidatesTags: ['Refund', 'Transaction'],
    }),
  }),
});

export const {
  useGetPricingPlansQuery,
  useCreatePricingPlanMutation,
  useUpdatePricingPlanMutation,
  useDeletePricingPlanMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useValidateCouponMutation,
  useDeleteCouponMutation,
  useGetUserSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useCancelSubscriptionMutation,
  useResumeSubscriptionMutation,
  useGetTransactionsQuery,
  useCreatePaymentMutation,
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useDownloadInvoiceMutation,
  useGetRefundsQuery,
  useCreateRefundMutation,
} = monetizationApi;
