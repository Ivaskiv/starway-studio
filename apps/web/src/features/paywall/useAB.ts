import { useMemo } from 'react'

export type PaywallVariant = 'A' | 'B'

const STORAGE_KEY = 'paywall:variant'

function resolveVariant(): PaywallVariant {
  if (typeof window === 'undefined') return 'A'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'A' || stored === 'B') return stored
  const nextVariant: PaywallVariant = Math.random() < 0.5 ? 'A' : 'B'
  window.localStorage.setItem(STORAGE_KEY, nextVariant)
  return nextVariant
}

export function useAB() {
  return useMemo(() => resolveVariant(), [])
}
