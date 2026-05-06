import { create } from 'zustand'

import type { BackendPaywallPayload, PaywallTrigger } from '@/features/paywall/types'

type PaywallState = {
  isOpen: boolean
  trigger: PaywallTrigger | null
  payload: BackendPaywallPayload | null
  selectedPlanId: string | null
  paywallVariant: 'A' | 'B'
  open: (trigger: PaywallTrigger) => void
  openWithPayload: (trigger: PaywallTrigger, payload: BackendPaywallPayload) => void
  selectPlan: (planId: string) => void
  close: () => void
}

const SESSION_KEY = 'paywall:seenSession'
const LAST_SEEN_KEY = 'paywall:seen'
const VARIANT_KEY = 'paywall:variant'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function resolvePaywallVariant(): 'A' | 'B' {
  if (typeof window === 'undefined') return 'A'
  const stored = window.localStorage.getItem(VARIANT_KEY)
  if (stored === 'A' || stored === 'B') return stored
  const variant: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B'
  window.localStorage.setItem(VARIANT_KEY, variant)
  return variant
}

function canOpenPaywall() {
  if (typeof window === 'undefined') return true
  const today = getTodayKey()
  return sessionStorage.getItem(SESSION_KEY) !== today
}

function markPaywallSeen() {
  if (typeof window === 'undefined') return
  const today = getTodayKey()
  sessionStorage.setItem(SESSION_KEY, today)
  localStorage.setItem(LAST_SEEN_KEY, today)
}

export function shouldTriggerPaywallByDays(daysUsed: number) {
  return daysUsed >= 3
}

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  trigger: null,
  payload: null,
  selectedPlanId: null,
  paywallVariant: resolvePaywallVariant(),
  open: (trigger) => {
    if (!canOpenPaywall()) return
    set({ isOpen: true, trigger, payload: null, selectedPlanId: null })
  },
  openWithPayload: (trigger, payload) => {
    if (!canOpenPaywall()) return
    const defaultPlanId = payload.plans.find((plan) => plan.id === 'growth')?.id ?? payload.plans[0]?.id ?? null
    set({ isOpen: true, trigger, payload, selectedPlanId: defaultPlanId })
  },
  selectPlan: (planId) => {
    set({ selectedPlanId: planId })
  },
  close: () => {
    markPaywallSeen()
    set({ isOpen: false, trigger: null, payload: null, selectedPlanId: null })
  },
}))
