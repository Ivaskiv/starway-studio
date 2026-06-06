import Anthropic from '@anthropic-ai/sdk'
import { calculateAiCostUsd, getCostTier } from '@starway/ai/providers/pricing'

import type { ReelsVariant } from '../pipeline.types.js'
import { hashCacheParts, rememberResultCache, resultCache } from '../../sales-assistant/sales-assistant.helpers.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function ensureAnthropicConfigured(): void {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey || apiKey === 'SET') {
    throw new Error('anthropic_not_configured')
  }
}

export async function generateReelsVariants(topic: string): Promise<ReelsVariant[]> {
  ensureAnthropicConfigured()
  const normalizedTopic = topic.replace(/\s+/g, ' ').trim()
  const prompt = buildGenerationPrompt(normalizedTopic)
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  const maxTokens = 2400
  const cacheKey = hashCacheParts([
    'content-pipeline-reels',
    model,
    maxTokens,
    prompt,
  ])
  const cached = resultCache.get(cacheKey)
  if (cached) {
    const variants = parseVariantsFromResponse(cached.content)
    if (variants.length !== 3) {
      throw new Error(`Очікувались 3 варіанти, отримано ${variants.length}`)
    }
    return variants
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const textParts = response.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
  const text = textParts.join('\n').trim()

  const variants = parseVariantsFromResponse(text)
  if (variants.length !== 3) {
    throw new Error(`Очікувались 3 варіанти, отримано ${variants.length}`)
  }
  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const actualCostUsd = calculateAiCostUsd(model, inputTokens, outputTokens)
  rememberResultCache(cacheKey, {
    content: text,
    usage: {
      provider: 'claude',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: actualCostUsd,
      actualCostUsd,
      costTier: getCostTier(actualCostUsd),
    },
  })
  return variants
}

function buildGenerationPrompt(topic: string): string {
  return `
Ти AI Content агент Starway Studio.
Тема рілсу: "${topic}"

Згенеруй 3 варіанти сценарію Reels (30 сек, 9:16, Instagram/TikTok/Shorts).

Варіант А — позиція ОГОЛЕНА ПРАВДА (холодний трафік, провокація)
Варіант Б — позиція ПСИХОЛОГІЯ ДІЇ (прогрів, впізнавання)
Варіант В — позиція ГОЛОВНИЙ АРХІТЕКТОР (система, цифри, механіка)

Для КОЖНОГО варіанту дай JSON:
{
  "id": "A",
  "position": "TRUTH",
  "hook": "текст хуку (0-3 сек)",
  "scenes": [
    {
      "order": 1,
      "timeFrom": 0,
      "timeTo": 3,
      "screenText": "текст на екрані",
      "visualDescription": "що на екрані",
      "klingPrompt": "English prompt for Kling AI",
      "mood": "настрій сцени"
    }
  ],
  "voiceScript": "повний текст для ElevenLabs",
  "cta": "текст CTA (25-30 сек)"
}

ПРАВИЛА ТЕКСТУ (STARWAY DNA):
- ніякого "трансформуйся", "проявленість", "ресурс"
- конкретна ситуація з реального життя
- початок з дії або поведінки
- питання або тиск у CTA

Відповідь: масив з 3 JSON об'єктів, без зайвого тексту.
`
}

function parseVariantsFromResponse(text: string): ReelsVariant[] {
  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(cleaned) as ReelsVariant[]
  } catch {
    throw new Error(`Помилка парсингу варіантів від Claude: ${text.slice(0, 300)}`)
  }
}
