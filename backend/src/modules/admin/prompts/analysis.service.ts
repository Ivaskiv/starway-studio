import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { runGuardedAiTask,stableHash } from '../../../services/aiGuard.service.js'
import { buildGatewayPromptSources } from '../../ai/gateway/index.js'

export const parsePromptContent = (content: string): unknown => {
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

export interface CompatibilityCheckRequest {
  type: 'compatibility_check'
  item: Record<string, unknown>
  relatedItems: Array<Record<string, unknown>>
  checkRules: string[]
}

export interface AgentRuntimeTestRequest {
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

export async function buildRuntimePromptFallbackRecord(name: string) {
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
    source: 'filesystem' as const,
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

export async function analyzePromptImpact(promptName: string): Promise<PromptImpactAnalysis> {
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

export async function analyzeCompatibilityCheck(
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
