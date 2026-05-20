import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getPlatformAccess } from './platform.access.js'

export async function requirePlatformAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'unauthorized' })

  const access = await getPlatformAccess(userId).catch(() => null)
  if (!access?.canAccessPlatform) {
    return res.status(403).json({ error: 'platform_access_required', status: access?.status ?? 'BLOCKED' })
  }

  next()
}

export async function requirePaidAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'unauthorized' })

  const access = await getPlatformAccess(userId).catch(() => null)
  if (!access?.canAccessPaidModules) {
    return res.status(403).json({ error: 'paid_access_required', status: access?.status ?? 'BLOCKED' })
  }

  next()
}
