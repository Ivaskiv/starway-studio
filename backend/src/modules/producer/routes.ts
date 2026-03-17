// backend/src/modules/producer/routes.ts
import { Request, Router } from 'express'
import type { Response } from 'express'
import { authenticate, authRequired } from '../auth/middleware/auth.js'
import { requireGenerationQuota } from '../quota/generation.middleware.js'
import { funnelHandler, seoHandler, targetingHandler, assistantProgress } from './controller.js'

// backend/src/modules/producer/producer.routes.ts
// ════════════════════════════════════════════════════════════
// API маршрути AI-продюсера
// POST /api/producer/generate-mentor  — генерація повного плану
// POST /api/producer/chat             — чат з продюсером
// POST /api/producer/affirmation      — генерація афірмації
// POST /api/producer/micro-task       — генерація мікрозавдання
// ════════════════════════════════════════════════════════════

import {
  generateMentorPlan,
  producerChat,
  generateAffirmation,
  generateMicroTask,
}                                    from './service.js'
import type {
  GenerateMentorBody,
  ProducerChatBody,
}                                    from './types.js'
import { serverError } from '../../utils/serverError.js'
import { openai } from '../../lib/openai.js'

const router = Router()

// ── POST /generate-mentor ──────────────────────────────────────
router.post('/generate-mentor', authenticate, async (req: Request, res: Response) => {
  try {
    const { wizardData } = req.body as GenerateMentorBody
    const required = ['name', 'transformation', 'audience', 'wheelSpheres']
    const missing  = required.filter(f => !wizardData?.[f as keyof typeof wizardData])
    if (missing.length) return res.status(400).json({ error: `Відсутні поля: ${missing.join(', ')}` })
    const result = await generateMentorPlan(wizardData)
    res.json({ success: true, plan: result })
  } catch (err) { serverError(res, 'generate mentor plan', err) }
})

// ── POST /chat ─────────────────────────────────────────────────
router.post('/chat', authenticate, async (req: Request, res: Response) => {
  try {
    const { message, history = [], mentorContext, stepFocus } = req.body as ProducerChatBody
    if (!message?.trim()) return res.status(400).json({ error: 'Порожнє повідомлення' })
    const reply = await producerChat({
      messages: [...history.slice(-12), { role: 'user', content: message }],
      mentorContext,
      stepFocus,
    })
    res.json({ reply })
  } catch (err) { serverError(res, 'producer chat', err) }
})

// ── POST /affirmation ──────────────────────────────────────────
router.post('/affirmation', authenticate, async (req: Request, res: Response) => {
  try {
    const { userName, focusSphere, currentGoal, stateScore } = req.body
    const affirmation = await generateAffirmation({
      userName,
      focusSphere: focusSphere ?? 'Баланс',
      currentGoal: currentGoal ?? 'жити в гармонії',
      stateScore:  stateScore  ?? 5,
    })
    res.json({ affirmation })
  } catch (err) { serverError(res, 'generate affirmation', err) }
})

// ── POST /micro-task ───────────────────────────────────────────
router.post('/micro-task', authenticate, async (req: Request, res: Response) => {
  try {
    const { focusSphere, lowestSphere, stateScore, recentDrains, userName } = req.body
    const task = await generateMicroTask({
      userName, focusSphere: focusSphere ?? 'Здоров\'я',
      lowestSphere: lowestSphere ?? 'Відпочинок',
      stateScore: stateScore ?? 5, recentDrains: recentDrains ?? [],
    })
    res.json({ task })
  } catch (err) { serverError(res, 'generate micro task', err) }
})

router.get('/assistant-progress', authRequired, assistantProgress)


// ── POST /api/producer/content-factory ───────────────────────────────────────
// Генерує контент за типом: content_plan | reels_script | email_series | banner_copy
router.post('/content-factory', authenticate, async (req: Request, res: Response) => {
  const {
    type,
    productName,
    expertName,
    targetAudience,
    transformation,
    funnelUrl,
    tone = 'direct',
    days = 30,
    emailCount = 5,
  } = req.body as {
    type:           'content_plan' | 'reels_script' | 'email_series' | 'banner_copy'
    productName:    string
    expertName:     string
    targetAudience: string
    transformation: string
    funnelUrl:      string
    tone?:          'direct' | 'emotional' | 'provocative'
    days?:          number
    emailCount?:    number
  }

  if (!type || !productName || !targetAudience || !transformation) {
    return res.status(400).json({ error: 'Заповніть всі обов\'язкові поля' })
  }

  const toneMap: Record<string, string> = {
    direct:      'жорстка ясність, конкретні факти, без мотивації',
    emotional:   'емоційне залучення, болі аудиторії, трансформація',
    provocative: 'провокація, незручна правда, контраст до/після',
  }

  const prompts: Record<string, string> = {
    content_plan: `Створи контент-план на ${days} днів для просування продукту.

Продукт: "${productName}"
Експерт: ${expertName}
Аудиторія: ${targetAudience}
Трансформація: ${transformation}
Тон: ${toneMap[tone]}
Посилання: ${funnelUrl}

Відповідь — валідний JSON масив (БЕЗ markdown, БЕЗ коментарів):
[
  {
    "day": 1,
    "date_label": "День 1",
    "platform": "Instagram" | "Telegram" | "обидва",
    "type": "прогрів" | "цінність" | "кейс" | "продаж" | "залучення",
    "hook": "перший рядок поста — зупиняє скролінг",
    "text": "повний текст поста 150-250 символів",
    "cta": "заклик до дії в кінці",
    "hashtags": ["#тег1", "#тег2"]
  }
]
Рівно ${days} об'єктів. Чергуй типи: прогрів→цінність→кейс→продаж→залучення.`,

    reels_script: `Створи детальний скрипт для Reels/TikTok відео 60 секунд.

Продукт: "${productName}"
Експерт: ${expertName}
Аудиторія: ${targetAudience}
Трансформація: ${transformation}
Тон: ${toneMap[tone]}

Відповідь — валідний JSON (БЕЗ markdown):
{
  "title": "назва відео",
  "hook_text": "текст на екрані в перші 3 секунди",
  "segments": [
    {
      "second_start": 0,
      "second_end": 3,
      "what_to_say": "що говорити",
      "on_screen_text": "текст на екрані або null",
      "action": "дія або жест або null"
    }
  ],
  "caption": "caption для поста з хештегами",
  "cta_end": "заклик в кінці відео"
}
Сегменти покривають рівно 0-60 секунд.`,

    email_series: `Створи серію з ${emailCount} листів для email-воронки.

Продукт: "${productName}"
Експерт: ${expertName}
Аудиторія: ${targetAudience}
Трансформація: ${transformation}
Тон: ${toneMap[tone]}
Посилання: ${funnelUrl}

Відповідь — валідний JSON масив (БЕЗ markdown):
[
  {
    "number": 1,
    "send_day": 0,
    "type": "welcome" | "value" | "story" | "objection" | "sale",
    "subject": "тема листа (до 60 символів)",
    "preview": "прев'ю тексту (до 90 символів)",
    "body": "повний текст листа 200-400 слів в HTML або plain text",
    "cta_text": "текст кнопки",
    "cta_url": "${funnelUrl}"
  }
]
Рівно ${emailCount} листів. День 0=відразу, 1=+1 день, 3=+3 дні і т.д.`,

    banner_copy: `Створи тексти для рекламних банерів.

Продукт: "${productName}"
Експерт: ${expertName}
Аудиторія: ${targetAudience}
Трансформація: ${transformation}
Тон: ${toneMap[tone]}
Посилання: ${funnelUrl}

Відповідь — валідний JSON масив (БЕЗ markdown):
[
  {
    "format": "square_1080" | "stories_1080" | "facebook_banner",
    "label": "Квадрат 1080×1080" | "Stories 1080×1920" | "Facebook банер",
    "headline": "заголовок до 40 символів",
    "subheadline": "підзаголовок до 70 символів",
    "cta": "текст кнопки до 20 символів",
    "badge": "бейдж або null (наприклад БЕЗКОШТОВНО)"
  }
]
Рівно 3 формати.`,
  }

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  type === 'content_plan' ? 4000 : type === 'email_series' ? 3000 : 1500,
      temperature: 0.7,
      messages: [
        {
          role:    'system',
          content: 'Ти — контент-стратег для Ukrainian coaching ніші. Відповідай ТІЛЬКИ валідним JSON. Без коментарів, без markdown, без пояснень.',
        },
        { role: 'user', content: prompts[type] },
      ],
    })

    const raw   = completion.choices[0]?.message?.content ?? '[]'
    const clean = raw.replace(/```json|```/g, '').trim()

    let result: unknown
    try {
      result = JSON.parse(clean)
    } catch {
      return res.status(500).json({ error: 'AI повернув невалідний JSON', raw: raw.slice(0, 300) })
    }

    res.json({ success: true, type, result })
  } catch (err) {
    serverError(res, 'producer/content-factory', err)
  }
})

export default router
