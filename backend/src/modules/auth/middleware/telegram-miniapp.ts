import type { NextFunction,Response } from 'express'

import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { getServerUser } from '../server-user.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function bindVerifiedMiniAppUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isRecord(req.body) || req.body.source !== 'miniapp') {
    return next()
  }

  try {
    const user = await getServerUser(req)
    if (!user) {
      return res.status(401).json({ error: 'telegram_miniapp_auth_required' })
    }

    const requestedUserId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ error: 'telegram_miniapp_user_mismatch' })
    }

    req.user = user
    req.body = {
      ...req.body,
      userId: user.id,
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'invalid_telegram_miniapp_auth' })
  }
}
