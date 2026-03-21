// backend/src/modules/telegram-mentor/handlers/morning.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { DailyChoice, DailyState, Prisma } from '@starway/db/prisma-client'
import { openai } from '../../../lib/openai.js'
import { ensureUserExpertId } from '../../ai-mentor/helpers.js'
import { updateUserState } from '../../ai-mentor/state.service.js'
import { trackEvent } from '../../events/service.js'
import { getSession, updateSession, clearSession } from '../session.js'
import { cancelKeyboard } from '../keyboards.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

// ── Якщо в daily-cycle/service.ts є createDailyEntry(userId, data) — використай його.
// ── Якщо ні — залишай пряме prisma.dailyEntry.create.

const MORNING_QUESTIONS = [
  '🌅 *Ранкове питання 1/3*\n\nЯкий твій стан прямо зараз?\n_(напиши одним реченням)_',
  '🌅 *Ранкове питання 2/3*\n\nЩо найважливіше для тебе сьогодні?\n_(одна конкретна дія)_',
  '🌅 *Ранкове питання 3/3*\n\nЩо може заважати?\n_(чесно)_',
]

async function getPendingTask(userId: string): Promise<{ id: string; title: string } | null> {
  return prisma.microTask.findFirst({
    where: {
      userId,
      isCompleted: false,
    },
    orderBy: { dueAt: 'asc' },
    select: {
      id: true,
      title: true,
    },
  })
}

export async function handleMorning(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE DISABLED]
    // Original morning flow remains below for normal mode.
    return
  }

  try {
    const chatId  = String(ctx.chat?.id)
    const session = await getSession(chatId)
    if (!session) {
      await sendEntryOffer(ctx)
      return
    }

    const pendingTask = await getPendingTask(session.userId)
    if (pendingTask) {
      await trackEvent({
        userId: session.userId,
        type: 'telegram_morning_blocked',
        source: 'telegram',
        state: 'day',
        payload: {
          reason: 'pending_task',
          taskId: pendingTask.id,
        },
      })
      await ctx.reply(
        `📋 У тебе вже є активне завдання:\n\n${pendingTask.title}\n\nСпочатку заверши його або відкрий список завдань.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Мої завдання', callback_data: 'open_tasks' }],
              [{ text: '📊 Мій стан', callback_data: 'open_status' }],
            ],
          },
        },
      )
      return
    }

    await trackEvent({
      userId: session.userId,
      type: 'telegram_morning_started',
      source: 'telegram',
      state: 'morning',
    })
    await updateSession(session.userId, chatId, 'morning_q1', {}, 0)
    await ctx.reply(MORNING_QUESTIONS[0], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
  } catch (error) {
    console.error('[TelegramMentor] morning start error:', error)
    const chatId = String(ctx.chat?.id)
    const session = await getSession(chatId)
    if (session?.userId) {
      await sendStateMenu(ctx, session.userId)
      return
    }

    await sendEntryOffer(ctx)
  }
}

export async function handleMorningAnswer(ctx: Context, answer: string) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) return

  const morning = session.data.morning ?? {}

  if (session.state === 'morning_q1') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_morning_answered',
      source: 'telegram',
      state: 'morning',
      payload: {
        step: 'q1',
        text: answer,
      },
    })
    morning.q1 = answer
    await updateSession(session.userId, chatId, 'morning_q2', { ...session.data, morning }, 1)
    await ctx.reply(MORNING_QUESTIONS[1], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
    return
  }

  if (session.state === 'morning_q2') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_morning_answered',
      source: 'telegram',
      state: 'morning',
      payload: {
        step: 'q2',
        text: answer,
      },
    })
    morning.q2 = answer
    await updateSession(session.userId, chatId, 'morning_q3', { ...session.data, morning }, 2)
    await ctx.reply(MORNING_QUESTIONS[2], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
    return
  }

  if (session.state === 'morning_q3') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_morning_answered',
      source: 'telegram',
      state: 'morning',
      payload: {
        step: 'q3',
        text: answer,
      },
    })
    morning.q3 = answer

    // Зберігаємо в DailyEntry — перевір назву моделі в schema.prisma
    // Якщо є dailyEntry — використовуй, якщо DailyEntry — відповідно
    try {
      const expertId = await ensureUserExpertId(session.userId)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await prisma.dailyEntry.upsert({
        where: {
          userId_date: {
            userId: session.userId,
            date: today,
          },
        },
        create: {
          userId: session.userId,
          expertId,
          date: today,
          state: DailyState.STABILITY,
          choice: DailyChoice.PENDING,
          dayFact: `Ранок: стан="${morning.q1}" фокус="${morning.q2}" перешкода="${morning.q3}"`,
          content: {
            morning,
          } as Prisma.InputJsonValue,
          microSupport: Prisma.JsonNull,
        },
        update: {
          state: DailyState.STABILITY,
          choice: DailyChoice.PENDING,
          dayFact: `Ранок: стан="${morning.q1}" фокус="${morning.q2}" перешкода="${morning.q3}"`,
          content: {
            morning,
          } as Prisma.InputJsonValue,
        },
      })
    } catch (error) {
      console.error('[TelegramMentor] morning dailyEntry wrapper failed', error)
    }

    try {
      await updateUserState({
        userId: session.userId,
        source: 'morning',
        answers: {
          q1: morning.q1,
          q2: morning.q2,
          q3: morning.q3,
        },
      })
    } catch (error) {
      console.error('[TelegramMentor] morning state normalization failed', error)
    }

    const aiReply = await getMorningAI(morning, session.userId)
    await clearSession(session.userId, chatId)
    await trackEvent({
      userId: session.userId,
      type: 'telegram_morning_completed',
      source: 'telegram',
      state: 'day',
      payload: {
        createdTask: !aiReply.includes('Нове завдання не створюю'),
      },
    })
    await ctx.reply(
      `✅ *Ранковий чекін завершено!*\n\n${aiReply}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Мій стан', callback_data: 'open_status' }],
            [{ text: '✨ Спробувати 7 днів', callback_data: 'start_trial' }],
          ],
        },
      },
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

    const pendingTask = await getPendingTask(userId)
    if (pendingTask) {
      return `${text || '📋 Чекін збережено!'}\n\n📋 Нове завдання не створюю, бо в тебе вже є активне:\n${pendingTask.title}`
    }

    if (text) {
      const taskMatch = text.match(/завдання[:\s]+(.+)/i)
      if (taskMatch?.[1]) {
        try {
          const expertId = await ensureUserExpertId(userId)
          await prisma.microTask.create({
            data: {
              userId,
              expertId,
              title:   taskMatch[1].slice(0, 200),
              dueAt: new Date(Date.now() + 86400000),
            },
          })
        } catch (error) {
          console.error('[TelegramMentor] morning microTask create failed', error)
        }
      }
    }

    return text || '📋 Чекін збережено!'
  } catch (error) {
    console.error('[TelegramMentor] morning AI reply failed', error)
    return '📋 Чекін збережено. Гарного дня!'
  }
}
