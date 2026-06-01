import Anthropic from '@anthropic-ai/sdk'

import type { ReelsVariant } from '../pipeline.types.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateReelsVariants(topic: string): Promise<ReelsVariant[]> {
  const prompt = buildGenerationPrompt(topic)
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4000,
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
