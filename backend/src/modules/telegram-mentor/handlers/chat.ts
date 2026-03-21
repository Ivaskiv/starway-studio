// backend/src/modules/telegram-mentor/handlers/chat.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { trackEvent } from '../../events/service.js'
import { getSession, updateSession } from '../session.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

const MAX_HISTORY = 10

export async function handleChat(ctx: Context, message: string) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE] AI disabled during funnel-only phase.
    await ctx.reply(
      'Зараз ти проходиш безкоштовний практикум 👇\nЗаверши його, щоб рухатись далі.',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '▶️ Продовжити', callback_data: 'lm_continue' }]],
        },
      },
    )
    return
  }

  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) {
    await sendEntryOffer(ctx)
    return
  }

  const { userId } = session
  const history    = (session.data.chatHistory ?? []).slice(-MAX_HISTORY)

  const [streak, wheel, goal] = await Promise.all([
    prisma.streak.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
    prisma.wheelAssessment.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
    prisma.goalsSet.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
  ])

  const scores  = wheel?.scores as Record<string, number> | undefined
  const avg     = scores
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
    : null
  const weakSph = scores ? Object.entries(scores).sort(([, a], [, b]) => a - b)[0]?.[0] : null
  const goalText = goal ? JSON.stringify(goal.goals) : 'не задана'

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
    await trackEvent({
      userId,
      type: 'ai_reply_generated',
      source: 'telegram',
      state: 'day',
      payload: {
        reply,
        mode: 'chat',
      },
    })
    await ctx.reply(reply, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Мій стан', callback_data: 'open_status' }],
          [{ text: '✨ Спробувати 7 днів', callback_data: 'start_trial' }],
        ],
      },
    })
  } catch (err) {
    console.error('[TelegramMentor] chat error:', err)
    await sendStateMenu(ctx, userId)
  }
}
