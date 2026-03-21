// backend/src/modules/admin/routes.ts

import { Router, type Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { authRequired } from '../auth/middleware/auth.js'
import { Prisma, Role } from '@prisma/client'
import { trackEvent } from '../events/service.js'
import { invalidateQuestionSetCache } from '../telegram-mentor/session.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { runWeeklyReports } from '../daily-cycle/scheduler.js'

const router = Router()

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const guard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)               { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

const isSuperAdmin = (role?: string) => role === Role.SUPERADMIN

const superGuard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)                         { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isSuperAdmin(req.user.role))      { res.status(403).json({ error: 'superadmin_only' }); return true }
  return false
}

// ─── GET /api/admin/question-sets ────────────────────────────

router.get('/question-sets', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return
  const sets = await prisma.mentorQuestionSet.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(sets)
})

// ─── GET /api/admin/users ───────────────────────────────

router.get('/users', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
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

// ─── GET /api/admin/ownership ───────────────────────────

router.get('/ownership', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const expert = await prisma.expert.findFirst({
    include: {
      users: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      products: {
        select: { id: true, name: true },
      },
    },
  })

  const mentorConfigs = await prisma.userAIMentor.findMany({
    include: {
      user: {
        select: { id: true, email: true, firstName: true, role: true },
      },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ expert, mentorConfigs })
})

// ─── POST /api/admin/transfer-ownership ───────────────────

router.post('/transfer-ownership', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const { targetUserId, transferType } = req.body as {
    targetUserId: string
    transferType: 'EXPERT' | 'ADMIN'
  }

  if (!targetUserId || !transferType) {
    return res.status(400).json({ error: 'targetUserId and transferType required' })
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) return res.status(404).json({ error: 'user_not_found' })

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { role: transferType === 'EXPERT' ? Role.EXPERT : Role.ADMIN },
    })

    if (transferType === 'EXPERT') {
      let expertId = targetUser.expertId ?? ''
      if (!expertId) {
        const created = await tx.expert.create({
          data: {
            email: targetUser.email ?? `expert-${targetUserId}@starway.app`,
            displayName: targetUser.firstName || targetUser.lastName || targetUser.email || 'Expert',
            timezone: 'UTC',
            isActive: true,
          },
        })
        expertId = created.id
        await tx.user.update({
          where: { id: targetUserId },
          data: { expertId },
        })
      }

      if (expertId && req.user) {
        await tx.product.updateMany({
          where: { ownerId: req.user.id },
          data: { expertId },
        })
      }
    }

    const existingMentorConfig = await tx.mentorConfig.findUnique({ where: { userId: targetUserId } })
    if (!existingMentorConfig) {
      await tx.mentorConfig.create({ data: { userId: targetUserId } }).catch(() => {})
    }
  })

  const updatedUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, firstName: true, role: true },
  })

  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_transfer_ownership_completed',
    source: 'web',
    state,
    payload: {
      targetUserId,
      transferType,
      updatedRole: updatedUser?.role ?? null,
    },
  })

  return res.json({ ok: true, user: updatedUser })
})

// ─── POST /api/admin/trigger-weekly-reports ───────────────────────

router.post('/trigger-weekly-reports', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  runWeeklyReports().catch((err: unknown) => console.error('[Manual trigger]', err))
  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_weekly_reports_triggered',
    source: 'web',
    state,
    payload: {},
  })
  return res.json({ ok: true, message: 'Running in background' })
})

// ─── POST /api/admin/question-sets ───────────────────────────

router.post('/question-sets', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return

  const { name, morning, evening } = req.body as {
    name: string
    morning?: Prisma.InputJsonValue
    evening?: Prisma.InputJsonValue
  }
  if (!name) return res.status(400).json({ error: 'name_required' })

  const set = await prisma.mentorQuestionSet.create({
    data: {
      name,
      morning: morning ?? [],
      evening: evening ?? [],
      isActive: false,
    },
  })
  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_question_set_created',
    source: 'web',
    state,
    payload: {
      questionSetId: set.id,
      name: set.name,
    },
  })
  return res.status(201).json(set)
})

// ─── PUT /api/admin/question-sets/:id ────────────────────────

router.put('/question-sets/:id', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return

  const { name, morning, evening } = req.body as {
    name?: string
    morning?: Prisma.InputJsonValue | null
    evening?: Prisma.InputJsonValue | null
  }
  const existing = await prisma.mentorQuestionSet.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'not_found' })

  const normalizeJson = (value?: Prisma.InputJsonValue | null) =>
    value === undefined ? undefined : value ?? Prisma.JsonNull

  const updated = await prisma.mentorQuestionSet.update({
    where: { id: req.params.id },
    data: {
      ...(name    !== undefined && { name }),
      ...(morning !== undefined && { morning: normalizeJson(morning) }),
      ...(evening !== undefined && { evening: normalizeJson(evening) }),
    },
  })
  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_question_set_updated',
    source: 'web',
    state,
    payload: {
      questionSetId: updated.id,
      name: updated.name,
    },
  })
  return res.json(updated)
})

// ─── PUT /api/admin/question-sets/:id/activate ───────────────

router.put('/question-sets/:id/activate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return

  const existing = await prisma.mentorQuestionSet.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'not_found' })

  await prisma.$transaction([
    prisma.mentorQuestionSet.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.mentorQuestionSet.update({ where: { id: req.params.id }, data: { isActive: true } }),
  ])

  invalidateQuestionSetCache()
  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_question_set_activated',
    source: 'web',
    state,
    payload: {
      questionSetId: req.params.id,
    },
  })
  return res.json({ ok: true, id: req.params.id })
})

// ─── DELETE /api/admin/question-sets/:id ─────────────────────

router.delete('/question-sets/:id', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return

  const existing = await prisma.mentorQuestionSet.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'not_found' })

  await prisma.mentorQuestionSet.delete({ where: { id: req.params.id } })
  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_question_set_deleted',
    source: 'web',
    state,
    payload: {
      questionSetId: req.params.id,
      name: existing.name,
    },
  })
  return res.json({ ok: true })
})

export default router
