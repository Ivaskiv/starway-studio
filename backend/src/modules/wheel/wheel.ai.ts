// backend/src/modules/wheel/wheel.ai.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type WheelUserContext = {
  name?: string | null
  email?: string | null
  phone?: string | null
  gender?: string | null
  age?: number | null
}

type WheelScore = {
  sphere: string
  score: number
  comment?: string
}

const SPHERE_LABELS: Record<string, string> = {
  money: 'Гроші',
  realization: 'Реалізація',
  relationships: 'Відносини',
  energy: 'Енергія / Тіло',
  freedom: 'Свобода / Час',
  inner_support: 'Внутрішня опора',
  health: "Здоровʼя",
  growth: 'Розвиток',
}

export async function generateWheelAnalysis(
  scores: WheelScore[],
  user: WheelUserContext
): Promise<string> {
  const spheresText = scores
    .map(
      (s) =>
        `${SPHERE_LABELS[s.sphere] ?? s.sphere}: ${s.score}/10 (${s.comment ?? 'без коментаря'})`
    )
    .join('\n')

  const userContext = `
Імʼя: ${user.name ?? 'невідомо'}
Email: ${user.email ?? 'немає'}
Вік: ${user.age ?? 'невідомо'}
Стать: ${user.gender ?? 'невідомо'}
`.trim()

  const prompt = `
Ти AI-ментор. Аналізуй колесо балансу користувача.

Тон: жорстка ясність, без підтримки й мотивації.
Без порад. Тільки факти.

Користувач:
${userContext}

Дані:
${spheresText}

Сформуй аналіз (2–3 речення):
1. Найслабша сфера
2. Ключовий перекіс
3. Де реальний фокус
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 200,
  })

  return response.choices[0]?.message?.content ?? 'Аналіз недоступний'
}
