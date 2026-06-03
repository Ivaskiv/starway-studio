import { randomUUID } from 'node:crypto'
import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import {
  AGENTS_REGISTRY,
  AgentType,
  type AgentTone,
  type GenerationMode,
  type ProtocolMode,
} from '@/modules/sales-assistant/agents/agents.registry.js'
import { buildPrompt } from '@/modules/sales-assistant/agents/prompt.builder.js'
import { callProviderSafe } from '@/modules/sales-assistant/sales-assistant.providers.js'
import { generationQueueStore } from '@/modules/sales-assistant/pipeline/generation-queue.store.js'
import type {
  GenerationContentType,
  GenerationJob,
  GenerationPipelineInput,
  GenerationSession,
  ProviderFailureClass,
  ProviderStatus,
} from '@/modules/sales-assistant/pipeline/generation-queue.types.js'
import { providerHealthService } from '@/modules/sales-assistant/pipeline/provider-health.service.js'
import type { ProviderFeature, ProviderKey } from '@/modules/sales-assistant/pipeline/provider-lifecycle.types.js'
import { featureAccessService } from '@/modules/sales-assistant/pipeline/feature-access.service.js'
import { saasAgentsService } from '@/modules/sales-assistant/agents/saas-agents.service.js'
import { selfLearningService } from '@/modules/sales-assistant/orchestrator/self-learning.service.js'

const AGENT_CONTENT_TYPES: Record<AgentType, GenerationContentType[]> = {
  [AgentType.VOICE]: ['blog', 'story'],
  [AgentType.CTA]: ['telegram', 'cta', 'banner'],
  [AgentType.LANDING]: ['landing', 'banner'],
  [AgentType.REELS]: ['reels', 'story'],
  [AgentType.STORYTELLING]: ['story', 'email'],
  [AgentType.WARMUP]: ['warmup', 'telegram', 'email'],
}

const CONTENT_TO_ARTIFACT: Record<GenerationContentType, string> = {
  blog: 'hooks',
  reels: 'reels',
  story: 'stories',
  telegram: 'telegram',
  banner: 'banners',
  landing: 'landing',
  warmup: 'banners',
  cta: 'telegram',
  email: 'telegram',
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timeout_${timeoutMs}ms`)), timeoutMs)
    promise.then((value) => {
      clearTimeout(timeout)
      resolve(value)
    }).catch((error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

function safeNormalize(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return { type: 'empty', text: '' }
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/```json\s*([\s\S]*?)```/i)
    if (match?.[1]) {
      try {
        return JSON.parse(match[1])
      } catch {
        return { type: 'text', text: trimmed }
      }
    }
    return { type: 'text', text: trimmed }
  }
}

function mapModelToProvider(model: 'claude' | 'gpt' | 'gemini'): ModelProvider {
  // OpenAI і Gemini тимчасово вимкнені — усе мапимо на Claude
  // if (model === 'claude') return 'claude'
  // if (model === 'gemini') return 'gemini'
  // return 'gpt'
  return 'claude'
}

function mapContentTypeToFeature(type: GenerationContentType): ProviderFeature {
  if (type === 'reels') return 'text'
  return 'text'
}

export class GenerationPipelineService {
  async execute(input: GenerationPipelineInput): Promise<{
    session: GenerationSession
    jobs: GenerationJob[]
    results: Array<{
      agent: AgentType
      status: 'fulfilled' | 'rejected'
      result: string | null
      error: string | null
      model: 'claude' | 'gpt' | 'gemini'
      durationMs: number
      contentType: GenerationContentType
      jobId: string
      degraded?: boolean
    }>
    providerStatuses: ProviderStatus[]
    gatingDecision?: {
      allowed: boolean
      reason?: string
      message?: string
      upgradeCta?: string
      fallbackOption?: string
      availableProviders: Array<'gpt' | 'claude' | 'gemini' | 'runway'>
    }
  }> {
    const protocol: ProtocolMode = input.protocol ?? 'raw_truth'
    const tone: AgentTone = input.tone ?? 'clear'
    const generationMode: GenerationMode = input.generationMode ?? 'BALANCED'

    console.log('[DNA][pipeline] strategy:start', {
      userId: input.userId,
      selectedAgents: input.selectedAgents,
      protocol,
      tone,
      generationMode,
    })

    const derivatives = this.buildDerivatives(input.selectedAgents)
    console.log('[DNA][pipeline] derivatives:built', {
      count: derivatives.length,
      derivatives,
    })

    const sessionId = randomUUID()
    const nowIso = new Date().toISOString()
    const session: GenerationSession = {
      id: sessionId,
      userId: input.userId,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      protocol,
      tone,
      generationMode,
      preset: input.selectedPreset,
      sharedContext: input.sharedContext,
      totalJobs: derivatives.length,
      completedJobs: 0,
      failedJobs: 0,
    }
    generationQueueStore.createSession(session)

    const costAllowed = await saasAgentsService.checkCostControl(input.userId)
    if (!costAllowed) {
      return {
        session: generationQueueStore.getSession(sessionId) ?? session,
        jobs: [],
        results: [],
        providerStatuses: [],
        gatingDecision: {
          allowed: false,
          reason: 'provider_unavailable',
          message: 'ERR_COST_LIMIT_EXCEEDED: spike blocked by cost-control agent',
          upgradeCta: 'Wait and retry',
          fallbackOption: 'Retry in 30 seconds',
          availableProviders: [],
        },
      }
    }

    const marginOk = await saasAgentsService.checkTokenMargin(
      input.userId,
      derivatives.length * 500
    )
    const gatedDerivatives = marginOk ? derivatives : derivatives.slice(0, 1)

    const preferredProvider = mapModelToProvider(
      AGENTS_REGISTRY[gatedDerivatives[0]?.agent ?? AgentType.REELS].model
    ) as ProviderKey
    const preflight = featureAccessService.validate({
      tier: input.accessTier ?? 'free',
      requestedContentTypes: gatedDerivatives.map((item) => item.contentType),
      preferredProvider,
    })
    if (!preflight.allowed) {
      generationQueueStore.updateSession(sessionId, {
        status: 'failed',
        completedJobs: 0,
        failedJobs: 0,
      })
      return {
        session: generationQueueStore.getSession(sessionId) ?? session,
        jobs: [],
        results: [],
        providerStatuses: providerHealthService
          .getStates()
          .map((state) => ({
            provider: state.provider === 'runway' ? 'gemini' : state.provider,
            available: state.state === 'ACTIVE' || state.state === 'DEGRADED',
            status: state.state,
            message: state.lastError ?? undefined,
          }))
          .filter(
            (status, index, self) =>
              status.provider !== 'gemini' ||
              self.findIndex((x) => x.provider === status.provider) === index
          ),
        gatingDecision: preflight,
      }
    }

    const blockedDerivatives = gatedDerivatives.filter((derivative) => {
      const primary = mapModelToProvider(AGENTS_REGISTRY[derivative.agent].model) as ProviderKey
      const feature = mapContentTypeToFeature(derivative.contentType)
      const candidates = providerHealthService.resolveCandidates(primary, feature)
      return candidates.length === 0
    })
    if (blockedDerivatives.length > 0) {
      const blockedJobs = blockedDerivatives.map((derivative): GenerationJob => ({
        id: randomUUID(),
        sessionId,
        userId: input.userId,
        agent: derivative.agent,
        contentType: derivative.contentType,
        status: 'failed',
        attempt: 0,
        maxAttempts: 0,
        timeoutMs: 0,
        createdAt: new Date().toISOString(),
        error: 'feature_not_supported_or_provider_unavailable',
        failureClass: 'FEATURE_NOT_SUPPORTED',
        blockedPremium: true,
        paused: true,
      }))
      generationQueueStore.addJobs(sessionId, blockedJobs)
      generationQueueStore.updateSession(sessionId, {
        status: 'failed',
        completedJobs: 0,
        failedJobs: blockedJobs.length,
      })
      return {
        session: generationQueueStore.getSession(sessionId) ?? session,
        jobs: generationQueueStore.getJobs(sessionId),
        results: [],
        providerStatuses: providerHealthService.getStates().map((state) => ({
          provider: state.provider === 'runway' ? 'gemini' : state.provider,
          available: state.state === 'ACTIVE' || state.state === 'DEGRADED',
          status: state.state,
          message: state.lastError ?? undefined,
        })).filter((status, index, self) => status.provider !== 'gemini' || self.findIndex((x) => x.provider === status.provider) === index),
        gatingDecision: {
          allowed: false,
          reason: 'provider_unavailable',
          message: 'No capable provider available for requested feature.',
          upgradeCta: 'Upgrade plan',
          fallbackOption: 'Switch provider and retry',
          availableProviders: [],
        },
      }
    }

    const jobs = gatedDerivatives.map((derivative): GenerationJob => ({
      id: randomUUID(),
      sessionId,
      userId: input.userId,
      agent: derivative.agent,
      contentType: derivative.contentType,
      status: 'pending',
      attempt: 0,
      maxAttempts: 2,
      timeoutMs: 45000,
      createdAt: new Date().toISOString(),
    }))
    generationQueueStore.addJobs(sessionId, jobs)
    console.log('[DNA][pipeline] content_jobs:queued', {
      sessionId,
      totalJobs: jobs.length,
      jobTypes: jobs.map((j) => j.contentType),
    })

    generationQueueStore.updateSession(sessionId, { status: 'processing' })

    const providerStatuses = new Map<'claude', ProviderStatus>()
    const ensureProvider = (provider: 'claude') => {
      if (!providerStatuses.has(provider)) {
        const health = providerHealthService.getState(provider)
        providerStatuses.set(provider, {
          provider,
          available: health.state === 'ACTIVE' || health.state === 'DEGRADED',
          status: health.state,
          message: health.lastError ?? undefined,
        })
      }
    }
    ;(['claude'] as const).forEach(ensureProvider)
    const settled = await Promise.allSettled(jobs.map((job) => this.executeJob(job, input, providerStatuses)))

    const refreshedJobs = generationQueueStore.getJobs(sessionId)
    const completedJobs = refreshedJobs.filter((job) => job.status === 'completed').length
    const failedJobs = refreshedJobs.filter((job) => job.status === 'failed').length
    generationQueueStore.updateSession(sessionId, {
      status: failedJobs > 0 && completedJobs > 0 ? 'completed' : failedJobs > 0 ? 'failed' : 'completed',
      completedJobs,
      failedJobs,
    })

    const results = settled.map((item, index) => {
      const sourceJob = jobs[index]
      const cfg = AGENTS_REGISTRY[sourceJob.agent]
      if (item.status === 'fulfilled') {
        return {
          agent: sourceJob.agent,
          status: 'fulfilled' as const,
          result: item.value.result,
          error: null,
          model: cfg.model,
          durationMs: item.value.durationMs,
          contentType: sourceJob.contentType,
          jobId: sourceJob.id,
          degraded: item.value.degraded,
        }
      }
      return {
        agent: sourceJob.agent,
        status: 'rejected' as const,
        result: null,
        error: item.reason instanceof Error ? item.reason.message : String(item.reason),
        model: cfg.model,
        durationMs: 0,
        contentType: sourceJob.contentType,
        jobId: sourceJob.id,
      }
    })

    console.log('[DNA][pipeline] renderer:ready', {
      sessionId,
      completedJobs,
      failedJobs,
      partialSuccess: completedJobs > 0 && failedJobs > 0,
    })

    return {
      session: generationQueueStore.getSession(sessionId) ?? session,
      jobs: generationQueueStore.getJobs(sessionId),
      results,
      providerStatuses: Array.from(providerStatuses.values()),
    }
  }

  getSessionWithJobs(sessionId: string): { session: GenerationSession | null; jobs: GenerationJob[] } {
    return {
      session: generationQueueStore.getSession(sessionId),
      jobs: generationQueueStore.getJobs(sessionId),
    }
  }

  private buildDerivatives(selectedAgents: AgentType[]): Array<{ agent: AgentType; contentType: GenerationContentType }> {
    const derivatives: Array<{ agent: AgentType; contentType: GenerationContentType }> = []
    const seen = new Set<string>()
    for (const agent of selectedAgents) {
      const types = AGENT_CONTENT_TYPES[agent] ?? []
      for (const contentType of types) {
        const key = `${agent}:${contentType}`
        if (seen.has(key)) continue
        seen.add(key)
        derivatives.push({ agent, contentType })
      }
    }
    return derivatives
  }

  private classifyFailure(code?: string, message?: string): ProviderFailureClass {
    const lower = (message ?? '').toLowerCase()
    if (code === 'QUOTA_EXCEEDED') return 'BALANCE_EXHAUSTED'
    if (code === 'RATE_LIMITED') return 'RATE_LIMIT'
    if (code === 'INVALID_PROVIDER_KEY' || code === 'PROVIDER_FORBIDDEN') return 'INVALID_API_KEY'
    if (code === 'INVALID_PROVIDER_REQUEST' || lower.includes('not supported') || lower.includes('unsupported')) return 'FEATURE_NOT_SUPPORTED'
    if (code === 'PROVIDER_OVERLOADED') return 'TEMPORARY_UNAVAILABLE'
    if (lower.includes('timeout_')) return 'TIMEOUT'
    return 'PROVIDER_DOWN'
  }

  private isFallbackAllowed(failureClass: ProviderFailureClass): boolean {
    return (
      failureClass === 'BALANCE_EXHAUSTED' ||
      failureClass === 'RATE_LIMIT' ||
      failureClass === 'TEMPORARY_UNAVAILABLE' ||
      failureClass === 'PROVIDER_DOWN' ||
      failureClass === 'TIMEOUT'
    )
  }

  private resolveFallbackProviders(primary: ModelProvider, feature: ProviderFeature): ModelProvider[] {
    return providerHealthService
      .resolveCandidates(primary as ProviderKey, feature)
      .filter((provider) => provider === 'claude' || provider === 'gpt' || provider === 'gemini') as ModelProvider[]
  }

  private async executeJob(
    job: GenerationJob,
    input: GenerationPipelineInput,
    providerStatuses: Map<'claude', ProviderStatus>
  ): Promise<{ result: string; durationMs: number; degraded: boolean }> {
    let attempt = 0
    let lastError: string | null = null
    let degraded = false

    while (attempt < job.maxAttempts) {
      attempt += 1
      const status = attempt === 1 ? 'processing' : 'retrying'
      generationQueueStore.updateJob(job.sessionId, job.id, {
        status,
        attempt,
        startedAt: new Date().toISOString(),
      })

      const startedAt = Date.now()
      try {
        const config = AGENTS_REGISTRY[job.agent]
        const prompt = buildPrompt({
          agent: job.agent,
          contentType: CONTENT_TO_ARTIFACT[job.contentType],
          dna: {
            protocol: input.protocol ?? 'raw_truth',
            tone: input.tone ?? 'clear',
            generationMode: input.generationMode ?? 'BALANCED',
          },
          sharedContext: input.sharedContext,
          preset: input.selectedPreset,
        })

        const strategyTier = resolveModelStrategyTier(input.protocol ?? 'raw_truth')
        const primaryProvider = mapModelToProvider(config.model)
        const feature = mapContentTypeToFeature(job.contentType)
        const providerChain = this.resolveFallbackProviders(primaryProvider, feature)
        let responseContent: string | null = null
        let responseError: string | null = null
        let usedProvider: ModelProvider = 'claude'
        let failureClass: ProviderFailureClass | null = null

        const routedProvider = await saasAgentsService.routeToModel(
          job.contentType,
          providerChain as Array<'claude' | 'gpt' | 'gemini'>
        )
        const routedChain = [
          routedProvider,
          ...providerChain.filter((provider) => provider !== routedProvider),
        ]
        for (let idx = 0; idx < routedChain.length; idx += 1) {
          const provider = routedChain[idx]
          console.log('[DNA][pipeline] ai_request', {
            jobId: job.id,
            provider,
            agent: job.agent,
            contentType: job.contentType,
            attempt,
          })
          const response = await withTimeout(
            callProviderSafe(provider, prompt.systemPrompt, prompt.userPrompt, {
              contentType: job.contentType,
              strategyTier,
            }),
            job.timeoutMs
          )
          if (response.content) {
            responseContent = response.content
            usedProvider = provider
            degraded = provider !== primaryProvider
            if (degraded) {
              generationQueueStore.updateJob(job.sessionId, job.id, {
                degraded: true,
                fallbackProvider: provider,
              })
            }
            providerStatuses.set(provider as 'claude', {
              provider: provider as 'claude',
              available: true,
              status: degraded ? 'degraded' : 'ok',
            })
            providerHealthService.recordSuccess(provider as ProviderKey, degraded)
            break
          }
          failureClass = this.classifyFailure(response.error?.code, response.error?.message)
          responseError = response.error?.message ?? 'empty_content'
          const lifecycleState = providerHealthService.recordFailure(
            provider as ProviderKey,
            failureClass,
            responseError
          )
          providerStatuses.set(provider as 'claude', {
            provider: provider as 'claude',
            available: false,
            status: lifecycleState,
            message: responseError,
          })
          if (!this.isFallbackAllowed(failureClass)) {
            break
          }
        }

        if (!responseContent) {
          generationQueueStore.updateJob(job.sessionId, job.id, {
            failureClass: failureClass ?? 'PROVIDER_DOWN',
            blockedPremium: failureClass === 'FEATURE_NOT_SUPPORTED',
            paused: true,
            provider: mapModelToProvider(config.model),
          })
          const fallback = await selfLearningService.generateFromHistory(job.agent, input.sharedContext)
          const durationMs = Date.now() - startedAt
          generationQueueStore.updateJob(job.sessionId, job.id, {
            status: 'completed',
            result: fallback,
            normalized: safeNormalize(fallback),
            finishedAt: new Date().toISOString(),
            durationMs,
            error: responseError ?? undefined,
            degraded: true,
            paused: true,
          })
          return { result: fallback, durationMs, degraded: true }
        }

        const audit = await saasAgentsService.auditQuality(
          responseContent,
          'STARWAY_OGOLENA_PRAVDA'
        )
        if (!audit.passed) {
          throw new Error(`quality_audit_failed:${audit.violations.join(',')}`)
        }
        await selfLearningService.saveSuccessfulGeneration(
          job.agent,
          input.sharedContext,
          responseContent,
          usedProvider,
          input.protocol?.toUpperCase() ?? 'SYSTEM'
        )

        const normalized = safeNormalize(responseContent)
        const durationMs = Date.now() - startedAt
        generationQueueStore.updateJob(job.sessionId, job.id, {
          status: 'completed',
          result: responseContent,
          normalized,
          finishedAt: new Date().toISOString(),
          durationMs,
          error: undefined,
          provider: usedProvider,
        })
        console.log('[DNA][pipeline] normalize:ok', {
          jobId: job.id,
          contentType: job.contentType,
          durationMs,
        })

        return { result: responseContent, durationMs, degraded }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        const canRetry = attempt < job.maxAttempts
        generationQueueStore.updateJob(job.sessionId, job.id, {
          status: canRetry ? 'retrying' : 'failed',
          error: lastError,
          finishedAt: canRetry ? undefined : new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          paused: !canRetry,
        })
        console.error('[DNA][pipeline] ai_failed', {
          jobId: job.id,
          contentType: job.contentType,
          attempt,
          canRetry,
          error: lastError,
        })
        if (!canRetry) break
      }
    }

    throw new Error(lastError ?? 'job_failed')
  }
}
