import { api } from '@/services/api'
import type { UserAccessResult } from '@/features/auth/types/auth.types'

export type TrialStatus = {
  funnelStage: string
  currentDay: number
  totalDays: number
  daysLeft: number
  onboardingDay: number
  isActive: boolean
}

export interface UserSystemState {
  accessControl: {
    accessLevel: 'GUEST' | 'LEAD' | 'CLIENT'
    currentFlow: 'lead-magnet' | 'mentor' | null
    currentStep: number
    hasLeadMagnet: boolean
    hasSubscription: boolean
    telegramId: string | null
    email: string | null
    hasRequiredContacts: boolean
    hasTelegramLinked: boolean
    telegramEnabled: boolean
  }
  products: {
    owned: Array<{ id: string; name: string; type?: string | null; status?: string | null }>
    subscribed: Array<{ id: string; name: string; status: 'trial' | 'paid' | 'locked'; expiresAt: string | null }>
    templates: Array<{
      id: string
      name: string
      result: string
      modules: string[]
      finalStateExample: string
      cta: 'TRY_7_DAYS' | 'CREATE'
    }>
  }
  aiModules: Array<{
    moduleId: string
    accessLevel: 'TRIAL' | 'PAID' | 'NONE'
    isLocked: boolean
    lockReason: 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null
  }>
  permissions: {
    role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
    canCreateProducts: boolean
    canBypassTrial: boolean
    canSeeAdminTools: boolean
  }
  trial: { isActive: boolean; daysLeft: number; endsAt: string | null }
  subscription: { isActive: boolean; status: string | null; expiresAt: string | null; currentPeriodStart: string | null }
  ui: {
    showMyProductsSection: boolean
    showCreateProductCta: boolean
    showTemplatesSection: boolean
    showAdminPanel: boolean
  }
  meta: { version: number; updatedAt: string }
}

// ✅ НОВИЙ: API endpoints
export const accessApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyAccess: builder.query<UserAccessResult, void>({
      query: () => '/access/me',
      providesTags: ['Access'],
    }),
    getMySystemState: builder.query<UserSystemState, void>({
      query: () => '/access/state',
      providesTags: ['Access', 'Products'],
    }),
    getTrialStatus: builder.query<TrialStatus, void>({
      query: () => '/trial/status',
      keepUnusedDataFor: 60,
      providesTags: ['TrialStatus'],
    }),
  }),
})

export const { useGetMyAccessQuery, useGetMySystemStateQuery, useGetTrialStatusQuery } = accessApi
