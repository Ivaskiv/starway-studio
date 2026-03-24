// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import { register, login, social, refresh, logout, getMe, updateSettings } from './auth.controller.js'
import { authRequired } from './middleware/auth.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { createTelegramBindingDeepLink } from '../deeplinks/service.js'

const router = Router()
export const telegramRouter = Router()

function isTelegramInactiveError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('bot was blocked by the user') ||
    message.includes('user is deactivated') ||
    message.includes('chat not found') ||
    message.includes('forbidden') ||
    message.includes('blocked')
  )
}

router.post('/register', register)
router.post('/login', login)
router.post('/social', social)
router.post('/refresh', refresh)
router.post('/logout', authRequired, logout)
router.get('/me', authRequired, getMe)
router.patch('/settings', authRequired, updateSettings)

router.get('/telegram-link', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const existing = await prisma.telegramLink.findFirst({ where: { userId } })
  const { link } = await createTelegramBindingDeepLink(userId)

  res.json({
    url: link,
    linked: !!existing,
  })
})

telegramRouter.get('/status', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const link = await prisma.telegramLink.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (!link) {
    return res.json({
      linked: false,
      botActive: false,
    })
  }

  if (link.isActive !== true || !link.chatId || !process.env.TELEGRAM_BOT_TOKEN) {
    return res.json({
      linked: true,
      botActive: link.isActive === true && Boolean(link.chatId) && Boolean(process.env.TELEGRAM_BOT_TOKEN),
    })
  }

  try {
    await bot.telegram.getChat(link.chatId)

    return res.json({
      linked: true,
      botActive: true,
    })
  } catch (error: unknown) {
    if (isTelegramInactiveError(error)) {
      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { isActive: false },
      })

      return res.json({
        linked: true,
        botActive: false,
      })
    }

    console.error('[telegram/status] Failed to verify telegram chat:', error)

    return res.json({
      linked: true,
      botActive: true,
    })
  }
})
export default router
