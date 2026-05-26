// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import type { RequestHandler } from 'express'
import { register, login, social, telegram, refresh, logout, getMe, updateSettings } from './auth.controller.js'
import { authRequired } from './middleware/auth.js'
import type { AuthenticatedRequest, UserRole } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { getCachedUser, invalidateUserCache } from '../../lib/db/userCache.js'
import { createTelegramBindingDeepLink } from '../deeplinks/service.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { requireTelegramBotConfig } from '../telegram-mentor/runtime/botConfig.js'
import { computeAvailableRoles, isRoleAvailable } from './roleUtils.js'
import { generateAccessToken, generateRefreshToken, storeRefreshToken, resolveSafeUserById } from './auth.service.js'

const router = Router()
export const telegramRouter = Router()
const authLimiterHandler = authLimiter as unknown as RequestHandler

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

router.post('/register', authLimiterHandler, register)
router.post('/login', authLimiterHandler, login)
router.post('/social', authLimiterHandler, social)
router.post('/telegram', authLimiterHandler, telegram)
router.post('/refresh', refresh)
router.post('/logout', authRequired, logout)
router.get('/me', authRequired, getMe)
router.patch('/settings', authRequired, updateSettings)

router.post('/switch-role', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ message: 'unauthorized' })

  const requestedRole = String(req.body?.role ?? '').toUpperCase() as UserRole
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, activeRole: true, email: true },
  })
  if (!user) return res.status(404).json({ message: 'user_not_found' })

  const availableRoles = computeAvailableRoles({ role: user.role as UserRole })
  if (!isRoleAvailable(requestedRole, availableRoles)) {
    return res.status(403).json({ message: 'role_not_available', availableRoles })
  }

  await prisma.user.update({ where: { id: userId }, data: { activeRole: requestedRole } })
  await invalidateUserCache(userId)

  const safeUser = await resolveSafeUserById(userId)
  const accessToken = generateAccessToken({
    id: userId,
    role: user.role as UserRole,
    activeRole: requestedRole,
    email: user.email,
  })
  const refreshToken = generateRefreshToken(userId)
  await storeRefreshToken(userId, refreshToken)

  return res.json({ user: safeUser, accessToken, refreshToken, activeRole: requestedRole })
})

router.get('/telegram-link', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const [existing, user] = await Promise.all([
    prisma.telegramLink.findFirst({ where: { userId, isActive: true } }),
    getCachedUser(userId),
  ])
  const { link, expiresIn, expiresAt } = await createTelegramBindingDeepLink(userId)
  const linked = Boolean(existing || user?.telegramUserId || user?.telegramChatId)
  const botUsername = requireTelegramBotConfig('telegram link response').username

  res.json({
    url: link,
    linked,
    retryAvailable: linked,
    expiresIn,
    expiresAt,
    botUsername,
  })
})

telegramRouter.post('/retry-link', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const [user, existing] = await Promise.all([
    getCachedUser(userId),
    prisma.telegramLink.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  await prisma.user.update({
    where: { id: userId },
    data: { telegramEnabled: true },
  })

  await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      telegramEnabled: true,
    },
    update: {
      telegramEnabled: true,
    },
  }).catch(() => undefined)

  const { link, expiresIn, expiresAt } = await createTelegramBindingDeepLink(userId)
  const botUsername = requireTelegramBotConfig('telegram retry-link response').username

  return res.json({
    url: link,
    linked: Boolean(existing || user?.telegramUserId || user?.telegramChatId),
    retryAvailable: true,
    expiresIn,
    expiresAt,
    botUsername,
  })
})

telegramRouter.get('/status', authRequired, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  const user = await getCachedUser(userId)

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
      retryAvailable: hasTelegramIdentity,
      telegramEnabled: user?.telegramEnabled ?? true,
    })
  }

  if (link.isActive !== true || !link.chatId || !requireTelegramBotConfig('telegram status response').token) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[telegram/status] link snapshot', {
        userId,
        telegramUserId: user?.telegramUserId ?? null,
        telegramChatId: user?.telegramChatId ?? null,
        linkId: link.id,
        linkChatId: link.chatId ?? null,
        linkActive: link.isActive,
        linked: true,
        botActive: link.isActive === true && Boolean(link.chatId) && Boolean(requireTelegramBotConfig('telegram status response').token),
      })
    }
    return res.json({
      linked: true,
      botActive: link.isActive === true && Boolean(link.chatId) && Boolean(requireTelegramBotConfig('telegram status response').token),
      retryAvailable: true,
      telegramEnabled: user?.telegramEnabled ?? true,
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
      retryAvailable: true,
      telegramEnabled: user?.telegramEnabled ?? true,
    })
  } catch (error: unknown) {
    if (isTelegramInactiveError(error)) {
      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { isActive: false },
      })
      await invalidateUserCache(userId)

      return res.json({
        linked: true,
        botActive: false,
        retryAvailable: true,
        telegramEnabled: user?.telegramEnabled ?? true,
      })
    }

    console.error('[telegram/status] Failed to verify telegram chat:', error)

    return res.json({
      linked: true,
      botActive: true,
      retryAvailable: true,
      telegramEnabled: user?.telegramEnabled ?? true,
    })
  }
})
export default router
