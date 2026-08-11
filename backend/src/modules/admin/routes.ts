// backend/src/modules/admin/routes.ts

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Router, type Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { authRequired } from '../auth/middleware/auth.js'
import { Prisma, Role } from '@starway/db/prisma-client'
import { trackEvent } from '../events/service.js'
import { invalidateQuestionSetCache } from '../telegram-mentor/session.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { runWeeklyReports } from '../daily-cycle/scheduler.js'
import {
  filterContentStudioItemsByFormats,
  generateContentStudioItems,
  generateContentStudioImages,
  publishLeadMagnet,
  publishContentStudioItem,
  saveLeadMagnetDraft,
  regenerateContentStudioItem,
  testLeadMagnetTelegram,
  type ContentStudioInputs,
  type ContentStudioItem,
  type LeadMagnetPreviewPayload,
  type ContentStudioRequestedFormat,
} from './content-studio.service.js'
import { getAllResearchData, getResearchData, refreshMarketResearch } from './content-research.service.js'
import { getUserInsights } from './user-insights.service.js'
import { notificationPreferenceService } from '../../services/notifications/services/NotificationPreferenceService.js'
import { reassignLifecycleUsersToExpert, resolveViewerScopedExpertId } from '../experts/ownership.service.js'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'
import { buildGatewayPromptSources, TelegramAgentGateway } from '../ai/agentGateway.js'
import { CanonicalGatewayAgentRegistry } from '../ai/canonicalAgentRegistry.js'

const router = Router()

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const isExpertOrAdmin = (role?: string) =>
  role === Role.EXPERT || role === Role.SUPERADMIN || role === Role.ADMIN

const guard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)               { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

const expertGuard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)                       { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isExpertOrAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

const isSuperAdmin = (role?: string) => role === Role.SUPERADMIN

const superGuard = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)                         { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isSuperAdmin(req.user.role))      { res.status(403).json({ error: 'superadmin_only' }); return true }
  return false
}

const parsePromptContent = (content: string): unknown => {
  try {
    return JSON.parse(content)
  } catch {
    return content
  }
}

type PromptImpactSeverity = 'high' | 'medium' | 'low'
type PromptImpactTone = 'info' | 'warning' | 'success'

interface PromptImpactDependencyCard {
  name: string
  severity: PromptImpactSeverity
  reason: string
  affectedPrompts: string[]
}

interface PromptImpactCheck {
  title: string
  body: string
  tone: PromptImpactTone
}

interface PromptImpactAnalysis {
  promptName: string
  promptVersion: number
  promptVersionId: string
  summary: string
  recommendation: string
  warnings: string[]
  dependencies: PromptImpactDependencyCard[]
  checks: PromptImpactCheck[]
  analyzedAt: string
}

interface CompatibilityCheckRequest {
  type: 'compatibility_check'
  item: Record<string, unknown>
  relatedItems: Array<Record<string, unknown>>
  checkRules: string[]
}

interface AgentRuntimeTestRequest {
  message: string
  messageType?: string | null
}

const PROMPT_ANALYSIS_MODEL = process.env.ADMIN_PROMPT_ANALYSIS_MODEL?.trim()
  || process.env.OPENAI_MODEL?.trim()
  || 'gpt-4o-mini'

function normalizePromptReference(value: string) {
  return value.toLowerCase().replace(/[\s_\-→:·/]+/g, '')
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim())
}

async function buildRuntimePromptFallbackRecord(name: string) {
  const source = buildGatewayPromptSources().find((item) => item.id === name)
  if (!source) {
    return null
  }

  const filePath = path.isAbsolute(source.filePath)
    ? source.filePath
    : path.resolve(process.cwd(), source.filePath)
  const content = await readFile(filePath, 'utf8')
  if (!content.trim()) {
    return null
  }

  return {
    id: `runtime:${name}`,
    name,
    version: 0,
    content,
    parsedContent: parsePromptContent(content),
    isActive: true,
    createdAt: new Date(0),
  }
}

function extractPromptConfig(content: unknown) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return {
      model: null as string | null,
      temperature: null as number | null,
      maxTokens: null as number | null,
      dependencies: [] as string[],
    }
  }

  const record = content as Record<string, unknown>
  return {
    model: typeof record.model === 'string' ? record.model : null,
    temperature:
      typeof record.temp === 'number'
        ? record.temp
        : typeof record.temperature === 'number'
          ? record.temperature
          : null,
    maxTokens:
      typeof record.max_tokens === 'number'
        ? record.max_tokens
        : typeof record.maxTokens === 'number'
          ? record.maxTokens
          : null,
    dependencies: parseStringArray(record.dependencies),
  }
}

function buildPromptImpactFallback(params: {
  selected: { id: string; name: string; version: number }
  dependencies: string[]
  missingDependencies: string[]
  dependentPrompts: string[]
}): PromptImpactAnalysis {
  const dependencyCards: PromptImpactDependencyCard[] = params.dependencies.length
    ? params.dependencies.map((name) => {
        const isMissing = params.missingDependencies.includes(name)
        const isReferenced = params.dependentPrompts.some((promptName) => normalizePromptReference(promptName).includes(normalizePromptReference(params.selected.name)))
        const severity: PromptImpactSeverity = isMissing ? 'high' : isReferenced ? 'medium' : 'low'
        return {
          name,
          severity,
          reason: isMissing
            ? 'Залежність відсутня у реєстрі промптів.'
            : isReferenced
              ? 'На цей промпт є залежні сценарії, перевіряй каскад змін.'
              : 'Пряма залежність є, але каскад зараз не видно.',
          affectedPrompts: params.dependentPrompts,
        }
      })
    : [
        {
          name: 'Прямі залежності',
          severity: 'low',
          reason: 'У цій family не знайдено прямих залежностей.',
          affectedPrompts: [],
        },
      ]

  return {
    promptName: params.selected.name,
    promptVersion: params.selected.version,
    promptVersionId: params.selected.id,
    summary: params.dependencies.length
      ? `Промпт "${params.selected.name}" має ${params.dependencies.length} прямих залежності.`
      : `Промпт "${params.selected.name}" не тягне прямих залежностей.`,
    recommendation: params.missingDependencies.length
      ? 'Спочатку закрий відсутні залежності, а потім активуй версію.'
      : 'Можна активувати після швидкої ручної перевірки сумісності.',
    warnings: params.missingDependencies.length
      ? [`Не знайдені залежності: ${params.missingDependencies.join(', ')}`]
      : ['Явних структурних ризиків не знайдено.'],
    dependencies: dependencyCards,
    checks: [
      {
        title: 'Залежності',
        body: params.dependencies.length
          ? 'Прямий dependency graph побудований.'
          : 'Прямих dependency graph немає.',
        tone: params.dependencies.length ? 'warning' : 'success',
      },
      {
        title: 'Каскад',
        body: params.dependentPrompts.length
          ? `Потенційно зачіпає ${params.dependentPrompts.length} промптів.`
          : 'Каскаду на інші промпти не видно.',
        tone: params.dependentPrompts.length ? 'warning' : 'info',
      },
      {
        title: 'Рішення',
        body: params.missingDependencies.length
          ? 'Потрібно спершу оновити або створити відсутні залежності.'
          : 'Зміна виглядає безпечною для публікації після ревʼю.',
        tone: params.missingDependencies.length ? 'warning' : 'success',
      },
    ] as PromptImpactCheck[],
    analyzedAt: new Date().toISOString(),
  }
}

async function analyzePromptImpact(promptName: string): Promise<PromptImpactAnalysis> {
  const prompts = await prisma.promptVersion.findMany({
    orderBy: [
      { name: 'asc' },
      { version: 'desc' },
    ],
    select: {
      id: true,
      name: true,
            version: true,
      content: true,
      isActive: true,
      createdAt: true,
    },
  })

  const selected = prompts.find((prompt) => prompt.name === promptName)
  if (!selected) {
    throw new Error('prompt_not_found')
  }

  const parsedSelected = parsePromptContent(selected.content)
  const selectedConfig = extractPromptConfig(parsedSelected)
  const dependencies = selectedConfig.dependencies
  const normalizedSelectedName = normalizePromptReference(selected.name)
  const dependentPrompts = prompts
    .filter((prompt) => prompt.id !== selected.id)
    .filter((prompt) => {
      const config = extractPromptConfig(parsePromptContent(prompt.content))
      return config.dependencies.some((dependency) => normalizePromptReference(dependency) === normalizedSelectedName)
    })
    .map((prompt) => prompt.name)

  const missingDependencies = dependencies.filter(
    (dependency) =>
      !prompts.some(
        (prompt) =>
          normalizePromptReference(prompt.name) === normalizePromptReference(dependency)
          || normalizePromptReference(prompt.name).includes(normalizePromptReference(dependency)),
      ),
  )

  const configSummary = {
    model: selectedConfig.model ?? '—',
    temperature: selectedConfig.temperature ?? '—',
    maxTokens: selectedConfig.maxTokens ?? '—',
    dependencies,
    dependentPrompts,
    familyVersions: prompts.filter((prompt) => prompt.name === selected.name).map((prompt) => prompt.version),
    activeVersion: prompts.find((prompt) => prompt.name === selected.name && prompt.isActive)?.version ?? null,
  }

  const analysis: PromptImpactAnalysis = await runGuardedAiTask(
    {
      userId: `prompt-analysis:${selected.name}`,
      source: 'admin-prompt-impact',
      label: `prompt-impact:${selected.name}`,
      payloadHash: stableHash({
        promptId: selected.id,
        promptName: selected.name,
        promptVersion: selected.version,
        content: selected.content,
        dependencies,
        dependentPrompts,
      }),
      throttleMs: 15_000,
      duplicateWindowMs: 5 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: PROMPT_ANALYSIS_MODEL,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: [
              'Ти — AI-аналітик впливу системних промптів у Starway Studio.',
              'Пояснюй наслідки зміни коротко, без води і без зайвих емоцій.',
              'Поверни тільки валідний JSON без markdown.',
              'Схема відповіді:',
              '{',
              '  "summary": string,',
              '  "recommendation": string,',
              '  "warnings": string[],',
              '  "dependencies": [{ "name": string, "severity": "high" | "medium" | "low", "reason": string }],',
              '  "checks": [{ "title": string, "body": string, "tone": "info" | "warning" | "success" }]',
              '}',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              selectedPrompt: {
                id: selected.id,
                name: selected.name,
                version: selected.version,
                isActive: selected.isActive,
                createdAt: selected.createdAt,
              },
              promptConfig: configSummary,
              promptContent: parsedSelected,
              existingPrompts: prompts.map((prompt) => ({
                name: prompt.name,
                version: prompt.version,
                isActive: prompt.isActive,
              })),
            }, null, 2),
          },
        ],
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      const parsed = parsePromptContent(raw)

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid_prompt_analysis_json')
      }

      const record = parsed as Partial<PromptImpactAnalysis & { dependencies: Array<{ name: string; severity: PromptImpactSeverity; reason: string }> }>

      const dependencyCards = Array.isArray(record.dependencies)
        ? record.dependencies.map((item) => ({
            name: item.name,
            severity: item.severity === 'high' || item.severity === 'medium' || item.severity === 'low' ? item.severity : 'low',
            reason: item.reason ?? 'Немає пояснення від AI.',
            affectedPrompts: dependentPrompts,
          }))
        : []

      const checks: PromptImpactCheck[] = Array.isArray(record.checks)
        ? record.checks
            .filter((item): item is PromptImpactCheck => Boolean(item?.title && item?.body))
            .map((item) => ({
              title: item.title,
              body: item.body,
              tone: item.tone === 'warning' || item.tone === 'success' ? item.tone : 'info',
            }))
        : []

      return {
        promptName: selected.name,
        promptVersion: selected.version,
        promptVersionId: selected.id,
        summary: typeof record.summary === 'string' && record.summary.trim() ? record.summary.trim() : `Промпт "${selected.name}" проаналізовано.`,
        recommendation: typeof record.recommendation === 'string' && record.recommendation.trim()
          ? record.recommendation.trim()
          : 'Потрібно провести ручний перегляд залежностей перед активацією.',
        warnings: Array.isArray(record.warnings)
          ? record.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [],
        dependencies: dependencyCards,
        checks: checks.length ? checks : [
          {
            title: 'Перевірка',
            body: 'AI не повернув структуровані рекомендації, тому використано безпечний fallback.',
            tone: 'warning',
          },
        ],
        analyzedAt: new Date().toISOString(),
      }
    },
    () => buildPromptImpactFallback({
      selected: { id: selected.id, name: selected.name, version: selected.version },
      dependencies,
      missingDependencies,
      dependentPrompts,
    }),
  )

  return analysis
}

function buildCompatibilityFallback(params: {
  itemLabel: string
  relatedItems: Array<Record<string, unknown>>
  checkRules: string[]
}): Omit<PromptImpactAnalysis, 'promptName' | 'promptVersion' | 'promptVersionId'> {
  const hasRelated = params.relatedItems.length > 0
  return {
    summary: `AI-перевірка для "${params.itemLabel}" виконана у fallback-режимі.`,
    recommendation: hasRelated
      ? 'Перевір повʼязані елементи вручну перед збереженням.'
      : 'Критичних залежностей не виявлено, можна зберігати після короткого перегляду.',
    warnings: hasRelated ? ['Є пов’язані елементи. Потрібен короткий ручний перегляд сумісності.'] : [],
    dependencies: hasRelated
      ? [
          {
            name: 'Повʼязані елементи',
            severity: 'medium',
            reason: 'Поточний елемент вже зв’язаний з іншими сценаріями.',
            affectedPrompts: params.relatedItems.map((item) => String(item.name ?? item.id ?? 'related-item')),
          },
        ]
      : [],
    checks: params.checkRules.map((rule) => ({
      title: rule,
      body: hasRelated
        ? 'Потрібна ручна перевірка цього правила для пов’язаних елементів.'
        : 'Явних ризиків по цьому правилу не видно.',
      tone: hasRelated ? 'warning' : 'success',
    })),
    analyzedAt: new Date().toISOString(),
  }
}

async function analyzeCompatibilityCheck(
  payload: CompatibilityCheckRequest,
  userId: string | null | undefined,
): Promise<Omit<PromptImpactAnalysis, 'promptName' | 'promptVersion' | 'promptVersionId'>> {
  const itemLabel = String(payload.item.name ?? payload.item.title ?? payload.item.id ?? 'item')

  return runGuardedAiTask(
    {
      userId: userId ?? `compatibility:${stableHash(payload.item).slice(0, 12)}`,
      source: 'admin-compatibility-check',
      label: `compatibility:${itemLabel}`,
      payloadHash: stableHash(payload),
      throttleMs: 10_000,
      duplicateWindowMs: 5 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: PROMPT_ANALYSIS_MODEL,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: [
              'Ти — AI-аналітик сумісності для Starway Studio.',
              'Перевіряєш промпти, нагадування і екрани воронок.',
              'Працюй українською. Коротко, прямо, без знаків оклику.',
              'Поверни тільки валідний JSON без markdown.',
              'Схема відповіді:',
              '{',
              '  "summary": string,',
              '  "recommendation": string,',
              '  "warnings": string[],',
              '  "dependencies": [{ "name": string, "severity": "high" | "medium" | "low", "reason": string }],',
              '  "checks": [{ "title": string, "body": string, "tone": "success" | "warning" }]',
              '}',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify(payload, null, 2),
          },
        ],
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? ''
      const parsed = parsePromptContent(raw)

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid_compatibility_check_json')
      }

      const record = parsed as Partial<PromptImpactAnalysis & { dependencies: Array<{ name: string; severity: PromptImpactSeverity; reason: string }> }>

      return {
        summary: typeof record.summary === 'string' && record.summary.trim()
          ? record.summary.trim()
          : `AI-перевірка для "${itemLabel}" завершена.`,
        recommendation: typeof record.recommendation === 'string' && record.recommendation.trim()
          ? record.recommendation.trim()
          : 'Перед збереженням перевір залежності та попередження.',
        warnings: Array.isArray(record.warnings)
          ? record.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [],
        dependencies: Array.isArray(record.dependencies)
          ? record.dependencies.map((item) => ({
              name: item.name ?? 'Залежність',
              severity: item.severity === 'high' || item.severity === 'medium' || item.severity === 'low' ? item.severity : 'low',
              reason: item.reason ?? 'Немає пояснення від AI.',
              affectedPrompts: payload.relatedItems.map((related) => String(related.name ?? related.title ?? related.id ?? 'related-item')),
            }))
          : [],
        checks: Array.isArray(record.checks)
          ? record.checks
              .filter((item): item is PromptImpactCheck => Boolean(item?.title && item?.body))
              .map((item) => ({
                title: item.title,
                body: item.body,
                tone: item.tone === 'warning' ? 'warning' : 'success',
              }))
          : [],
        analyzedAt: new Date().toISOString(),
      }
    },
    () => buildCompatibilityFallback({
      itemLabel,
      relatedItems: payload.relatedItems,
      checkRules: payload.checkRules,
    }),
  )
}

router.post('/content-studio/generate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { inputs, formats, strategy } = req.body as { inputs?: ContentStudioInputs; formats?: ContentStudioRequestedFormat[]; strategy?: unknown }
  if (!inputs) {
    return res.status(400).json({ error: 'inputs_required' })
  }

  const items = filterContentStudioItemsByFormats(generateContentStudioItems(inputs, strategy as any), formats)
  return res.json({
    ok: true,
    items,
    generatedAt: new Date().toISOString(),
  })
})

router.post('/content-studio/regenerate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item, inputs, strategy } = req.body as { item?: ContentStudioItem; inputs?: ContentStudioInputs; strategy?: unknown }
  if (!item || !inputs) {
    return res.status(400).json({ error: 'item_and_inputs_required' })
  }

  const nextItem = regenerateContentStudioItem(item, inputs, strategy as any)
  return res.json(nextItem)
})

router.post('/content-studio/publish', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item } = req.body as { item?: ContentStudioItem }
  if (!item) {
    return res.status(400).json({ error: 'item_required' })
  }

  const publishedItem = publishContentStudioItem(item)

  console.log('[content-studio] published', {
    userId: req.user?.id ?? null,
    itemId: publishedItem.id,
    type: publishedItem.type,
    title: publishedItem.title,
  })

  return res.json({
    ok: true,
    item: publishedItem,
    publishedAt: publishedItem.updatedAt,
  })
})

router.post('/content-studio/lead-magnet/save', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload } = req.body as { payload?: LeadMagnetPreviewPayload }
  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }

  try {
    const result = await saveLeadMagnetDraft({
      userId: req.user?.id ?? '',
      payload,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet save failed', error)
    return res.status(502).json({ error: 'lead_magnet_save_failed' })
  }
})

router.post('/content-studio/lead-magnet/test', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload, telegramToken, telegramChatId } = req.body as {
    payload?: LeadMagnetPreviewPayload
    telegramToken?: string
    telegramChatId?: string
  }

  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }
  if (!telegramToken?.trim() || !telegramChatId?.trim()) {
    return res.status(400).json({ error: 'telegram_token_and_chat_required' })
  }

  try {
    const result = await testLeadMagnetTelegram({
      userId: req.user?.id ?? '',
      payload,
      telegramToken,
      telegramChatId,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet telegram test failed', error)
    return res.status(502).json({ error: 'lead_magnet_telegram_test_failed' })
  }
})

router.post('/content-studio/lead-magnet/publish', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload, telegramToken, telegramChatId } = req.body as {
    payload?: LeadMagnetPreviewPayload
    telegramToken?: string
    telegramChatId?: string
  }

  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }
  if (payload.status !== 'approved') {
    return res.status(409).json({ error: 'lead_magnet_not_approved' })
  }
  if (payload.destinations.includes('telegram_bot') && (!telegramToken?.trim() || !telegramChatId?.trim())) {
    return res.status(400).json({ error: 'telegram_token_and_chat_required' })
  }

  try {
    const result = await publishLeadMagnet({
      userId: req.user?.id ?? '',
      payload,
      telegramToken,
      telegramChatId,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet publish failed', error)
    return res.status(502).json({ error: 'lead_magnet_publish_failed' })
  }
})

router.post('/content-studio/generate-images', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item, count } = req.body as { item?: ContentStudioItem; count?: number }
  if (!item) {
    return res.status(400).json({ error: 'item_required' })
  }

  try {
    const nextItem = await generateContentStudioImages(item, count ?? 5)
    return res.json({
      ok: true,
      item: nextItem,
      generatedAt: nextItem.updatedAt,
    })
  } catch (error) {
    console.error('[content-studio] image generation failed', error)
    return res.status(502).json({ error: 'image_generation_failed' })
  }
})

router.get('/content-studio/research', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const rawType = req.query.type
  const rawPlatform = req.query.platform
  const type = typeof rawType === 'string' ? rawType : null
  const platform = typeof rawPlatform === 'string' ? rawPlatform : 'instagram'

  if (type) {
    const data = await getResearchData(type as 'hooks' | 'ads' | 'formulas' | 'reels_trends', platform as 'instagram' | 'meta_ads' | 'tiktok' | 'youtube')
    return res.json(data ?? { error: 'no_data_yet' })
  }

  const payload = await getAllResearchData()
  return res.json(payload)
})

router.post('/content-studio/research/refresh', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const result = await refreshMarketResearch()
  return res.json({
    ok: result.success,
    updated: result.updated,
    errors: result.errors,
    message: `Оновлено ${result.updated} джерел даних`,
    nextRefresh: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
  })
})

// ─── GET /api/admin/question-sets ────────────────────────────

router.get('/question-sets', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (guard(req, res)) return
  const sets = await prisma.mentorQuestionSet.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(sets)
})

// ─── GET /api/admin/users ───────────────────────────────

router.get('/users', authRequired, async (req: AuthenticatedRequest, res: Response) => {
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

router.get('/users/insights', authRequired, async (req: AuthenticatedRequest, res: Response) => {
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

router.patch('/users/:id/bot-messages', authRequired, async (req: AuthenticatedRequest, res: Response) => {
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
    const gateway = new TelegramAgentGateway()
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

  const responsePrompts = prompts.map((prompt) => ({
    id: prompt.id,
    name: prompt.name,
    version: prompt.version,
    content: prompt.content,
    parsedContent: parsePromptContent(prompt.content),
    isActive: prompt.isActive,
    createdAt: prompt.createdAt,
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

  const latest = await prisma.promptVersion.findFirst({
    where: { name },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  const created = await prisma.promptVersion.create({
    data: {
      name,
      version: (latest?.version ?? 0) + 1,
      content,
      isActive: isActive,
    },
  })

  if (isActive) {
    await prisma.promptVersion.updateMany({
      where: {
        name,
        id: { not: created.id },
      },
      data: { isActive: false },
    })
  }

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
    },
  })
})

// ─── PUT /api/admin/prompts/:id/activate ─────────────────

router.put('/prompts/:id/activate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (superGuard(req, res)) return

  const existing = await prisma.promptVersion.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'not_found' })

  await prisma.$transaction([
    prisma.promptVersion.updateMany({
      where: { name: existing.name },
      data: { isActive: false },
    }),
    prisma.promptVersion.update({
      where: { id: existing.id },
      data: { isActive: true },
    }),
  ])

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
