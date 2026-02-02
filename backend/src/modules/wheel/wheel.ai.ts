import OpenAI from 'openai'
import { WheelScore, WheelUserContext } from './wheel.types.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateWheelAnalysis(
  scores: WheelScore[],
  user: WheelUserContext,
): Promise<string> {
  const weakest = scores.reduce((min, s) =>
    s.score < min.score ? s : min,
  )

  const userContext = `
Імʼя: ${user.name ?? 'невідомо'}
Email: ${user.email ?? 'немає'}
Вік: ${user.age ?? 'невідомо'}
Стать: ${user.gender ?? 'невідомо'}
`.trim()

  const prompt = `
Ти AI-ментор. Аналізуй колесо балансу користувача.
Без мотивації. Без підтримки. Тільки факти.

${userContext}

Найслабша сфера: ${weakest.categoryId}
Оцінка: ${weakest.score}/10

Сформуй короткий аналіз (2–3 речення):
1. Де перекіс
2. Чому це критично
3. Реальний фокус
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 200,
  })

  return response.choices[0]?.message?.content ?? 'Аналіз недоступний'
}
