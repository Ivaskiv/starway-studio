import type { Request } from 'express'

import type { AuthUser, UserRole } from '../../types/globalTypes.js'
import { getCachedAuthUser } from '../../lib/db/userCache.js'
import { findLinkedUserId } from '../telegram-mentor/services/linking.service.js'
import { verifyAccessToken } from './auth.service.js'
import { verifyTelegramInitData } from './telegram.js'

const BOT_SECRET = process.env.INTERNAL_BOT_API_SECRET || process.env.TELEGRAM_BOT_TOKEN || ''

async function findAuthUserByUserId(userId: string): Promise<AuthUser | null> {
  const user = await getCachedAuthUser(userId)

  if (!user) return null
  return {
    id: user.id,
    role: user.role as UserRole,
    email: user.email,
    expertId: user.expertId ?? null,
  }
}

async function resolveTmaUser(initData: string): Promise<AuthUser | null> {
  const telegramUser = verifyTelegramInitData(initData)
  const linkedUserId = await findLinkedUserId({
    chatId: telegramUser.id,
    telegramUserId: telegramUser.id,
    telegramUserName: telegramUser.username,
  })

  if (!linkedUserId) return null
  return findAuthUserByUserId(linkedUserId)
}

async function resolveBotUser(req: Request): Promise<AuthUser | null> {
  const secret = String(req.headers['x-internal-bot-secret'] ?? '')
  if (!BOT_SECRET || secret !== BOT_SECRET) {
    return null
  }

  const userIdHeader = String(req.headers['x-bot-user-id'] ?? '').trim()
  if (userIdHeader) {
    return findAuthUserByUserId(userIdHeader)
  }

  const chatId = String(req.headers['x-telegram-chat-id'] ?? '').trim()
  if (!chatId) return null

  const linkedUserId = await findLinkedUserId({
    chatId,
    telegramUserId: chatId,
    telegramUserName: null,
  })

  if (!linkedUserId) return null
  return findAuthUserByUserId(linkedUserId)
}

export async function getServerUser(
  req: Request,
  options?: { allowBot?: boolean },
): Promise<AuthUser | null> {
  const header = req.headers.authorization

  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    const authUser = verifyAccessToken(token) as AuthUser
    return findAuthUserByUserId(authUser.id)
  }

  if (header?.startsWith('tma ')) {
    const initData = header.slice('tma '.length).trim()
    return resolveTmaUser(initData)
  }

  if (options?.allowBot) {
    return resolveBotUser(req)
  }

  return null
}
