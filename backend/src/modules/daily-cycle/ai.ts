import type { AssistantMemory } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { cacheGet, cacheSet } from '../../lib/cache/index.js'
import { MODEL_FOR_TASK } from '../../lib/openaiModels.js'
import type { DailyEntryForAi, DayAnalysisResult } from './types.js'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'

function trimText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLevel(value: unknown): 'high' | 'medium' | 'low' {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium'
}

function normalizeStringList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => trimText(item))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function buildDayAnalysisPrompt(data: DailyEntryForAi): string {
  const completedTasks = data.tasks.filter(task => task.completed).length
  const totalTasks = data.tasks.length

  return `Ти — AI-ментор Starway. Аналізуй день конкретно і чесно.
Тон: прямий і теплий, як розумний друг. Не терапевт. Не мотиватор.
Мова: українська. Звертання: "ти". Без кліше і загальних фраз.

ДАНІ ДНЯ (${data.date}):
РАНОК — ідентичність: ${data.morning.identity ?? '—'}
РАНОК — стан: ${data.morning.state ?? '—'}
РАНОК — фокус: ${data.morning.focus ?? '—'}
РАНОК — гідність: ${data.morning.worthy ?? '—'}
ВЕЧІР — перемога: ${data.evening.win ?? '—'}
ВЕЧІР — що наповнило: ${data.evening.energy_in ?? '—'}
ВЕЧІР — де злила: ${data.evening.energy_out ?? '—'}
ВЕЧІР — патерн: ${data.evening.program ?? '—'}
ВЕЧІР — з якої точки діяла: ${data.evening.power_source ?? '—'}
МІКРОЗАВДАННЯ: ${completedTasks}/${totalTasks} виконано

Поверни ТІЛЬКИ валідний JSON без markdown і без пояснень:
{
  "energy_level": "high"|"medium"|"low",
  "focus_level": "high"|"medium"|"low",
  "drain_level": "high"|"medium"|"low",
  "main_insight": "1-2 речення конкретно що відбулось — без загальних слів",
  "what_worked": ["до 3 коротких конкретних чіпів"],
  "active_pattern": {
    "title": "назва патерну як є",
    "description": "що це + один маленький наступний крок"
  },
  "energy_drain_summary": "1 речення конкретно",
  "drain_chips": ["до 2 чіпів"],
  "tomorrow": [
    "конкретна дія 1 — не порада а дія",
    "конкретна дія 2",
    "конкретна дія 3"
  ]
}`
}

function normalizeDayAnalysisResult(value: unknown): DayAnalysisResult {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}

  const activePattern =
    record.active_pattern && typeof record.active_pattern === 'object' && !Array.isArray(record.active_pattern)
      ? record.active_pattern as Record<string, unknown>
      : {}

  const fallbackInsight = trimText(record.main_insight) || 'Ти закрила день і зберегла головні сигнали. Тепер важливо перенести один конкретний фокус на завтра.'

  return {
    energy_level: normalizeLevel(record.energy_level),
    focus_level: normalizeLevel(record.focus_level),
    drain_level: normalizeLevel(record.drain_level),
    main_insight: fallbackInsight,
    what_worked: normalizeStringList(record.what_worked, 3),
    active_pattern: {
      title: trimText(activePattern.title),
      description: trimText(activePattern.description),
    },
    energy_drain_summary: trimText(record.energy_drain_summary),
    drain_chips: normalizeStringList(record.drain_chips, 2),
    tomorrow: normalizeStringList(record.tomorrow, 3),
  }
}

export async function generateDailyAiAnalysis(entry: DailyEntryForAi, userId?: string) {
  const prompt = buildDayAnalysisPrompt(entry)

  try {
    return await runGuardedAiTask(
      {
        userId: userId ?? stableHash(entry).slice(0, 16),
        source: 'daily-analysis',
        label: 'daily-analysis',
        payloadHash: stableHash({ userId, entry }),
        throttleMs: 10_000,
        duplicateWindowMs: 10 * 60_000,
      },
      async () => {
        const cacheKey = `daily-analysis:${stableHash({ userId, entry })}`
        const cached = await cacheGet<DayAnalysisResult | null>(cacheKey)
        if (cached) {
          return normalizeDayAnalysisResult(cached)
        }

        const completion = await openai.chat.completions.create({
          model: MODEL_FOR_TASK.evening_analysis,
          temperature: 0.4,
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content ?? '{}'
        let parsed: unknown

        try {
          parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
        } catch {
          parsed = {
            main_insight: trimText(raw),
            tomorrow: [],
          }
        }

        const normalized = normalizeDayAnalysisResult(parsed)
        await cacheSet(cacheKey, normalized, 3600)
        return normalized
      },
      () => null,
    )
  } catch (error) {
    console.error('generateDailyAiAnalysis error:', error)
    return null
  }
}

export async function saveMemory(
  userId: string,
  type: string,
  content: string,
): Promise<AssistantMemory> {
  return prisma.assistantMemory.create({
    data: { userId, type, content },
  })
}
