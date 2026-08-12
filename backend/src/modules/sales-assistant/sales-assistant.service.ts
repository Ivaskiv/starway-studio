import type { ModelGenerationResult } from '@starway/ai/types/salesAssistant.types'
import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import { prisma } from '@/db/client.js'
import { type AiBehaviorProfile } from '@/modules/ai-assistant/promptCompiler.js'
import { ProviderGenerationError } from '@/modules/ai-assistant/utils/normalizeProviderError.js'

import { DEFAULT_PROVIDER, FALLBACK_PROFILE, MAX_PROMPT_CHARS, MAX_USER_REQUEST_CHARS, PROMPT_PREVIEW_CHARS } from '@/modules/sales-assistant/sales-assistant.constants.js'
import type { SalesAssistantGenerateBody, SalesAssistantWorkspaceResponse, UpdateSalesAssistantWorkspaceBody } from '@/modules/sales-assistant/sales-assistant.types.js'
import { callProviderSafe, resolveEnabledProviders } from '@/modules/sales-assistant/sales-assistant.providers.js'
import {
  buildPromptForType,
  resolveFreeFirstRoutingMode,
  resolveProvidersForMode,
  type ContentTypeKey,
} from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import { validateOutput } from '@/modules/sales-assistant/sales-assistant.validation.js'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import { fromSalesAssistantInput, runPipeline } from '@/core/dna/index.js'
import { executeCanonicalPromptAgent } from '@/modules/ai/agentGateway.js'

// ─── re-export types ──────────────────────────────────────────────────────────
export type { SalesAssistantGenerateBody, SalesAssistantWorkspaceResponse, UpdateSalesAssistantWorkspaceBody }

const DNA_TARGET_TYPES = new Set<ContentTypeKey>(['reels', 'warmup'])
const SOCIAL_PROOF_TOPIC_PREFIX = 'weekly-proof:'
const SOCIAL_PROOF_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000

type SocialProofContextCacheValue = {
  expiresAt: number
  value: string
}

const socialProofContextCache = new Map<string, SocialProofContextCacheValue>()

function cleanupSocialProofContextCache(): void {
  const now = Date.now()
  for (const [key, entry] of socialProofContextCache.entries()) {
    if (entry.expiresAt <= now) {
      socialProofContextCache.delete(key)
    }
  }
}

function shouldUseDna(type: ContentTypeKey): boolean {
  return isDnaEnabled() && DNA_TARGET_TYPES.has(type)
}
const CONTENT_TYPE_MAP: Record<string, ContentTypeKey> = {
  REELS_SCENARIO: 'reels',
  WARMUP_1DAY: 'warmup',
  WARMUP_3DAYS: 'warmup',
  WARMUP_WEEK: 'warmup',
  WARMUP_LAUNCH: 'warmup',
  BLOG_POST: 'blog',
  BLOG_IDEAS: 'blog',
  LANDING_PAGE: 'landing',
  STORYTELLING: 'storytelling',
  TELEGRAM_MESSAGE: 'telegram_msg',
  STORIES_CHECK: 'stories',
  WEBINAR_CONTENT: 'webinar',
  WEBINAR_SALES: 'webinar',
  CONTENT_AUDIT: 'audit',
  SOCIAL_POST: 'post',
  EMAIL_SEQUENCE: 'email',
  SALES_SCRIPT: 'sales',
  CUSTOM: 'post',
}

function resolveContentTypeKey(contentType: string): ContentTypeKey {
  const key = contentType.trim()
  if ((['blog', 'landing', 'storytelling', 'telegram_msg', 'reels', 'stories', 'warmup', 'webinar', 'audit', 'post', 'email', 'sales'] as ContentTypeKey[]).includes(key as ContentTypeKey)) {
    return key as ContentTypeKey
  }
  return CONTENT_TYPE_MAP[key] ?? 'post'
}

function resolvePresetFromProtocol(selectedProtocol: string): 'SHUM' | 'ZASTRYAG' | 'BATL' | 'TAKTYKA' {
  const upper = selectedProtocol.trim().toUpperCase()
  if (upper.includes('SHUM') || upper.includes('ШУМ')) return 'SHUM'
  if (upper.includes('ZASTRYAG') || upper.includes('ЗАСТРЯГ')) return 'ZASTRYAG'
  if (upper.includes('BATL') || upper.includes('БАТЛ')) return 'BATL'
  return 'TAKTYKA'
}

function isDnaEnabled(): boolean {
  return process.env.DNA_ORCHESTRATOR_ENABLED === 'true'
}

function compactText(value: string, maxLength = 220): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

async function loadWeeklySocialProofContext(userId: string): Promise<string> {
  const cacheKey = `social-proof:${userId}`
  cleanupSocialProofContextCache()
  const cached = socialProofContextCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const items = await prisma.contentItem.findMany({
    where: {
      userId,
      status: 'approved',
      topic: { startsWith: SOCIAL_PROOF_TOPIC_PREFIX },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      type: true,
      topic: true,
      platform: true,
      content: true,
      createdAt: true,
    },
  }).catch(() => [])

  if (!items.length) return ''

  const lines = items.map((item, index) => {
    const title = (item.topic ?? '').replace(SOCIAL_PROOF_TOPIC_PREFIX, '')
    const content = compactText(item.content, 520)
    return [
      `${index + 1}. ${item.type} | ${title} | ${item.platform ?? 'internal'}`,
      content,
    ].join('\n')
  })

  const value = [
    'SOCIAL_PROOF_CONTEXT:',
    'Use these approved weekly proof artifacts as source material for hooks, reels, stories, transformation angles, and proof-led CTAs.',
    ...lines,
  ].join('\n')

  socialProofContextCache.set(cacheKey, {
    expiresAt: Date.now() + SOCIAL_PROOF_CONTEXT_CACHE_TTL_MS,
    value,
  })

  return value
}

async function enrichSalesAssistantContext(userId: string, body: SalesAssistantGenerateBody): Promise<SalesAssistantGenerateBody> {
  const socialProofContext = await loadWeeklySocialProofContext(userId)
  if (!socialProofContext) return body

  const mergedUserContext = [body.userContext, socialProofContext].filter((value) => value.trim()).join('\n\n')
  return {
    ...body,
    userContext: mergedUserContext,
  }
}

// ─── workspace ───────────────────────────────────────────────────────────────
export async function getWorkspace(userId: string): Promise<SalesAssistantWorkspaceResponse | null> {
  return prisma.userAiWorkspace.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true, isActive: true, allowedModels: true,
      maxTokensPerMonth: true, usedTokensThisMonth: true,
      activeProfile: {
        select: { id: true, key: true, name: true, description: true, supportedOutputs: true, supportedProtocols: true },
      },
    },
  })
}

async function generateContentLegacy(
  workspaceId: string | null,
  body: SalesAssistantGenerateBody,
  aiProfile: AiBehaviorProfile | null,
  requestUserId = '',
) {
  const startedAt = Date.now()

  const dbProfile = aiProfile ?? await prisma.aiBehaviorProfile.findFirst({ where: { key: 'STARWAY_OGOLENA_PRAVDA' } })
  const profile = dbProfile ?? FALLBACK_PROFILE

  console.log('[DNA][service][LEGACY_START]', {
    workspaceId,
    requestUserId,
    contentType: body.contentType,
    selectedProtocol: body.selectedProtocol,
    providers: body.providers ?? body.provider ?? DEFAULT_PROVIDER,
    hasProfile: Boolean(aiProfile),
    profileKey: profile.key,
  })

  const strategyTier = resolveModelStrategyTier(body.selectedProtocol)
  const safeUserRequest = body.userRequest.length > MAX_USER_REQUEST_CHARS ? body.userRequest.slice(0, MAX_USER_REQUEST_CHARS) : body.userRequest

  const routingMode = resolveFreeFirstRoutingMode(body.selectedProtocol)
  const requestedProviders = body.providers ?? resolveProvidersForMode(routingMode)
  const enabledProviders = resolveEnabledProviders(requestedProviders, body)

  console.log('[DNA][service][LEGACY] parallel call', { providers: enabledProviders, strategyTier, routingMode })

  const resolvedType = resolveContentTypeKey(body.contentType)

  const promptPair = buildPromptForType(resolvedType, {
    selectedProtocol: body.selectedProtocol,
    tone: body.tone,
    selectedOutputs: body.selectedOutputs,
    userContext: body.userContext,
    userRequest: safeUserRequest,
  })

  if (resolvedType === 'sales') {
    const canonicalResult = await executeCanonicalPromptAgent({
      agentKey: 'sales',
      systemPrompt: promptPair.system,
      userPrompt: promptPair.user,
      strategyTier,
      contentType: body.contentType,
      preferredProvider: enabledProviders[0],
      userId: requestUserId || null,
      taskDescription: `Generate ${body.contentType} sales assistant content.`,
      objective: `Return one ${body.contentType} artifact for the sales assistant request.`,
      contextSummary: body.userContext,
      taskMetadata: {
        selectedProtocol: body.selectedProtocol,
        selectedOutputs: body.selectedOutputs,
      },
    })

    const tokenUsage = canonicalResult.metadata?.providerResponse as
      | {
          provider?: unknown
          model?: unknown
          tokenUsage?: {
            inputTokens?: unknown
            outputTokens?: unknown
            totalTokens?: unknown
          }
        }
      | undefined
    const provider = typeof tokenUsage?.provider === 'string' ? tokenUsage.provider : 'unknown'
    const model = typeof tokenUsage?.model === 'string' ? tokenUsage.model : provider
    const modelKey =
      enabledProviders[0] ??
      (provider === 'anthropic'
        ? 'claude'
        : provider === 'gemini'
          ? 'gemini'
          : 'gpt')
    const usage = tokenUsage?.tokenUsage
    const totalTokens =
      typeof usage?.totalTokens === 'number' && Number.isFinite(usage.totalTokens)
        ? usage.totalTokens
        : 0
    const inputTokens =
      typeof usage?.inputTokens === 'number' && Number.isFinite(usage.inputTokens)
        ? usage.inputTokens
        : 0
    const outputTokens =
      typeof usage?.outputTokens === 'number' && Number.isFinite(usage.outputTokens)
        ? usage.outputTokens
        : 0
    const firstSuccess: ModelGenerationResult = {
      modelKey,
      content: canonicalResult.content,
      usage: {
        provider,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: 0,
        actualCostUsd: null,
        costTier: 'low',
      },
      error: null,
      durationMs: 0,
    }
    const validation = await validateOutput(firstSuccess.content!, profile.key)

    let generationId: string | undefined
    if (workspaceId) {
      try {
        const gen = await prisma.salesAssistantGeneration.create({
          data: {
            workspaceId,
            contentType: body.contentType,
            modelUsed: firstSuccess.modelKey,
            protocol: body.selectedProtocol,
            userContext: body.userContext,
            request: body.userRequest,
            result: firstSuccess.content!,
            tokensUsed: firstSuccess.usage?.totalTokens ?? 0,
          },
        })
        generationId = gen.id

        await prisma.userAiWorkspace.update({
          where: { id: workspaceId },
          data: { usedTokensThisMonth: { increment: firstSuccess.usage?.totalTokens ?? 0 } },
        })
      } catch (dbError) {
        console.error('[DNA][service][LEGACY] DB persist failed', dbError)
      }
    }

    return {
      id: generationId,
      content: firstSuccess.content!,
      modelUsed: firstSuccess.modelKey,
      contentType: body.contentType,
      protocol: body.selectedProtocol,
      tokensUsed: firstSuccess.usage?.totalTokens ?? 0,
      usage: firstSuccess.usage ?? undefined,
      createdAt: new Date().toISOString(),
      validationWarning: validation.valid ? undefined : validation.reason,
      multiModelResults: [firstSuccess],
      dnaDebug: {
        pipeline: 'legacy',
        preset: null,
        provider: firstSuccess.modelKey,
        fallbackTriggered: false,
        generationType: resolveContentTypeKey(body.contentType),
      },
    }
  }

  let prompt = `${promptPair.system}\n\n${promptPair.user}`
  if (prompt.length > MAX_PROMPT_CHARS) prompt = prompt.slice(0, MAX_PROMPT_CHARS)

  const executeForProviders = async (providers: ModelProvider[]): Promise<ModelGenerationResult[]> => {
    const settled = await Promise.allSettled(
      providers.map((provider) =>
        callProviderSafe(provider, prompt, promptPair.user, { contentType: body.contentType, strategyTier }),
      ),
    )
    return settled.map((item, index) => {
      if (item.status === 'fulfilled') return item.value
      return {
        modelKey: providers[index],
        content: null,
        usage: null,
        error: {
          status: 503,
          code: 'PROVIDER_SETTLED_REJECTED',
          message: item.reason instanceof Error ? item.reason.message : 'Provider failed',
          isFatal: false,
        },
        durationMs: 0,
      }
    })
  }

  console.log('[DNA][service][LEGACY_PROMPT]', {
    promptLength: prompt.length,
    preview: prompt.slice(0, PROMPT_PREVIEW_CHARS),
  })

  let parallelResults: ModelGenerationResult[] = []
  // OpenAI і Gemini тимчасово вимкнені — тільки Claude
  // if (routingMode === 'FAST') {
  //   parallelResults = await executeForProviders(['gemini'])
  // } else if (routingMode === 'BALANCED') {
  //   const gptResults = await executeForProviders(['gpt'])
  //   const gptContent = gptResults[0]?.content ?? ''
  //   const geminiValidationPrompt = `${promptPair.system}\n\nПеревір чи JSON валідний і відповідає schema. Відповідь JSON: {"valid": boolean, "reason": "string"}`
  //   const geminiValidationUser = `${promptPair.user}\n\nGenerated JSON:\n${gptContent}`
  //   const geminiValidation = await callProviderSafe('gemini', geminiValidationPrompt, geminiValidationUser, {
  //     contentType: body.contentType,
  //     strategyTier,
  //   })
  //   parallelResults = [...gptResults, geminiValidation]
  // } else {
  //   parallelResults = await executeForProviders(['claude', 'gpt', 'gemini'])
  // }
  parallelResults = await executeForProviders(['claude'])

  // OpenAI і Gemini тимчасово вимкнені — тільки Claude
  // const preferredOrder = routingMode === 'PREMIUM' ? ['claude', 'gpt', 'gemini'] : routingMode === 'BALANCED' ? ['gpt', 'gemini'] : ['gemini']
  const preferredOrder = ['claude']
  const firstSuccess = preferredOrder
    .map((provider) => parallelResults.find((r) => r.modelKey === provider && r.content !== null))
    .find(Boolean) ?? parallelResults.find((r) => r.content !== null)

  if (!firstSuccess) {
    throw new ProviderGenerationError({
      status: 503,
      code: 'ALL_PROVIDERS_DOWN',
      message: 'Всі провайдери недоступні. Перевір API ключі та баланс.',
      provider: 'all',
      retryAfter: 300,
    })
  }

  const validation = await validateOutput(firstSuccess.content!, profile.key)
  if (!validation.valid) console.warn('[DNA][validation] failed', { reason: validation.reason })

  let generationId: string | undefined
  if (workspaceId) {
    try {
      const gen = await prisma.salesAssistantGeneration.create({
        data: {
          workspaceId,
          contentType: body.contentType,
          modelUsed: firstSuccess.modelKey,
          protocol: body.selectedProtocol,
          userContext: body.userContext,
          request: body.userRequest,
          result: firstSuccess.content!,
          tokensUsed: firstSuccess.usage?.totalTokens ?? 0,
        },
      })
      generationId = gen.id

      await prisma.userAiWorkspace.update({
        where: { id: workspaceId },
        data: { usedTokensThisMonth: { increment: firstSuccess.usage?.totalTokens ?? 0 } },
      })
    } catch (dbError) {
      console.error('[DNA][service][LEGACY] DB persist failed', dbError)
    }
  }

  console.log('[DNA][service][LEGACY_DONE]', {
    provider: firstSuccess.modelKey,
    contentType: body.contentType,
    resultLength: firstSuccess.content!.length,
    durationMs: Date.now() - startedAt,
    successCount: parallelResults.filter((r) => r.content !== null).length,
    errorCount: parallelResults.filter((r) => r.error !== null).length,
  })

  return {
    id: generationId,
    content: firstSuccess.content!,
    modelUsed: firstSuccess.modelKey,
    contentType: body.contentType,
    protocol: body.selectedProtocol,
    tokensUsed: firstSuccess.usage?.totalTokens ?? 0,
    usage: firstSuccess.usage ?? undefined,
    createdAt: new Date().toISOString(),
    validationWarning: validation.valid ? undefined : validation.reason,
    multiModelResults: parallelResults,
    dnaDebug: {
      pipeline: 'legacy',
      preset: null,
      provider: firstSuccess.modelKey,
      fallbackTriggered: false,
      generationType: resolveContentTypeKey(body.contentType),
    },
  }
}

async function generateContentWithDna(
  workspaceId: string | null,
  body: SalesAssistantGenerateBody,
  aiProfile: AiBehaviorProfile | null,
  requestUserId = '',
) {
  const startedAt = Date.now()
  const resolvedType = resolveContentTypeKey(body.contentType)
  const preset = resolvePresetFromProtocol(body.selectedProtocol)

  console.log('[DNA][service][ORCH_START]', {
    workspaceId,
    requestUserId,
    type: resolvedType,
    preset,
    protocol: body.selectedProtocol,
  })

  const pipelineInput = fromSalesAssistantInput({
    userId: requestUserId,
    workspaceId,
    body: {
      ...body,
      contentType: resolvedType,
    },
    channel: 'web',
  })
  pipelineInput.preset = preset

  const pipelineResult = await runPipeline(pipelineInput)
const primaryArtifact =
  pipelineResult.artifacts.find(
    (artifact) =>
      artifact.type === resolvedType &&
      artifact.rawText?.trim()
  ) ?? pipelineResult.artifacts.find(
    (artifact) => artifact.rawText?.trim()
  )

if (!primaryArtifact) {
  throw new Error('DNA_PIPELINE_EMPTY_ARTIFACT')
}

if (!primaryArtifact.rawText?.trim()) {
  throw new Error('DNA_EMPTY_CONTENT')
}

  const dbProfile = aiProfile ?? await prisma.aiBehaviorProfile.findFirst({ where: { key: 'STARWAY_OGOLENA_PRAVDA' } })
  const profile = dbProfile ?? FALLBACK_PROFILE
  const validation = await validateOutput(primaryArtifact.rawText, profile.key)

  const firstUsageEvent = pipelineResult.telemetry.find((event) => (event.tokens ?? 0) > 0)
  const tokensUsed = firstUsageEvent?.tokens ?? 0

  const modelResult: ModelGenerationResult = {
    modelKey: primaryArtifact.provider,
    content: primaryArtifact.rawText,
    usage: {
      provider: primaryArtifact.provider,
      model: primaryArtifact.provider,
      inputTokens: tokensUsed > 0 ? Math.max(1, Math.floor(tokensUsed * 0.45)) : 0,
      outputTokens: tokensUsed > 0 ? Math.max(1, Math.floor(tokensUsed * 0.55)) : 0,
      totalTokens: tokensUsed,
      estimatedCostUsd: firstUsageEvent?.estimatedCostUsd ?? 0,
      actualCostUsd: Number(firstUsageEvent?.details?.actualCostUsd ?? 0) || null,
      costTier: 'low',
    },
    error: null,
    durationMs: Date.now() - startedAt,
  }

  console.log('[DNA][service][ORCH_DONE]', {
    runId: pipelineResult.runId,
    type: resolvedType,
    provider: primaryArtifact.provider,
    preset,
    artifacts: pipelineResult.artifacts.length,
    durationMs: Date.now() - startedAt,
    tokens: tokensUsed,
  })

  return {
    id: pipelineResult.runId,
    content: primaryArtifact.rawText,
    modelUsed: primaryArtifact.provider,
    contentType: body.contentType,
    protocol: body.selectedProtocol,
    tokensUsed,
    usage: modelResult.usage ?? undefined,
    createdAt: new Date().toISOString(),
    validationWarning: validation.valid ? undefined : validation.reason,
    multiModelResults: [modelResult],
    dnaArtifacts: pipelineResult.artifacts,
    dnaTelemetry: pipelineResult.telemetry,
    dnaDebug: {
      pipeline: 'dna',
      preset,
      provider: primaryArtifact.provider,
      fallbackTriggered: false,
      generationType: resolvedType,
      runId: pipelineResult.runId,
      status: pipelineResult.status,
    },
  }
}

// ─── main generate ────────────────────────────────────────────────────────────
export async function generateContent(
  workspaceId: string | null,
  body: SalesAssistantGenerateBody,
  aiProfile: AiBehaviorProfile | null,
  requestUserId = '',
) {
  const enrichedBody = await enrichSalesAssistantContext(requestUserId, body)
  const resolvedType = resolveContentTypeKey(body.contentType)
const dnaActive = shouldUseDna(resolvedType)
  if (!dnaActive) {
    return generateContentLegacy(workspaceId, enrichedBody, aiProfile, requestUserId)
  }

  try {
    return await generateContentWithDna(workspaceId, enrichedBody, aiProfile, requestUserId)
  } catch (error) {
    console.error('[DNA][service][ORCH_FAIL_FALLBACK]', {
      contentType: body.contentType,
      resolvedType,
      error: error instanceof Error ? error.message : String(error),
      fallback: 'legacy',
    })

    const legacy = await generateContentLegacy(workspaceId, enrichedBody, aiProfile, requestUserId)
    return {
      ...legacy,
      dnaDebug: {
        ...(legacy as { dnaDebug?: Record<string, unknown> }).dnaDebug,
        pipeline: 'legacy',
        fallbackTriggered: true,
        fallbackReason: error instanceof Error ? error.message : String(error),
        generationType: resolvedType,
      },
    }
  }
}
