// backend/src/modules/auth/middleware/rolesMiddleware.ts
import type { NextFunction,Response } from 'express'
import type { AuthenticatedRequest,UserRole } from '../../../types/globalTypes.js'
import { authRequired } from './auth.js'

export function requireRole(...requiredRoles: UserRole[]) {
  const allowedRoles = requiredRoles.length > 0 ? requiredRoles : ['ADMIN']
  return [
    authRequired,
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) return res.status(401).json({ error: 'unauthorized' })
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'forbidden',
          message: `Requires role ${allowedRoles.join(' or ')}`,
        })
      }
      next()
    }
  ]
}

export function roleRequired(requiredRole: UserRole) {
  return requireRole(requiredRole)
}
