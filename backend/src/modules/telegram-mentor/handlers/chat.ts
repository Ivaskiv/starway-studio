// backend/src/modules/telegram-mentor/handlers/chat.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { getSession, updateSession } from '../session.js'
import { mainMenuKeyboard } from '../keyboards.js'

const MAX_HISTORY = 10

export async function handleChat(ctx: Context, message: string) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) {
    await ctx.reply('❌ Спочатку прив\'яжи акаунт. /start')
    return
  }

  const { userId } = session
  const history    = (session.data.chatHistory ?? []).slice(-MAX_HISTORY)

  const [streak, wheel, goal] = await Promise.all([
    (prisma as any).streak?.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
    (prisma as any).wheelAssessment?.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
    (prisma as any).goalsSet?.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
  ])

  const scores  = wheel?.scores as Record<string, number> | undefined
  const avg     = scores
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
    : null
  const weakSph = scores ? Object.entries(scores).sort(([, a], [, b]) => a - b)[0]?.[0] : null
  const goalText = goal?.text ?? goal?.mainGoal ?? 'не задана'

  await ctx.sendChatAction('typing')

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  300,
      temperature: 0.65,
      messages: [
        {
          role:    'system',
          content: `Ти — AI-ментор Starway. Telegram.
Методологія: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
Тон: жорстка ясність. Без "ти молодець". Мова: ТІЛЬКИ українська.
Максимум 3-4 речення + 1 питання або крок.

Контекст:
- Streak: ${streak?.current ?? 0} днів
- Колесо: ${avg != null ? `${avg}/10, слабка: ${weakSph}` : 'не заповнено'}
- Ціль: ${goalText}`,
        },
        ...history,
        { role: 'user', content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content ?? 'Системна помилка.'

    const newHistory = [
      ...history,
      { role: 'user' as const,      content: message },
      { role: 'assistant' as const, content: reply   },
    ].slice(-MAX_HISTORY)

    await updateSession(userId, chatId, 'chat', { ...session.data, chatHistory: newHistory })
    await ctx.reply(reply, mainMenuKeyboard)
  } catch (err) {
    console.error('[TelegramMentor] chat error:', err)
    await ctx.reply('⚠️ Помилка. Спробуй пізніше.', mainMenuKeyboard)
  }
}