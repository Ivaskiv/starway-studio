import type { NextFunction,Response } from 'express'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { prisma } from '../../../db/client.js'
import type { AuthenticatedRequest,UserRole } from '../../../types/globalTypes.js'
import { getServerUser } from '../server-user.js'
import { verifyTelegramInitData } from '../telegram.js'

// Middleware: перевірка JWT, присвоєння повного AuthUser
export async function authRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await getServerUser(req)
    console.log('[AUTH]', {
      userId: user?.id ?? null,
      path: req.path,
      method: req.method,
      requestFingerprint: buildRequestFingerprint({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | null | undefined,
        userId: user?.id ?? null,
      }),
    })
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    req.user = user
    next()
  } catch (error) {
    // TokenExpiredError is expected — client will refresh and retry
    const isExpired = error instanceof Error && error.name === 'TokenExpiredError'
    if (!isExpired) {
      console.error('[AUTH] middleware failed', error instanceof Error ? error.stack : error)
    }
    const errorCode = isExpired ? 'token_expired' : 'invalid_token'
    return res.status(401).json({ error: errorCode })
  }
}

export const authenticate = authRequired

// Middleware for Telegram Mini App requests that pass initData in header.
// Accepts linked end-user roles and sets req.user for downstream handlers.
export function telegramWebAppAuth(allowedRoles?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sessionUser = await getServerUser(req).catch(() => null)
      if (sessionUser) {
        if (allowedRoles?.length && !allowedRoles.includes(sessionUser.role)) {
          return res.status(403).json({ error: 'forbidden_role' })
        }

        req.user = sessionUser
        return next()
      }

      const initData =
        String(req.headers['x-telegram-init-data'] ?? '').trim()
        || String(req.headers.authorization ?? '').replace(/^tma\s+/i, '').trim()

      if (!initData) {
        return res.status(401).json({ error: 'missing_init_data' })
      }

      const tokens = [
        process.env.COACH_BOT_TOKEN,
        process.env.TELEGRAM_BOT_TOKEN,
      ].filter(Boolean) as string[]

      let telegramUser: { id: string } | null = null
      for (const token of tokens) {
        try {
          telegramUser = verifyTelegramInitData(initData, token)
          break
        } catch {
          // Try next bot token.
        }
      }

      if (!telegramUser) {
        try {
          telegramUser = verifyTelegramInitData(initData)
        } catch {
          return res.status(401).json({ error: 'invalid_init_data' })
        }
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { telegramUserId: telegramUser.id },
            { telegramChatId: telegramUser.id },
          ],
        },
        select: {
          id: true,
          role: true,
          telegramUserId: true,
          lifecycleState: true,
          email: true,
          expertId: true,
          activeRole: true,
        },
      })

      if (!user) {
        return res.status(403).json({ error: 'user_not_found' })
      }

      if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'forbidden_role' })
      }

      ;(req as any).tgUser = user
      req.user = {
        id: user.id,
        role: user.role as UserRole,
        activeRole: (user.activeRole ?? user.role) as UserRole,
        email: user.email,
        expertId: user.expertId ?? null,
      }

      next()
    } catch {
      return res.status(401).json({ error: 'invalid_init_data' })
    }
  }
}

export const userTelegramWebAppAuth = telegramWebAppAuth()
