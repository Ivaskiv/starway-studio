import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { checkQuota } from './index.js'

export async function requireGenerationQuota(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'unauthorized' })
  const allowed = await checkQuota(userId)
  if (!allowed) {
    return res.status(429).json({ error: 'quota_exhausted', message: 'Generations exhausted for this period' })
  }
  next()
}
