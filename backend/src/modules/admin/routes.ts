// backend/src/modules/admin/routes.ts

import { Prisma,Role } from '@starway/db/prisma-client'
import { Router,type Response } from 'express'
import { prisma } from '../../db/client.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { CanonicalGatewayAgentRegistry } from '../ai/agentRegistry.js'
import { getTelegramAgentGateway } from '../ai/gateway/index.js'
import { authRequired } from '../auth/middleware/auth.js'
import { runWeeklyReports } from '../daily-cycle/scheduler.js'
import { trackEvent } from '../events/service.js'
import { reassignLifecycleUsersToExpert } from '../experts/ownership.service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { invalidateQuestionSetCache } from '../telegram-mentor/session.js'
import contentStudioRouter from './content-studio/routes.js'
import { expertGuard,guard,superGuard } from './guards.js'
import { analyzeCompatibilityCheck,analyzePromptImpact,buildRuntimePromptFallbackRecord,parsePromptContent,type AgentRuntimeTestRequest,type CompatibilityCheckRequest } from './prompts/analysis.service.js'
import { activatePromptVersion,createPromptVersion } from './prompts/version.service.js'
import usersRouter from './users/routes.js'

const router = Router()

router.use(contentStudioRouter)

// ─── GET /api/admin/question-sets ────────────────────────────

router.get('/question-sets', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return
  const sets = await prisma.mentorQuestionSet.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(sets)
})

// ─── GET /api/admin/users ───────────────────────────────

router.use(usersRouter)

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

  const mentorConfigs = await prisma.userAiMentor.findMany({
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

  let migrationSummary: {
    reassignedUsers: number
    updatedSubscriptions: number
    updatedPaymentLogs: number
    updatedPurchaseHistory: number
    sourceExpertId: string | null
  } | null = null
  let transferredExpertId: string | null = null

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
        transferredExpertId = expertId
      }
    }

    const existingMentorConfig = await tx.mentorConfig.findUnique({ where: { userId: targetUserId } })
    if (!existingMentorConfig) {
      await tx.mentorConfig.create({ data: { userId: targetUserId } }).catch(() => {})
    }
  })

  if (transferType === 'EXPERT' && transferredExpertId && req.user) {
    migrationSummary = await reassignLifecycleUsersToExpert({
      sourceUserId: req.user.id,
      targetExpertId: transferredExpertId,
      excludeUserId: targetUserId,
    })
  }

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
      reassignedUsers: migrationSummary?.reassignedUsers ?? 0,
      updatedSubscriptions: migrationSummary?.updatedSubscriptions ?? 0,
    },
  })

  return res.json({
    ok: true,
    user: updatedUser,
    migration: migrationSummary,
  })
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

// ─── GET /api/admin/prompts ───────────────────────────────

router.get('/agents', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const registry = new CanonicalGatewayAgentRegistry()
  return res.json({
    agents: registry.listRegistrations().map((registration) => ({
      key: registration.key,
      runtimeAgentId: registration.runtime.id,
      promptId: registration.runtime.prompt,
      capability: registration.runtime.capability,
      objective: registration.objective,
      buildInputKind: registration.buildInputKind,
      name: registration.display.name,
      icon: registration.display.icon,
      category: registration.display.category,
      description: registration.display.description,
      status: registration.display.status,
      isSystem: registration.display.isSystem,
      sourceFiles: [...registration.display.sourceFiles],
    })),
  })
})

router.post('/agents/:key/test', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const key = typeof req.params.key === 'string' ? req.params.key.trim() : ''
  const body = req.body as AgentRuntimeTestRequest
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const messageType = typeof body?.messageType === 'string' ? body.messageType.trim() : null

  if (!key || !message) {
    return res.status(400).json({ error: 'invalid_agent_test_payload' })
  }

  try {
    const gateway = getTelegramAgentGateway()
    const result = await gateway.executeTargetedAgentTest({
      key: key as Parameters<CanonicalGatewayAgentRegistry['getRegistrationByKey']>[0],
      bot: req.user?.role === Role.EXPERT ? 'coach' : 'admin',
      chatId: `admin-agent-test:${req.user?.id ?? 'unknown'}`,
      userId: req.user?.id ?? null,
      message,
      messageType,
      requestId: `admin:agent-test:${key}:${Date.now()}`,
    })

    return res.json({
      ok: true,
      result,
    })
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'agent_test_failed'
    const statusCode = messageText.includes('not registered') || messageText.includes('not allowed')
      ? 400
      : 502
    return res.status(statusCode).json({ error: 'agent_test_failed', detail: messageText })
  }
})

// ─── GET /api/admin/prompts ───────────────────────────────

router.get('/prompts', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const rawName = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  const prompts = await prisma.promptVersion.findMany({
    where: rawName ? { name: rawName } : undefined,
    orderBy: [
      { name: 'asc' },
      { version: 'desc' },
    ],
  })

  const responsePrompts: Array<{
    id: string
    name: string
    version: number
    content: string
    parsedContent: unknown
    isActive: boolean
    createdAt: Date
    source: 'db' | 'filesystem'
  }> = prompts.map((prompt) => ({
    id: prompt.id,
    name: prompt.name,
    version: prompt.version,
    content: prompt.content,
    parsedContent: parsePromptContent(prompt.content),
    isActive: prompt.isActive,
    createdAt: prompt.createdAt,
    source: 'db' as const,
  }))

  if (rawName && !responsePrompts.some((prompt) => prompt.isActive)) {
    const runtimeFallback = await buildRuntimePromptFallbackRecord(rawName).catch(() => null)
    if (runtimeFallback) {
      responsePrompts.unshift(runtimeFallback)
    }
  }

  return res.json({
    prompts: responsePrompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      version: prompt.version,
      content: prompt.content,
      parsedContent: parsePromptContent(prompt.content),
      isActive: prompt.isActive,
      createdAt: prompt.createdAt,
      source: prompt.source,
    })),
  })
})

// ─── POST /api/admin/prompts/analyze-impact ─────────────────

router.post('/prompts/analyze-impact', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  if (req.body?.type === 'compatibility_check') {
    const payload = req.body as CompatibilityCheckRequest
    if (!payload.item || !Array.isArray(payload.relatedItems) || !Array.isArray(payload.checkRules)) {
      return res.status(400).json({ error: 'invalid_compatibility_payload' })
    }

    try {
      const analysis = await analyzeCompatibilityCheck(payload, req.user?.id)
      return res.json({
        ok: true,
        ...analysis,
      })
    } catch (error) {
      console.error('[admin/prompts] compatibility check failed', {
        userId: req.user?.id ?? null,
        item: payload.item,
        error,
      })
      return res.status(502).json({ error: 'compatibility_check_failed' })
    }
  }

  const rawName = typeof req.body?.promptName === 'string' ? req.body.promptName.trim() : ''
  if (!rawName) {
    return res.status(400).json({ error: 'prompt_name_required' })
  }

  try {
    const analysis = await analyzePromptImpact(rawName)
    return res.json({
      ok: true,
      ...analysis,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'prompt_analysis_failed'
    if (message === 'prompt_not_found') {
      return res.status(404).json({ error: 'prompt_not_found' })
    }

    console.error('[admin/prompts] analyze impact failed', {
      userId: req.user?.id ?? null,
      promptName: rawName,
      error,
    })

    return res.status(502).json({ error: 'prompt_analysis_failed' })
  }
})

// ─── POST /api/admin/prompts ─────────────────────────────

router.post('/prompts', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const name = String(req.body.name ?? '').trim()
  const content = String(req.body.content ?? '').trim()
  const isActive = Boolean(req.body.isActive)

  if (!name) return res.status(400).json({ error: 'name_required' })
  if (!content) return res.status(400).json({ error: 'content_required' })

  const created = await createPromptVersion({ name, content, isActive })

  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_prompt_version_created',
    source: 'web',
    state,
    payload: {
      promptVersionId: created.id,
      name: created.name,
      version: created.version,
      isActive: created.isActive,
    },
  })

  return res.status(201).json({
    prompt: {
      id: created.id,
      name: created.name,
      version: created.version,
      content: created.content,
      parsedContent: parsePromptContent(created.content),
      isActive: created.isActive,
      createdAt: created.createdAt,
      source: 'db',
    },
  })
})

// ─── PUT /api/admin/prompts/:id/activate ─────────────────

router.put('/prompts/:id/activate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const existing = await activatePromptVersion(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not_found' })

  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_prompt_version_activated',
    source: 'web',
    state,
    payload: {
      promptVersionId: existing.id,
      name: existing.name,
      version: existing.version,
    },
  })

  return res.json({ ok: true, id: existing.id })
})

// ─── DELETE /api/admin/prompts/:id ───────────────────────

router.delete('/prompts/:id', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const existing = await prisma.promptVersion.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'not_found' })

  await prisma.promptVersion.delete({ where: { id: existing.id } })

  const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
  await trackEvent({
    userId: req.user?.id ?? null,
    type: 'admin_prompt_version_deleted',
    source: 'web',
    state,
    payload: {
      promptVersionId: existing.id,
      name: existing.name,
      version: existing.version,
    },
  })

  return res.json({ ok: true })
})

export default router
