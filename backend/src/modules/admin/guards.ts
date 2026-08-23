import { Role } from '@starway/db/prisma-client'
import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const isExpertOrAdmin = (role?: string) =>
  role === Role.EXPERT ||
  role === Role.SUPERADMIN ||
  role === Role.ADMIN

export const guard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)               { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

export const expertGuard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)                       { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isExpertOrAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

const isSuperAdmin = (role?: string) => role === Role.SUPERADMIN

export const superGuard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)                         { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isSuperAdmin(req.user.role))      { res.status(403).json({ error: 'superadmin_only' }); return true }
  return false
}
