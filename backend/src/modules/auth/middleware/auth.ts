import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { getServerUser } from '../getServerUser.js'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'

// Middleware: перевірка JWT, присвоєння повного AuthUser
export async function authRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await getServerUser(req)
    console.log('[AUTH]', {
      userId: user?.id ?? null,
      path: req.path,
      method: req.method,
      requestFingerprint: buildRequestFingerprint({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | null | undefined,
        userId: user?.id ?? null,
      }),
    })
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    req.user = user
    next()
  } catch (error) {
    console.error('[AUTH] middleware failed', error instanceof Error ? error.stack : error)
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export const authenticate = authRequired
