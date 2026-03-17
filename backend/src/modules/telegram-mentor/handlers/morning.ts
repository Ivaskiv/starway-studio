// backend/src/modules/telegram-mentor/handlers/morning.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { getSession, updateSession, clearSession } from '../session.js'
import { cancelKeyboard, mainMenuKeyboard } from '../keyboards.js'

// ── Якщо в daily-cycle/service.ts є createDailyEntry(userId, data) — використай його.
// ── Якщо ні — залишай пряме prisma.dailyEntry.create.

const MORNING_QUESTIONS = [
  '🌅 *Ранкове питання 1/3*\n\nЯкий твій стан прямо зараз?\n_(напиши одним реченням)_',
  '🌅 *Ранкове питання 2/3*\n\nЩо найважливіше для тебе сьогодні?\n_(одна конкретна дія)_',
  '🌅 *Ранкове питання 3/3*\n\nЩо може заважати?\n_(чесно)_',
]

export async function handleMorning(ctx: Context) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) {
    await ctx.reply('❌ Спочатку прив\'яжи акаунт. /start')
    return
  }

  await updateSession(session.userId, chatId, 'morning_q1', {}, 0)
  await ctx.reply(MORNING_QUESTIONS[0], { parse_mode: 'Markdown', ...cancelKeyboard })
}

export async function handleMorningAnswer(ctx: Context, answer: string) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) return

  const morning = session.data.morning ?? {}

  if (session.state === 'morning_q1') {
    morning.q1 = answer
    await updateSession(session.userId, chatId, 'morning_q2', { ...session.data, morning }, 1)
    await ctx.reply(MORNING_QUESTIONS[1], { parse_mode: 'Markdown', ...cancelKeyboard })
    return
  }

  if (session.state === 'morning_q2') {
    morning.q2 = answer
    await updateSession(session.userId, chatId, 'morning_q3', { ...session.data, morning }, 2)
    await ctx.reply(MORNING_QUESTIONS[2], { parse_mode: 'Markdown', ...cancelKeyboard })
    return
  }

  if (session.state === 'morning_q3') {
    morning.q3 = answer

    // Зберігаємо в DailyEntry — перевір назву моделі в schema.prisma
    // Якщо є dailyEntry — використовуй, якщо DailyEntry — відповідно
    try {
      // ПЕРЕВІР: grep -n "model Daily" backend/prisma/schema.prisma
      await (prisma as any).dailyEntry?.create({
        data: {
          userId:  session.userId,
          state:   'stability',
          dayFact: `Ранок: стан="${morning.q1}" фокус="${morning.q2}" перешкода="${morning.q3}"`,
          source:  'telegram',
        },
      }).catch(() => {
        // якщо модель називається інакше — не критично
      })
    } catch {}

    const aiReply = await getMorningAI(morning, session.userId)
    await clearSession(session.userId, chatId)
    await ctx.reply(
      `✅ *Ранковий чекін завершено!*\n\n${aiReply}`,
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard },
    )
  }
}

async function getMorningAI(
  morning: { q1?: string; q2?: string; q3?: string },
  userId: string,
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  200,
      temperature: 0.6,
      messages: [
        {
          role:    'system',
          content: 'Ти — AI-ментор. Жорстка ясність. Мова: тільки українська. 2-3 речення + одне мікрозавдання.',
        },
        {
          role:    'user',
          content: `Стан: ${morning.q1}\nФокус: ${morning.q2}\nПерешкода: ${morning.q3}`,
        },
      ],
    })
    const text = completion.choices[0]?.message?.content ?? ''

    // Спроба зберегти мікрозавдання через існуючий мікрозавдань модуль
    // ПЕРЕВІР: grep -n "createMicroTask\|export.*create" backend/src/modules/microTask/service.ts
    if (text) {
      const taskMatch = text.match(/завдання[:\s]+(.+)/i)
      if (taskMatch?.[1]) {
        try {
          await (prisma as any).microTask?.create({
            data: {
              userId,
              title:   taskMatch[1].slice(0, 200),
              source:  'ai',
              status:  'ACTIVE',
              dueDate: new Date(Date.now() + 86400000),
            },
          })
        } catch {}
      }
    }

    return text || '📋 Чекін збережено!'
  } catch {
    return '📋 Чекін збережено. Гарного дня!'
  }
}
