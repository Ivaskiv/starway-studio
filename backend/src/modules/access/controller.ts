import type { Response } from 'express'
import { canAccessFeature, getUserAccess, getUserSystemState } from './service.js'
import type { AccessKey } from './types.js'
import { getAllAbilities } from '@/modules/auth/abilities.js'
import type { AuthenticatedRequest, UserRole } from '@/types/globalTypes.js'

/**
 * Шаблон fallback free-plan (UserRole)
 */
function buildFreeFallback(roleRaw?: string) {
  const normalized = String(roleRaw ?? 'USER').toUpperCase()
  const normalizedRole: UserRole =
    normalized === 'SUPERADMIN'
      ? 'SUPERADMIN'
      : normalized === 'ADMIN'
        ? 'ADMIN'
        : normalized === 'EXPERT'
          ? 'EXPERT'
          : 'USER'

  const abilities = getAllAbilities(normalizedRole === 'SUPERADMIN')

  // базові права free-plan
  abilities['dashboard.view'] = true
  abilities['profile.view'] = true
  abilities['wheel.view'] = true
  abilities['progress.view'] = true
  abilities['settings.manage'] = true

  return {
      role: normalizedRole,
    plan: 'free' as const,
    trialEnd: null,
    abilities,
    items: [
      { key: 'dashboard.view', source: 'free', expiresAt: null },
      { key: 'profile.view', source: 'free', expiresAt: null },
      { key: 'settings.manage', source: 'free', expiresAt: null },
    ],
  }
}

// ── ACCESS CONTROLLERS ─────────────────────────────────────────

export async function getMyAccess(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const result = await getUserAccess(userId)

    return res.status(200).json({
      role: result.role,
      plan: result.plan,
      trialEnd: result.trialEnd ? result.trialEnd.toISOString() : null,
      abilities: result.abilities,
      items: result.items.map(item => ({
        ...item,
        expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
      })),
    })
  } catch (err: any) {
    const fallback = buildFreeFallback(req.user?.role)
    return res.status(200).json({
      ...fallback,
      degraded: true,
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    })
  }
}

export async function checkFeatureAccess(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    const { feature } = req.params
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const result = await getUserAccess(userId)
    const hasAccess = canAccessFeature(result, feature as AccessKey)

    return res.status(200).json({
      feature,
      hasAccess,
      plan: result.plan,
      trialEnd: result.trialEnd ? result.trialEnd.toISOString() : null,
    })
  } catch {
    const fallback = buildFreeFallback(req.user?.role)
    const { feature } = req.params
    const hasAccess = Boolean(fallback.abilities[feature])
    return res.status(200).json({ feature, hasAccess, plan: 'free', trialEnd: null, degraded: true })
  }
}

export async function getMySystemState(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const state = await getUserSystemState(userId)

    return res.status(200).json({
      ...state,
      trial: { ...state.trial, endsAt: state.trial.endsAt ? state.trial.endsAt.toISOString() : null },
      subscription: { ...state.subscription, expiresAt: state.subscription.expiresAt ? state.subscription.expiresAt.toISOString() : null },
      products: {
        ...state.products,
        subscribed: state.products.subscribed.map(item => ({
          ...item,
          expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
        })),
      },
    })
  } catch (err: any) {
    const fallback = buildFreeFallback(req.user?.role)
    return res.status(200).json({
      products: { owned: [], subscribed: [], templates: [] },
      aiModules: [],
      permissions: {
        role: fallback.role,
        canCreateProducts: false,
        canBypassTrial: false,
        canSeeAdminTools: false,
      },
      trial: { isActive: false, daysLeft: 0, endsAt: null },
      subscription: { isActive: false, status: null, expiresAt: null },
      ui: {
        showMyProductsSection: false,
        showCreateProductCta: true,
        showTemplatesSection: true,
        showAdminPanel: false,
      },
      meta: { version: 1, updatedAt: new Date().toISOString() },
      degraded: true,
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    })
  }
}
