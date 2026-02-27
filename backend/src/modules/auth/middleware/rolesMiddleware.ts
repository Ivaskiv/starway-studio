import type { Request, Response, NextFunction } from 'express'
import { authRequired } from '@/modules/auth/middleware/auth.js'
import type { AuthenticatedRequest, UserRole } from '@/types/globalTypes.js'

export function roleRequired(requiredRole: UserRole) {
  return [
    authRequired,
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) return res.status(401).json({ error: 'unauthorized' })
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ error: 'forbidden', message: `Requires role ${requiredRole}` })
      }
      next()
    }
  ]
}
