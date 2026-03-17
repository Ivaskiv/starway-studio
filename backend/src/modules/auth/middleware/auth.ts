import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest, AuthUser } from '../../../types/globalTypes.js'
import { verifyAccessToken } from '../auth.service.js'

// Middleware: перевірка JWT, присвоєння повного AuthUser
export function authRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const token = header.split(' ')[1]
    const decoded = verifyAccessToken(token) as AuthUser // ⚡ cast до повного AuthUser

    // decoded тепер містить id, role, email
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export const authenticate = authRequired
