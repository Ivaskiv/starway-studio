import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { getServerUser } from '../getServerUser.js'

// Middleware: перевірка JWT, присвоєння повного AuthUser
export async function authRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await getServerUser(req)
    const header = String(req.headers.authorization ?? '')
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null
    console.log('[AUTH]', {
      token: token ? `${token.slice(0, 12)}...` : null,
      userId: user?.id ?? null,
      path: req.path,
      method: req.method,
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
