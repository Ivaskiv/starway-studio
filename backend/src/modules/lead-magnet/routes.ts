import { Router, Request } from 'express'
import type { Response } from 'express'
import { authenticate, authRequired } from '../auth/middleware/auth.js'
import { getLeadMagnetStatus, registerLeadMagnet } from './controller.js'
import { openai } from '../../lib/openai.js'
import { serverError } from '../../utils/serverError.js'

const router = Router()

// Публічна реєстрація (ім'я + телефон → створити юзера + free план)
router.post('/register', registerLeadMagnet)

// Статус проходження (для авторизованих)
router.get('/status', authRequired, getLeadMagnetStatus)

router.post('/generate-ads', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { productName, targetAudience, platform, tone = 'direct' } = req.body as {
    productName: string
    targetAudience: string
    platform: 'instagram' | 'facebook' | 'telegram'
    tone?: 'direct' | 'emotional' | 'provocative'
  }

  const platformFormats: Record<string, string> = {
    instagram: 'Reels caption (до 150 символів) + 5 хештегів + CTA',
    facebook: 'Post text (до 300 символів) + заголовок для банера',
    telegram: 'Пост для каналу (до 200 символів) + emoji + посилання',
  }

  const toneMap: Record<string, string> = {
    direct: 'жорстка ясність, без мотивації, конкретні факти',
    emotional: 'емоційне залучення, болі аудиторії, трансформація',
    provocative: 'провокація, незручна правда, контраст до/після',
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      temperature: 0.75,
      messages: [
        {
          role: 'system',
          content: `Ти — копірайтер рекламних постів для Ukraine-coaching ніші.
Тон: ${toneMap[tone]}.
Мова: ТІЛЬКИ українська.
Формат відповіді: JSON з полями text, headline, hashtags, cta.`,
        },
        {
          role: 'user',
          content: `Продукт: ${productName}
Цільова аудиторія: ${targetAudience}
Платформа та формат: ${platformFormats[platform]}

Згенеруй 3 варіанти рекламного тексту. JSON масив objects з полями: variant, text, headline, hashtags (масив), cta.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    let variants = []
    try { variants = JSON.parse(clean) } catch { variants = [] }

    res.json({ variants, platform, tone })
  } catch (err) {
    serverError(res, 'generate-ads', err)
  }
})
export default router
