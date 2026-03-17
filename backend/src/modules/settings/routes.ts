import { Router, type Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { authRequired } from '../auth/middleware/auth.js'

const router = Router()

/* -------------------------------------------------- */
/* GET /api/settings */
/* -------------------------------------------------- */

router.get('/', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { settings: true },
  })

  return res.json(user?.settings ?? {})
})

/* -------------------------------------------------- */
/* PUT /api/settings */
/* -------------------------------------------------- */

router.put('/', authRequired, async (req: AuthenticatedRequest, res: Response) => {

  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { settings: req.body },
    select: { settings: true },
  })

  return res.json(updated.settings)
})

export default router