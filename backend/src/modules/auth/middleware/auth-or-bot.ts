import type { NextFunction, Response } from 'express'

import { prisma } from '../../../db/client.js'
import type { AuthenticatedRequest, AuthUser } from '../../../types/globalTypes.js'
import { verifyAccessToken } from '../auth.service.js'

const BOT_SECRET = process.env.INTERNAL_BOT_API_SECRET || process.env.TELEGRAM_BOT_TOKEN || ''

async function resolveBotUserByChatId(chatId: string): Promise<AuthUser | null> {
  const link = await prisma.telegramLink.findFirst({
    where: {
      chatId,
      isActive: true,
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          role: true,
          email: true,
        },
      },
    },
  })

  if (link?.user) {
    return {
      id: link.user.id,
      role: link.user.role,
      email: link.user.email,
    }
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramChatId: chatId },
        { telegramUserId: chatId },
      ],
    },
    select: {
      id: true,
      role: true,
      email: true,
    },
  })

  if (!user) return null

  return {
    id: user.id,
    role: user.role,
    email: user.email,
  }
}

async function resolveBotUser(req: AuthenticatedRequest): Promise<AuthUser | null> {
  const secret = String(req.headers['x-internal-bot-secret'] ?? '')
  if (!BOT_SECRET || secret !== BOT_SECRET) {
    return null
  }

  const userIdHeader = String(req.headers['x-bot-user-id'] ?? '').trim()
  if (userIdHeader) {
    const user = await prisma.user.findUnique({
      where: { id: userIdHeader },
      select: {
        id: true,
        role: true,
        email: true,
      },
    })

    if (!user) return null

    return {
      id: user.id,
      role: user.role,
      email: user.email,
    }
  }

  const chatId = String(req.headers['x-telegram-chat-id'] ?? '').trim()
  if (!chatId) {
    return null
  }

  return resolveBotUserByChatId(chatId)
}

export async function authOrBotRequired(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1]
      const decoded = verifyAccessToken(token) as AuthUser
      req.user = decoded
      return next()
    } catch {
      return res.status(401).json({ error: 'invalid_token' })
    }
  }

  const botUser = await resolveBotUser(req)
  if (!botUser) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  req.user = botUser
  return next()
}

