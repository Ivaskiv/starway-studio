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
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export const authenticate = authRequired
