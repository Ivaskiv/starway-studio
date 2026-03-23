import { Router, type Response } from 'express'
import { prisma } from '../../db/client.js'
import { Role } from '@starway/db/prisma-client'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { authRequired } from '../auth/middleware/auth.js'
import { requireUser } from '../../utils/requireUser.js'

const router = Router()

/* -------------------------------------------------- */
/* utils */
/* -------------------------------------------------- */

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const guardAdmin = (req: AuthenticatedRequest, res: Response): boolean => {

  if (!req.user) {
    res.status(401).json({ error: 'unauthorized' })
    return true
  }

  if (!isAdmin(req.user.role)) {
    res.status(403).json({ error: 'forbidden' })
    return true
  }

  return false
}

/* -------------------------------------------------- */
/* GET /api/users */
/* -------------------------------------------------- */

router.get('/', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (guardAdmin(req, res)) return

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json(users)
})

/* -------------------------------------------------- */
/* PATCH /api/users/:id/role */
/* -------------------------------------------------- */

const VALID_ROLES: Role[] = [Role.USER, Role.ADMIN, Role.MENTOR]

router.patch('/:id/role', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (guardAdmin(req, res)) return

  const { role } = req.body as { role: Role }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'invalid_role' })
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true },
  })

  return res.json({
    message: 'Role updated',
    user,
  })
})

/* -------------------------------------------------- */
/* GET /api/users/:id/settings  (ADMIN) */
/* -------------------------------------------------- */

router.get('/:id/settings', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (guardAdmin(req, res)) return

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { settings: true },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  return res.json(user.settings ?? {})
})

/* -------------------------------------------------- */
/* PUT /api/users/:id/settings  (ADMIN) */
/* -------------------------------------------------- */

router.put('/:id/settings', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (guardAdmin(req, res)) return

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { settings: req.body },
    select: { settings: true },
  })

  return res.json(updated.settings)
})

router.patch('/email', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const user = requireUser(req, res)
  if (!user) return

  const userId = user.id
  const { email } = req.body as { email?: string }

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'INVALID_EMAIL' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.id !== userId) {
    res.status(409).json({ error: 'EMAIL_TAKEN' })
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email },
  })

  res.json({ ok: true })
})

export default router
