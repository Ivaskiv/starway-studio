import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetMyProductsQuery } from '@/features/products/services/products.api'
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api'
import { useMemo } from 'react'
import type { NavItemConfig, NavRole } from './navConfig'

const todayKey = () => new Date().toLocaleDateString('sv-SE')

const normalizeRole = (role?: string | null): NavRole => {
  if (!role) return 'USER'
  const value = role.toUpperCase()
  if (value === 'SUPERADMIN') return 'SUPERADMIN'
  if (value === 'ADMIN') return 'ADMIN'
  if (value === 'EXPERT' || value === 'MENTOR' || value === 'PRODUCT_OWNER') return 'EXPERT'
  return 'USER'
}

const formatTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

export function useNavAccess() {
  const { user } = useAuth()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const { state } = useSystemState()
  const currentRole = normalizeRole(state?.permissions?.role ?? user?.role)
  const hasPremium = Boolean(state?.subscription?.isActive)
  const isAuthenticated = Boolean(user?.id)
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'

  const { data: products = [] } = useGetMyProductsQuery(undefined, { skip: shouldSkipProtectedQueries || !isAuthenticated })
  const { data: upcomingZoom } = useGetUpcomingSessionQuery(undefined, { skip: shouldSkipProtectedQueries || !isAuthenticated })

  const productIndex = useMemo(
    () => new Map(products.map(product => [product.id, product] as const)),
    [products],
  )

  const primaryProductId = useMemo(
    () => state?.products.owned[0]?.id ?? state?.products.subscribed[0]?.id ?? products[0]?.id ?? '',
    [products, state?.products.owned, state?.products.subscribed],
  )

  const canSee = (item: Pick<NavItemConfig, 'roles'>) => item.roles.includes(currentRole)

  const isLocked = (item: Pick<NavItemConfig, 'requiresPremium'>) =>
    Boolean(item.requiresPremium && currentRole === 'USER' && !hasPremium)

  const getZoomSession = () => {
    if (!upcomingZoom?.scheduledAt || upcomingZoom.status !== 'SCHEDULED') return null
    if (upcomingZoom.scheduledAt.slice(0, 10) !== todayKey()) return null
    const time = formatTime(upcomingZoom.scheduledAt)
    return time ? { time } : null
  }

  const getPracticumLabel = (productId: string) => {
    if (!productId) return ''
    const product = productIndex.get(productId)
    if (!product) return ''
    const practicum = (product as any)?.practicum?.sendpulseTitle
      ?? (product as any)?.sendpulseTitle
      ?? product.title
      ?? product.name
      ?? ''
    return typeof practicum === 'string' ? practicum.trim() : ''
  }

  return {
    role: currentRole,
    hasPremium,
    primaryProductId,
    canSee,
    isLocked,
    getZoomSession,
    getPracticumLabel,
  }
}
