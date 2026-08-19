import { Role } from '@starway/db/prisma-client'
import { Router,type Response } from 'express'
import { prisma } from '../../../db/client.js'
import { notificationPreferenceService } from '../../../services/notifications/services/NotificationPreferenceService.js'
import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { authRequired } from '../../auth/middleware/auth.js'
import { trackEvent } from '../../events/service.js'
import { resolveViewerScopedExpertId } from '../../experts/ownership.service.js'
import { resolveUserState } from '../../telegram-mentor/handlers/start.js'
import { expertGuard } from '../guards.js'
import { getUserInsights } from '../insights/user.service.js'

const usersRouter = Router()

usersRouter.get('/users', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const scopedExpertId =
    req.user?.role === Role.EXPERT || req.user?.role === Role.ADMIN
      ? await resolveViewerScopedExpertId({
          userId: req.user.id,
          role: req.user.role,
          expertId: req.user.expertId ?? null,
        })
      : null

  const users = await prisma.user.findMany({
    where:
      req.user?.role === Role.EXPERT || req.user?.role === Role.ADMIN
        ? { deletedAt: null, role: Role.USER, expertId: scopedExpertId ?? '__missing_expert__' }
        : { deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      expertId: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json(users)
})

usersRouter.get('/users/insights', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const rawLimit = Number(req.query.limit ?? 40)
  const limit = Number.isFinite(rawLimit) ? Math.max(10, Math.min(100, rawLimit)) : 40
  const insights = await getUserInsights({
    userId: req.user!.id,
    role: req.user!.role as 'SUPERADMIN' | 'ADMIN' | 'EXPERT',
    expertId: req.user?.expertId ?? null,
  }, limit)

  return res.json(insights)
})

usersRouter.patch('/users/:id/bot-messages', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const userId = req.params.id
  const enabled = req.body?.enabled

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled_boolean_required' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const preferences = await notificationPreferenceService.update(userId, {
    telegramEnabled: enabled,
  })

  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: enabled ? 'admin_bot_messages_enabled' : 'admin_bot_messages_disabled',
    source: 'web',
    state,
    payload: {
      targetUserId: userId,
      telegramEnabled: preferences.telegramEnabled,
    },
  })

  return res.json({
    ok: true,
    userId,
    telegramEnabled: preferences.telegramEnabled,
  })
})

export default usersRouter
