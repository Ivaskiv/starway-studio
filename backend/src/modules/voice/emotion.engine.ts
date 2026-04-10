import type { DailyState } from '@starway/db/prisma-client'

import { openai } from '../../lib/openai.js'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'
import type { EmotionSignal } from './types.js'

const RULES: Array<{ state: DailyState; triggers: string[] }> = [
  { state: 'FEAR', triggers: ['страх', 'тривога', 'паніка', 'боюсь', 'не справлюсь', 'лякає', 'тремт'] },
  { state: 'TENSION', triggers: ['злість', 'тиск', 'напруга', 'вигораю', 'дратує', 'хаос', 'перевантаж'] },
  { state: 'INNER_SUPPORT', triggers: ['спокій', 'вдячн', 'опора', 'дихаю', 'ясність', 'в ресурсі'] },
  { state: 'STABILITY', triggers: ['стабільно', 'тримаюся', 'йду далі', 'системно', 'зробила', 'виконала'] },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function detectIntensity(text: string) {
  const exclamations = (text.match(/!/g) ?? []).length
  const questions = (text.match(/\?/g) ?? []).length
  const repeated = /(.)\1{2,}/.test(text) ? 1 : 0
  const uppercaseWords = text.split(/\s+/).filter((word) => word.length > 2 && word === word.toUpperCase()).length
  return clamp(3 + exclamations + repeated + Math.min(uppercaseWords, 3) + Math.min(questions, 1), 1, 10)
}

function ruleBased(text: string): EmotionSignal | null {
  const lower = text.toLowerCase()
  const matches = RULES
    .map((rule) => {
      const triggers = rule.triggers.filter((trigger) => lower.includes(trigger))
      return { state: rule.state, triggers }
    })
    .filter((item) => item.triggers.length > 0)
    .sort((left, right) => right.triggers.length - left.triggers.length)

  if (!matches.length) return null

  const best = matches[0]
  const confidence = clamp(0.45 + best.triggers.length * 0.18, 0.45, 0.92)
  return {
    state: best.state,
    intensity: detectIntensity(text),
    confidence,
    triggers: best.triggers.slice(0, 4),
  }
}

async function aiFallback(text: string): Promise<EmotionSignal> {
  const parsed = await runGuardedAiTask(
    {
      userId: `voice:${stableHash(text).slice(0, 12)}`,
      source: 'voice-emotion',
      label: 'voice-emotion',
      payloadHash: stableHash(text),
      throttleMs: 5_000,
      duplicateWindowMs: 5 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Визнач домінантний стан із набору FEAR, TENSION, STABILITY, INNER_SUPPORT, NEUTRAL. Поверни JSON { "state": "...", "confidence": 0-1, "triggers": ["..."] }.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 120,
      })
      return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as {
        state?: DailyState
        confidence?: number
        triggers?: string[]
      }
    },
    () => ({ state: 'NEUTRAL' as DailyState, confidence: 0.4, triggers: [] as string[] }),
  )

  return {
    state: parsed.state ?? 'NEUTRAL',
    intensity: detectIntensity(text),
    confidence: clamp(Number(parsed.confidence ?? 0.4), 0.3, 0.85),
    triggers: Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 4) : [],
  }
}

export async function detectEmotion(text: string): Promise<EmotionSignal> {
  const fast = ruleBased(text)
  if (fast && fast.confidence >= 0.7) {
    return fast
  }

  const fallback = await aiFallback(text)
  if (!fast) return fallback

  return fallback.confidence >= fast.confidence
    ? fallback
    : fast
}
