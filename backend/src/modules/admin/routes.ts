// backend/src/modules/admin/routes.ts

import { createHash } from 'node:crypto'
import { Prisma,Role } from '@starway/db/prisma-client'
import { Router,type Response } from 'express'
import { prisma } from '../../db/client.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { CanonicalGatewayAgentRegistry } from '../ai/agentRegistry.js'
import { getTelegramAgentGateway, resolveGatewayPromptRead } from '../ai/gateway/index.js'
import { authRequired } from '../auth/middleware/auth.js'
import { runWeeklyReports } from '../daily-cycle/scheduler.js'
import { trackEvent } from '../events/service.js'
import { reassignLifecycleUsersToExpert } from '../experts/ownership.service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { invalidateQuestionSetCache } from '../telegram-mentor/session.js'
import contentStudioRouter from './content-studio/routes.js'
import { expertGuard,guard,superGuard } from './guards.js'
import { analyzeCompatibilityCheck,analyzePromptImpact,buildRuntimePromptFallbackRecord,parsePromptContent,type AgentRuntimeTestRequest,type CompatibilityCheckRequest } from './prompts/analysis.service.js'
import { type PromptVerificationEvidence, validateLiveAgentActivationGate, validatePromptSaveGate } from './prompts/lifecycle.service.js'
import { runAgentPromptRegressionTest } from './prompts/regression.service.js'
import { readAdminAgent, readAdminAgentPrompt } from './prompts/read.service.js'
import { activatePromptVersion,createPromptVersion } from './prompts/version.service.js'
import usersRouter from './users/routes.js'

const router = Router()

function buildPromptHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

async function readPromptVerificationEvent(input: {
  type: 'admin_prompt_draft_test_ran' | 'admin_prompt_regression_test_ran'
  runId: string
  userId: string | null
  agentKey: string
  promptHash: string
}) {
  if (!input.userId) {
    return null
  }

  const event = await prisma.event.findFirst({
    where: {
      type: input.type,
      userId: input.userId,
      payload: {
        path: [input.type === 'admin_prompt_draft_test_ran' ? 'testRunId' : 'regressionRunId'],
        equals: input.runId,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!event || typeof event.payload !== 'object' || !event.payload || Array.isArray(event.payload)) {
    return null
  }

  const payload = event.payload as Record<string, unknown>
  return (
    payload.agentKey === input.agentKey &&
    payload.promptHash === input.promptHash &&
    payload.passed === true
  )
    ? payload
    : null
}

async function readPromptVersionVerificationEvidence(promptVersionId: string): Promise<PromptVerificationEvidence | null> {
  const event = await prisma.event.findFirst({
    where: {
      type: 'admin_prompt_version_created',
      payload: {
        path: ['promptVersionId'],
        equals: promptVersionId,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!event || typeof event.payload !== 'object' || !event.payload || Array.isArray(event.payload)) {
    return null
  }

  const verification =
    'verification' in event.payload &&
    typeof event.payload.verification === 'object' &&
    event.payload.verification &&
    !Array.isArray(event.payload.verification)
      ? event.payload.verification as Record<string, unknown>
      : null

  if (!verification) {
    return null
  }

  const validationState = verification.validationState
  const analysisState = verification.analysisState
  const testState = verification.testState
  const regressionState = verification.regressionState
  const promptHash = verification.promptHash
  const testRunId = verification.testRunId
  const regressionRunId = verification.regressionRunId

  if (
    validationState !== 'passed' ||
    analysisState !== 'passed' ||
    testState !== 'passed' ||
    regressionState !== 'passed' ||
    typeof promptHash !== 'string' ||
    typeof testRunId !== 'string' ||
    typeof regressionRunId !== 'string'
  ) {
    return null
  }

  return {
    promptHash,
    validationState,
    analysisState,
    testState,
    regressionState,
    testRunId,
    regressionRunId,
  }
}

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

router.get('/agents/:key', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const key = typeof req.params.key === 'string' ? req.params.key.trim() : ''
  if (!key) {
    return res.status(400).json({ error: 'invalid_agent_key' })
  }

  try {
    const agentRead = await readAdminAgent(key)
    if (!agentRead) {
      return res.status(404).json({
        error: 'agent_read_failed',
        detail: `Agent '${key}' is not registered for admin agent read.`,
      })
    }

    return res.json(agentRead)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'agent_read_failed'
    const statusCode = detail.includes('not registered') ? 404 : 502
    return res.status(statusCode).json({ error: 'agent_read_failed', detail })
  }
})

router.post('/agents/:key/test', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const key = typeof req.params.key === 'string' ? req.params.key.trim() : ''
  const promptContent = typeof req.body?.promptContent === 'string' ? req.body.promptContent.trim() : ''
  const testInput =
    req.body?.testInput && typeof req.body.testInput === 'object'
      ? req.body.testInput as AgentRuntimeTestRequest
      : {} as AgentRuntimeTestRequest
  const message = typeof testInput?.message === 'string' ? testInput.message.trim() : ''
  const messageType = typeof testInput?.messageType === 'string' ? testInput.messageType.trim() : null

  if (!key || !promptContent || !message) {
    return res.status(400).json({ error: 'invalid_agent_test_payload' })
  }

  try {
    const providerPolicy =
      process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER?.trim() ||
      (process.env.NODE_ENV !== 'production' ? 'configured' : null)
    if (!providerPolicy) {
      return res.status(400).json({
        testRunId: null,
        agentKey: key,
        provider: null,
        model: null,
        passed: false,
        output: null,
        errors: ['provider_policy_missing'],
      })
    }

    const gateway = getTelegramAgentGateway()
    const agentKey = key as Parameters<CanonicalGatewayAgentRegistry['getRegistrationByKey']>[0]
    const registration = new CanonicalGatewayAgentRegistry().getRegistrationByKey(agentKey)
    const testRunId = `admin:draft-agent-test:${key}:${Date.now()}`
    const activePrompt = await resolveGatewayPromptRead(registration.runtime.prompt).catch(() => null)
    const result = await gateway.executeDraftAgentTest({
      key: agentKey,
      bot: req.user?.role === Role.EXPERT ? 'coach' : 'admin',
      chatId: `admin-agent-test:${req.user?.id ?? 'unknown'}`,
      userId: req.user?.id ?? null,
      promptContent,
      message,
      messageType,
      requestId: testRunId,
    })
    const runtimeTelemetry = result.artifact.metadata?.runtimeTelemetry as
      | { provider?: unknown; model?: unknown }
      | undefined
    const payload = result.artifact.payload as Record<string, unknown>
    const provider =
      typeof runtimeTelemetry?.provider === 'string'
        ? runtimeTelemetry.provider
        : typeof payload.provider === 'string'
          ? payload.provider
          : 'unknown'
    const model =
      typeof runtimeTelemetry?.model === 'string'
        ? runtimeTelemetry.model
        : typeof payload.model === 'string'
          ? payload.model
          : 'unknown'

    console.info('[AGENT_DRAFT_TEST_TRACE]', {
      testRunId,
      agentKey: key,
      provider,
      model,
      activePromptVersion: activePrompt?.version ?? null,
      draftHash: createHash('sha256').update(promptContent).digest('hex').slice(0, 16),
      passed: true,
    })

    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'admin_prompt_draft_test_ran',
      source: 'web',
      state: 'passed',
      payload: {
        agentKey: key,
        promptId: registration.runtime.prompt,
        testRunId,
        promptHash: buildPromptHash(promptContent),
        passed: true,
        provider,
        model,
        activePromptVersion: activePrompt?.version ?? null,
      },
    })

    return res.json({
      testRunId,
      agentKey: key,
      provider,
      model,
      passed: true,
      output: result.artifact.payload,
      errors: [],
    })
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'agent_test_failed'
    const statusCode = messageText.includes('not registered') || messageText.includes('not allowed')
      ? 400
      : 502
    return res.status(statusCode).json({
      testRunId: null,
      agentKey: key,
      provider: null,
      model: null,
      passed: false,
      output: null,
      errors: [messageText],
    })
  }
})

router.post('/agents/:key/regression-test', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const key = typeof req.params.key === 'string' ? req.params.key.trim() : ''
  const promptContent = typeof req.body?.promptContent === 'string' ? req.body.promptContent.trim() : ''

  if (!key || !promptContent) {
    return res.status(400).json({ error: 'invalid_agent_regression_payload' })
  }

  try {
    const registry = new CanonicalGatewayAgentRegistry()
    const registration = registry.getRegistrationByKey(
      key as Parameters<CanonicalGatewayAgentRegistry['getRegistrationByKey']>[0],
    )
    const regressionRunId = `admin:agent-regression:${key}:${Date.now()}`
    const promptHash = buildPromptHash(promptContent)
    const activePrompt = await resolveGatewayPromptRead(registration.runtime.prompt).catch(() => null)
    const result = await runAgentPromptRegressionTest({
      agentKey: key as 'assistant' | 'content' | 'sales' | 'strategist' | 'funnel' | 'mentor' | 'coach',
      promptContent,
      promptHash,
      regressionRunId,
      gateway: getTelegramAgentGateway(),
      registry,
      bot: req.user?.role === Role.EXPERT ? 'coach' : 'admin',
      chatId: `admin-agent-regression:${req.user?.id ?? 'unknown'}`,
      userId: req.user?.id ?? null,
    })

    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'admin_prompt_regression_test_ran',
      source: 'web',
      state: result.passed ? 'passed' : 'failed',
      payload: {
        agentKey: key,
        promptId: registration.runtime.prompt,
        regressionRunId,
        promptHash,
        passed: result.passed,
        activePromptVersion: activePrompt?.version ?? null,
        provider: result.provider,
        model: result.model,
        cases: result.cases.map((item) => ({
          id: item.id,
          passed: item.passed,
          ...(item.error ? { error: item.error } : {}),
        })) as Prisma.InputJsonValue,
      },
    })

    return res.json({
      regressionRunId,
      passed: result.passed,
      cases: result.cases,
    })
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'agent_regression_test_failed'
    const statusCode = messageText.includes('not registered') || messageText.includes('unsupported')
      ? 400
      : 502
    return res.status(statusCode).json({
      regressionRunId: null,
      passed: false,
      cases: [
        {
          id: 'regression_runtime',
          passed: false,
          error: messageText,
        },
      ],
    })
  }
})

router.get('/agents/:key/prompt', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const key = typeof req.params.key === 'string' ? req.params.key.trim() : ''
  if (!key) {
    return res.status(400).json({ error: 'invalid_agent_key' })
  }

  try {
    const promptRead = await readAdminAgentPrompt(key)
    if (!promptRead) {
      return res.status(404).json({
        error: 'agent_prompt_read_failed',
        detail: `Agent '${key}' is not registered for prompt read.`,
      })
    }

    return res.json(promptRead)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'agent_prompt_read_failed'
    const statusCode = detail.includes('not registered') ? 404 : 502
    return res.status(statusCode).json({ error: 'agent_prompt_read_failed', detail })
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

  const hasActivePromptWithReadableContent = responsePrompts.some(
    (prompt) => prompt.isActive && prompt.content.trim().length > 0,
  )

  if (rawName && !hasActivePromptWithReadableContent) {
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
  const agentKey = typeof req.body.agentKey === 'string' ? req.body.agentKey.trim() : ''
  const promptId = typeof req.body.promptId === 'string' ? req.body.promptId.trim() : ''
  const validationState = typeof req.body.validationState === 'string' ? req.body.validationState.trim() : 'idle'
  const analysisState = typeof req.body.analysisState === 'string' ? req.body.analysisState.trim() : 'idle'
  const testState = typeof req.body.testState === 'string' ? req.body.testState.trim() : 'idle'
  const regressionState = typeof req.body.regressionState === 'string' ? req.body.regressionState.trim() : 'idle'
  const testRunId = typeof req.body.testRunId === 'string' ? req.body.testRunId.trim() : ''
  const regressionRunId = typeof req.body.regressionRunId === 'string' ? req.body.regressionRunId.trim() : ''
  const promptHash = buildPromptHash(content)
  const draftTestEvidence = await readPromptVerificationEvent({
    type: 'admin_prompt_draft_test_ran',
    runId: testRunId,
    userId: req.user?.id ?? null,
    agentKey,
    promptHash,
  })
  const regressionEvidence = await readPromptVerificationEvent({
    type: 'admin_prompt_regression_test_ran',
    runId: regressionRunId,
    userId: req.user?.id ?? null,
    agentKey,
    promptHash,
  })

  const saveGate = validatePromptSaveGate({
    name,
    content,
    agentKey,
    promptId,
    validationState: validationState === 'passed' ? 'passed' : validationState === 'failed' ? 'failed' : 'idle',
    analysisState: analysisState === 'passed' ? 'passed' : analysisState === 'failed' ? 'failed' : 'idle',
    testState: testState === 'passed' ? 'passed' : testState === 'failed' ? 'failed' : 'idle',
    regressionState: regressionState === 'passed' ? 'passed' : regressionState === 'failed' ? 'failed' : 'idle',
    draftTestEvidenceVerified: Boolean(draftTestEvidence),
    regressionEvidenceVerified: Boolean(regressionEvidence),
  })
  if (!saveGate.ok) return res.status(400).json({ error: saveGate.code })

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
      verification: {
        promptHash,
        validationState: validationState === 'passed' ? 'passed' : 'failed',
        analysisState: analysisState === 'passed' ? 'passed' : 'failed',
        testState: testState === 'passed' ? 'passed' : 'failed',
        regressionState: regressionState === 'passed' ? 'passed' : 'failed',
        testRunId: testRunId || null,
        regressionRunId: regressionRunId || null,
      },
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
  if (expertGuard(req, res)) return

  const targetPromptVersion = await prisma.promptVersion.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true },
  })
  if (!targetPromptVersion) return res.status(404).json({ error: 'not_found' })

  const registration = new CanonicalGatewayAgentRegistry()
    .listRegistrations()
    .find((item) => item.runtime.prompt === targetPromptVersion.name)
  if (registration) {
    const providerPolicy =
      process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER?.trim() ||
      (process.env.NODE_ENV !== 'production' ? 'configured' : null)
    const verification = await readPromptVersionVerificationEvidence(targetPromptVersion.id)
    const activationGate = validateLiveAgentActivationGate({
      runtimeRegistered: true,
      providerPolicy,
      verification,
    })
    if (!activationGate.ok) {
      return res.status(400).json({ error: activationGate.code })
    }
  }

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
