// backend/src/modules/ai-generator/products-generator/producer.ts
// Hero варіанти + рекламні тексти для AI Producer
// Імпортується з: ai-generator/controller.ts, ai-generator/service.ts

import { openai } from '../../../lib/openai.js'

// ── Типи ─────────────────────────────────────────────────────────────────────

export interface HeroVariant {
  headline:    string
  subline:     string
  cta:         string
  angle:       'pain' | 'desire' | 'curiosity'
  description: string  // коротке пояснення чому цей кут
}

export interface AdTexts {
  facebook:           string
  instagram_caption:  string
  tiktok_hook:        string
  stories:            string
  reels_script:       string
}

export interface HeroGenerateInput {
  niche:          string
  targetAudience: string
  utp:            string
  tone?:          'serious' | 'inspiring' | 'provocative' | 'soft'
  language?:      'uk' | 'en'
}

export interface AdTextsInput {
  niche:          string
  targetAudience: string
  heroHeadline:   string
  language?:      'uk' | 'en'
}

// ── Tone map ──────────────────────────────────────────────────────────────────
const TONE_MAP: Record<NonNullable<HeroGenerateInput['tone']>, string> = {
  serious:     'серйозний, авторитетний, без зайвих емоцій',
  inspiring:   'надихаючий, теплий, підтримуючий',
  provocative: 'провокуючий, незручний, викликає дію',
  soft:        "м'який, обережний, без тиску",
}

// ── generateHeroVariants ──────────────────────────────────────────────────────
export async function generateHeroVariants(input: HeroGenerateInput): Promise<HeroVariant[]> {
  const lang   = input.language === 'en' ? 'англійською' : 'українською'
  const tone   = TONE_MAP[input.tone ?? 'inspiring']

  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.7,
    max_tokens:  800,
    messages: [
      {
        role:    'system',
        content: [
          `Ти — копірайтер-маркетолог. Відповідай ${lang}.`,
          'Повертай ТІЛЬКИ валідний JSON об\'єкт. Без коментарів, без markdown.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `Ніша: ${input.niche}`,
          `ЦА: ${input.targetAudience}`,
          `УТП: ${input.utp}`,
          `Тон: ${tone}`,
          '',
          'Згенеруй 3 Hero-варіанти (pain, desire, curiosity).',
          'JSON формат:',
          '{"variants":[',
          '  {"headline":"...","subline":"...","cta":"...","angle":"pain","description":"..."},',
          '  {"headline":"...","subline":"...","cta":"...","angle":"desire","description":"..."},',
          '  {"headline":"...","subline":"...","cta":"...","angle":"curiosity","description":"..."}',
          ']}',
        ].join('\n'),
      },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw) as { variants?: HeroVariant[] }
    const variants = parsed.variants ?? []

    // Валідація мінімальних полів
    return variants.filter(v =>
      typeof v.headline === 'string' &&
      typeof v.subline  === 'string' &&
      typeof v.cta      === 'string',
    )
  } catch {
    console.error('❌ generateHeroVariants parse error:', raw)
    return []
  }
}

// ── generateAdTexts ───────────────────────────────────────────────────────────
export async function generateAdTexts(input: AdTextsInput): Promise<AdTexts> {
  const lang = input.language === 'en' ? 'англійською' : 'українською'

  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.7,
    max_tokens:  1000,
    messages: [
      {
        role:    'system',
        content: `Ти — таргетолог і копірайтер. Відповідай ${lang}. Тільки JSON, без markdown.`,
      },
      {
        role: 'user',
        content: [
          `Ніша: ${input.niche}`,
          `ЦА: ${input.targetAudience}`,
          `Hero заголовок: ${input.heroHeadline}`,
          '',
          'Напиши рекламні тексти для кожного каналу. JSON:',
          '{',
          '  "facebook": "пост 150-200 слів з CTA",',
          '  "instagram_caption": "підпис 80-120 слів + 5-7 хештегів",',
          '  "tiktok_hook": "перші 3 секунди відео — гачок 1-2 речення",',
          '  "stories": "текст для Stories 2-3 слайди",',
          '  "reels_script": "скрипт Reels 15-30 сек — гачок, суть, CTA"',
          '}',
        ].join('\n'),
      },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw) as Partial<AdTexts>
    return {
      facebook:          parsed.facebook          ?? '',
      instagram_caption: parsed.instagram_caption ?? '',
      tiktok_hook:       parsed.tiktok_hook       ?? '',
      stories:           parsed.stories           ?? '',
      reels_script:      parsed.reels_script      ?? '',
    }
  } catch {
    console.error('❌ generateAdTexts parse error:', raw)
    return {
      facebook: '', instagram_caption: '', tiktok_hook: '', stories: '', reels_script: '',
    }
  }
}