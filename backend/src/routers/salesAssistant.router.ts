// backend/src/routers/salesAssistant.router.ts

import type { Response } from 'express'

import { Router } from 'express'

import { prisma } from '../db/client.js'
import {
  requireSalesAssistantAccess,
  type SalesAssistantRequest,
} from '../middleware/salesAssistantGuard.js'
import {
  normalizeProviderError,
  ProviderGenerationError,
} from '../modules/ai-assistant/utils/normalizeProviderError.js'
import type {
  GenerateWithAgentsDto,
  SalesAssistantGenerateBody,
  UpdateSalesAssistantWorkspaceBody,
} from '@/modules/sales-assistant/sales-assistant.types.js'
import { generateContent } from '@/modules/sales-assistant/sales-assistant.service.js'
import { GenerationPipelineService } from '@/modules/sales-assistant/pipeline/generation-pipeline.service.js'
import { openai } from '@starway/ai/providers'

const router = Router()
const DEFAULT_PROFILE_KEY = 'STARWAY_OGOLENA_PRAVDA'
const generationPipelineService = new GenerationPipelineService()

function resolveProfileKey(req: SalesAssistantRequest) {
  return req.aiProfile?.key ?? DEFAULT_PROFILE_KEY
}

function resolveUserId(req: SalesAssistantRequest) {
  return req.user?.id ?? ''
}

function extractSemanticFields(transcript: string) {
  const lines = transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const lower = transcript.toLowerCase()

  const painHints = ['бол', 'драт', 'виснаж', 'проблем', 'страх', 'застряг', 'тупняк']
  const goalHints = ['прода', 'ціль', 'дія', 'запис', 'куп', 'офер']

  const painLine = lines.find((line) => painHints.some((hint) => line.toLowerCase().includes(hint)))
  const goalLine = lines.find((line) => goalHints.some((hint) => line.toLowerCase().includes(hint)))

  return {
    pain: painLine ?? (lower.includes('бол') ? transcript.slice(0, 700) : ''),
    goal: goalLine ?? (lower.includes('прода') || lower.includes('ціль') ? transcript.slice(0, 500) : ''),
    customTask: transcript,
  }
}

router.get(
  '/workspace',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const workspaceId = req.aiWorkspaceId

    if (!workspaceId) {
      return res.json({
        id: '',
        isActive: true,
        usedTokensThisMonth: 0,
        maxTokensPerMonth: 0,
        activeProfile: req.aiProfile
          ? {
              id: req.aiProfile.id ?? '',
              systemAnchor: req.aiProfile.systemAnchor,
              supportedProtocols: req.aiProfile.supportedProtocols as Record<
                string,
                unknown
              >,
              supportedOutputs: req.aiProfile.supportedOutputs,
            }
          : null,
      })
    }

    const workspace = await prisma.userAiWorkspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        isActive: true,
        usedTokensThisMonth: true,
        maxTokensPerMonth: true,
        activeProfile: {
          select: {
            id: true,
            systemAnchor: true,
            supportedProtocols: true,
            supportedOutputs: true,
          },
        },
      },
    })

    if (!workspace) {
      return res.status(404).json({ message: 'AI Workspace not found' })
    }

    return res.json(workspace)
  }
)

router.put(
  '/workspace',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const workspaceId = req.aiWorkspaceId
    if (!workspaceId) {
      return res.status(404).json({ message: 'AI Workspace not found' })
    }

    const body = req.body as UpdateSalesAssistantWorkspaceBody
    const workspace = await prisma.userAiWorkspace.update({
      where: { id: workspaceId },
      data: {
        ...(body.activeProfileId !== undefined
          ? { activeProfileId: body.activeProfileId }
          : {}),
      },
      select: {
        id: true,
        isActive: true,
        usedTokensThisMonth: true,
        maxTokensPerMonth: true,
        activeProfile: {
          select: {
            id: true,
            systemAnchor: true,
            supportedProtocols: true,
            supportedOutputs: true,
          },
        },
      },
    })

    return res.json(workspace)
  }
)

router.get(
  '/lexicon',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const items = await prisma.lexicon.findMany({
      where: { profileKey: resolveProfileKey(req) },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        word: true,
        type: true,
      },
    })

    return res.json(items)
  }
)

router.post(
  '/lexicon',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const body = req.body as { word?: string; type?: 'REQUIRED' | 'FORBIDDEN' }
    const word = body.word?.trim()
    const type = body.type

    if (!word || (type !== 'REQUIRED' && type !== 'FORBIDDEN')) {
      return res.status(400).json({ message: 'Invalid lexicon payload' })
    }

    const item = await prisma.lexicon.create({
      data: {
        profileKey: resolveProfileKey(req),
        type,
        word,
        addedBy: resolveUserId(req),
      },
      select: {
        id: true,
        word: true,
        type: true,
      },
    })

    return res.status(201).json(item)
  }
)

router.delete(
  '/lexicon/:id',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    await prisma.lexicon.delete({
      where: { id: req.params.id },
    })

    return res.status(204).send()
  }
)

router.get(
  '/campaign-memory',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const memory = await prisma.campaignMemory.findFirst({
      where: {
        userId: resolveUserId(req),
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        launchContext: true,
        audienceTemp: true,
        objections: true,
        resistance: true,
      },
    })

    return res.json(memory)
  }
)

router.put(
  '/campaign-memory',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const userId = resolveUserId(req)
    const body = req.body as {
      launchContext?: string
      audienceTemp?: string
      objections?: string
      resistance?: string
    }

    await prisma.campaignMemory.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    const memory = await prisma.campaignMemory.create({
      data: {
        userId,
        launchContext: body.launchContext ?? '',
        audienceTemp: body.audienceTemp ?? '',
        objections: body.objections ?? '',
        resistance: body.resistance ?? '',
        isActive: true,
      },
      select: {
        launchContext: true,
        audienceTemp: true,
        objections: true,
        resistance: true,
      },
    })

    return res.json(memory)
  }
)

router.post(
  '/transcribe',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    try {
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : ''
      const filename = typeof req.body?.filename === 'string' && req.body.filename.trim() ? req.body.filename.trim() : 'audio.webm'
      const mimeType = typeof req.body?.mimeType === 'string' && req.body.mimeType.trim() ? req.body.mimeType.trim() : 'audio/webm'

      if (!audioBase64) return res.status(400).json({ error: 'audio_base64_required' })

      const startedAt = Date.now()
      const buffer = Buffer.from(audioBase64, 'base64')
      const blob = new Blob([buffer], { type: mimeType })
      const file = new File([blob], filename, { type: mimeType })

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'gpt-4o-mini-transcribe',
      })
      const transcript = (transcription.text ?? '').trim()
      if (!transcript) return res.status(422).json({ error: 'transcription_empty' })

      const semantic = extractSemanticFields(transcript)
      return res.json({
        ok: true,
        transcript,
        semantic,
        processingMs: Date.now() - startedAt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'transcription_failed'
      return res.status(500).json({ error: 'transcription_failed', message })
    }
  }
)

router.post(
  '/generate-with-agents',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const startedAt = Date.now()
    try {
      const body = req.body as GenerateWithAgentsDto
      const userId = req.user?.id ?? body.userId ?? ''

      if (!Array.isArray(body.selectedAgents) || body.selectedAgents.length === 0) {
        return res.status(400).json({ success: false, error: 'selectedAgents is required' })
      }

      console.log('[DNA][generate-with-agents][REQUEST]', {
        userId,
        selectedAgents: body.selectedAgents,
        selectedPreset: body.selectedPreset ?? null,
        agentCount: body.selectedAgents.length,
      })

      const pipeline = await generationPipelineService.execute({
        userId,
        selectedAgents: body.selectedAgents,
        selectedPreset: body.selectedPreset,
        sharedContext: {
          audiencePain: body.audiencePain ?? '',
          targetAction: body.targetAction ?? '',
          product: body.product,
          additionalNotes: body.additionalNotes,
        },
        protocol: body.protocol ?? 'raw_truth',
        tone: body.tone,
        generationMode: body.generationMode,
        accessTier: body.accessTier ?? 'free',
      })
      const results = pipeline.results
      console.log('[DNA][debug][generate-with-agents][results_shape]', {
        resultsPreview: results.map((item) => ({
          agent: item.agent,
          status: item.status,
          model: item.model,
          hasResult: Boolean(item.result),
          resultLength: item.result?.length ?? 0,
          error: item.error,
        })),
      })

      console.log('[DNA][generate-with-agents][SUCCESS]', {
        durationMs: Date.now() - startedAt,
        resultsCount: results.length,
        successCount: results.filter((r) => r.status === 'fulfilled').length,
      })

      return res.json({
        success: true,
        results,
        generationSession: pipeline.session,
        generationJobs: pipeline.jobs,
        providerStatuses: pipeline.providerStatuses,
        gatingDecision: pipeline.gatingDecision,
      })
    } catch (error) {
      console.error('[DNA][generate-with-agents][ERROR]', {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)

router.get(
  '/generation-jobs/:sessionId',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const { sessionId } = req.params
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId_required' })
    const state = generationPipelineService.getSessionWithJobs(sessionId)
    return res.json({ success: true, ...state })
  }
)

router.post(
  '/generate',
  requireSalesAssistantAccess,
  async (req: SalesAssistantRequest, res: Response) => {
    const startedAt = Date.now()

    try {
      const body = req.body as SalesAssistantGenerateBody

      const userId = req.user?.id ?? ''

      console.log('[DNA][generate][REQUEST]', {
        userId,

        workspaceId: req.aiWorkspaceId ?? null,

        provider: body.provider ?? process.env.AI_PRIMARY_PROVIDER ?? 'openai',

        contentType: body.contentType,

        body,
      })

      console.log('[DNA][generate][SERVICE_START]')

      const response = await generateContent(
        req.aiWorkspaceId ?? null,

        body,

        req.aiProfile ?? null,

        userId
      )
      const dnaDebug = (response as { dnaDebug?: { pipeline?: string; preset?: string | null; provider?: string | null } }).dnaDebug
      if (dnaDebug?.pipeline) res.setHeader('X-DNA-PIPELINE', dnaDebug.pipeline)
      if (dnaDebug?.preset) res.setHeader('X-DNA-PRESET', dnaDebug.preset)
      if (dnaDebug?.provider) res.setHeader('X-DNA-PROVIDER', dnaDebug.provider)
//         res.setHeader(
//   'X-DNA-FALLBACK',
//   String(Boolean(dnaDebug?.fallbackTriggered))
// )

      console.log('[DNA][generate][SERVICE_OK]', {
        provider: response.modelUsed,

        contentType: response.contentType,

        resultLength: response.content?.length ?? 0,

        durationMs: Date.now() - startedAt,
      })

      return res.json(response)
    } catch (error) {
      console.error('[DNA][generate][FATAL]', {
        userId: req.user?.id ?? '',

        workspaceId: req.aiWorkspaceId ?? null,

        durationMs: Date.now() - startedAt,

        error: error instanceof Error ? error.message : String(error),

        stack: error instanceof Error ? error.stack : undefined,
      })

      const normalized =
        error instanceof ProviderGenerationError
          ? error.normalized
          : normalizeProviderError(error)

      return res.status(normalized.status).json({
        ok: false,

        code: normalized.code,

        message: normalized.message,

        provider: normalized.provider,

        retryAfter: normalized.retryAfter ?? null,
      })
    }
  }
)

export default router
