// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import { register, login, refresh, logout, getMe, updateSettings } from './auth.controller.js'
import { authRequired } from './middleware/auth.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', authRequired, logout)
router.get('/me', authRequired, getMe)
router.patch('/settings', authRequired, updateSettings)

router.get('/telegram-link', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'Starway_byNadya_Bot'
  const { getTelegramLinkUrl } = await import('../telegram-mentor/handlers/start.js')

  const existing = await prisma.telegramLink.findFirst({ where: { userId } })

  res.json({
    url: getTelegramLinkUrl(userId, botUsername),
    linked: !!existing,
  })
})
export default router
