// backend/src/modules/telegram-mentor/handlers/evening.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { getSession, updateSession, clearSession } from '../session.js'
import { cancelKeyboard, mainMenuKeyboard } from '../keyboards.js'

const EVENING_QUESTIONS = [
  '🌙 *Вечірнє питання 1/3*\n\nЩо реально відбулось сьогодні?\n_(факт, без оцінки)_',
  '🌙 *Вечірнє питання 2/3*\n\nЯкий вибір ти зробила — старий чи новий?\n_(чесно)_',
  '🌙 *Вечірнє питання 3/3*\n\nЩо забираєш із сьогодні?\n_(один інсайт або рішення)_',
]

export async function handleEvening(ctx: Context) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) {
    await ctx.reply('❌ Спочатку прив\'яжи акаунт. /start')
    return
  }
  await updateSession(session.userId, chatId, 'evening_q1', {}, 0)
  await ctx.reply(EVENING_QUESTIONS[0], { parse_mode: 'Markdown', ...cancelKeyboard })
}

export async function handleEveningAnswer(ctx: Context, answer: string) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) return

  const evening = session.data.evening ?? {}

  if (session.state === 'evening_q1') {
    evening.q1 = answer
    await updateSession(session.userId, chatId, 'evening_q2', { ...session.data, evening }, 1)
    await ctx.reply(EVENING_QUESTIONS[1], { parse_mode: 'Markdown', ...cancelKeyboard })
    return
  }

  if (session.state === 'evening_q2') {
    evening.q2 = answer
    await updateSession(session.userId, chatId, 'evening_q3', { ...session.data, evening }, 2)
    await ctx.reply(EVENING_QUESTIONS[2], { parse_mode: 'Markdown', ...cancelKeyboard })
    return
  }

  if (session.state === 'evening_q3') {
    evening.q3 = answer

    // Streak оновлення — використовуємо streak/service.ts або пряме оновлення
    // ПЕРЕВІР: grep -n "export\|increment\|upsert" backend/src/modules/streak/service.ts | head -10
    try {
      await (prisma as any).streak?.upsert({
        where:  { userId: session.userId },
        create: { userId: session.userId, current: 1, longest: 1, lastEntryDate: new Date() },
        update: { current: { increment: 1 }, lastEntryDate: new Date() },
      })
    } catch {}

    const aiReply = await getEveningAI(evening)
    await clearSession(session.userId, chatId)
    await ctx.reply(
      `🌙 *Вечірня рефлексія завершена!*\n\n${aiReply}`,
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard },
    )
  }
}

async function getEveningAI(evening: { q1?: string; q2?: string; q3?: string }): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  150,
      temperature: 0.6,
      messages: [
        {
          role:    'system',
          content: 'Ти — AI-ментор. Без мотивації. Фіксуй факти. Мова: тільки українська. 2-3 речення.',
        },
        {
          role:    'user',
          content: `Факт: ${evening.q1}\nВибір: ${evening.q2}\nІнсайт: ${evening.q3}`,
        },
      ],
    })
    return completion.choices[0]?.message?.content ?? '✅ День зафіксовано.'
  } catch {
    return '✅ День зафіксовано. Гарного відпочинку!'
  }
}
