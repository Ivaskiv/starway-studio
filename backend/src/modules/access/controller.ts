// backend/src/modules/access/controller.ts
import type { Request, Response } from 'express'
import { canAccessFeature, getUserAccess } from './service.js'
import type { AccessKey } from './types.js'
import { getAllAbilities } from '@/modules/auth/abilities.js'

function buildFreeFallback(roleRaw?: string) {
  const role = String(roleRaw || 'USER').toUpperCase()
  const normalizedRole = role === 'ADMIN' || role === 'MENTOR' ? role : 'USER'
  const abilities = getAllAbilities(normalizedRole === 'ADMIN')

  abilities['dashboard.view'] = true
  abilities['profile.view'] = true
  abilities['wheel.view'] = true
  abilities['progress.view'] = true
  abilities['settings.manage'] = true
  abilities.dashboard = true
  abilities.profile = true
  abilities.wheel = true
  abilities.progress = true
  abilities.settings = true

  return {
    role: normalizedRole,
    plan: 'free' as const,
    trialEnd: null,
    abilities,
    items: [
      { key: 'dashboard.view', source: 'free', expiresAt: null },
      { key: 'profile.view', source: 'free', expiresAt: null },
      { key: 'wheel.view', source: 'free', expiresAt: null },
      { key: 'progress.view', source: 'free', expiresAt: null },
      { key: 'settings.manage', source: 'free', expiresAt: null },
    ],
  }
}

export async function getMyAccess(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const result = await getUserAccess(userId)

    return res.status(200).json({
      role: result.role,
      plan: result.plan,
      trialEnd: result.trialEnd ? result.trialEnd.toISOString() : null,
      abilities: result.abilities,
      items: result.items.map((item) => ({
        ...item,
        expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
      })),
    })
  } catch (err: any) {
    if (err?.message === 'User not found') {
      return res.status(404).json({ error: 'user_not_found' })
    }

    // fix code_x: never fail dashboard guards on /access/me; return safe free abilities when DB schema is unstable.
    const fallback = buildFreeFallback(req.user?.role)
    return res.status(200).json({
      ...fallback,
      degraded: true,
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    })
  }
}

export async function checkFeatureAccess(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { feature } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const result = await getUserAccess(userId)
    const hasAccess = canAccessFeature(result, feature as AccessKey)

    return res.status(200).json({
      feature,
      hasAccess,
      plan: result.plan,
      trialEnd: result.trialEnd ? result.trialEnd.toISOString() : null,
    })
  } catch {
    // fix code_x: fallback feature check to free profile to avoid frontend hard-fail on transient backend issues.
    const fallback = buildFreeFallback(req.user?.role)
    const { feature } = req.params
    const hasAccess = Boolean(fallback.abilities[feature])
    return res.status(200).json({ feature, hasAccess, plan: 'free', trialEnd: null, degraded: true })
  }
}
