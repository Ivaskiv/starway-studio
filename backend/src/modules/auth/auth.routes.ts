// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import { register, login, social, telegram, refresh, logout, getMe, updateSettings } from './auth.controller.js'
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
router.post('/telegram', telegram)
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramUserId: true,
      telegramChatId: true,
    },
  })

  const link = await prisma.telegramLink.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (!link) {
    const hasTelegramIdentity = Boolean(user?.telegramUserId || user?.telegramChatId)
    if (process.env.NODE_ENV !== 'production') {
      console.info('[telegram/status] no-link fallback', {
        userId,
        telegramUserId: user?.telegramUserId ?? null,
        telegramChatId: user?.telegramChatId ?? null,
        linked: hasTelegramIdentity,
        botActive: hasTelegramIdentity,
      })
    }
    return res.json({
      linked: hasTelegramIdentity,
      botActive: hasTelegramIdentity,
    })
  }

  if (link.isActive !== true || !link.chatId || !process.env.TELEGRAM_BOT_TOKEN) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[telegram/status] link snapshot', {
        userId,
        telegramUserId: user?.telegramUserId ?? null,
        telegramChatId: user?.telegramChatId ?? null,
        linkId: link.id,
        linkChatId: link.chatId ?? null,
        linkActive: link.isActive,
        linked: true,
        botActive: link.isActive === true && Boolean(link.chatId) && Boolean(process.env.TELEGRAM_BOT_TOKEN),
      })
    }
    return res.json({
      linked: true,
      botActive: link.isActive === true && Boolean(link.chatId) && Boolean(process.env.TELEGRAM_BOT_TOKEN),
    })
  }

  try {
    await bot.telegram.getChat(link.chatId)

    if (process.env.NODE_ENV !== 'production') {
      console.info('[telegram/status] verified chat', {
        userId,
        telegramUserId: user?.telegramUserId ?? null,
        telegramChatId: user?.telegramChatId ?? null,
        linkId: link.id,
        linkChatId: link.chatId,
        linked: true,
        botActive: true,
      })
    }

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
