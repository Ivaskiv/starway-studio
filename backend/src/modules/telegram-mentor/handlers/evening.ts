// backend/src/modules/telegram-mentor/handlers/evening.ts

import type { Context } from 'telegraf'
import { openai } from '../../../lib/openai.js'
import { ensureUserExpertId } from '../../ai-mentor/helpers.js'
import { trackEvent } from '../../events/service.js'
import { updateUserState } from '../../ai-mentor/state.service.js'
import { getSession, updateSession, clearSession } from '../session.js'
import { cancelKeyboard } from '../keyboards.js'
import { registerStreakActivity } from '../../streak/service.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

const EVENING_QUESTIONS = [
  '🌙 *Вечірнє питання 1/3*\n\nЩо реально відбулось сьогодні?\n_(факт, без оцінки)_',
  '🌙 *Вечірнє питання 2/3*\n\nЯкий вибір ти зробила — старий чи новий?\n_(чесно)_',
  '🌙 *Вечірнє питання 3/3*\n\nЩо забираєш із сьогодні?\n_(один інсайт або рішення)_',
]

export async function handleEvening(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE DISABLED]
    // Original evening flow remains below for normal mode.
    return
  }

  try {
    const chatId  = String(ctx.chat?.id)
    const session = await getSession(chatId)
    if (!session) {
      await sendEntryOffer(ctx)
      return
    }
    await trackEvent({
      userId: session.userId,
      type: 'telegram_evening_started',
      source: 'telegram',
      state: 'evening',
    })
    await updateSession(session.userId, chatId, 'evening_q1', {}, 0)
    await ctx.reply(EVENING_QUESTIONS[0], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
  } catch (error) {
    console.error('[TelegramMentor] evening start error:', error)
    const chatId = String(ctx.chat?.id)
    const session = await getSession(chatId)
    if (session?.userId) {
      await sendStateMenu(ctx, session.userId)
      return
    }

    await sendEntryOffer(ctx)
  }
}

export async function handleEveningAnswer(ctx: Context, answer: string) {
  const chatId  = String(ctx.chat?.id)
  const session = await getSession(chatId)
  if (!session) return

  const evening = session.data.evening ?? {}

  if (session.state === 'evening_q1') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_evening_answered',
      source: 'telegram',
      state: 'evening',
      payload: {
        step: 'q1',
        text: answer,
      },
    })
    evening.q1 = answer
    await updateSession(session.userId, chatId, 'evening_q2', { ...session.data, evening }, 1)
    await ctx.reply(EVENING_QUESTIONS[1], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
    return
  }

  if (session.state === 'evening_q2') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_evening_answered',
      source: 'telegram',
      state: 'evening',
      payload: {
        step: 'q2',
        text: answer,
      },
    })
    evening.q2 = answer
    await updateSession(session.userId, chatId, 'evening_q3', { ...session.data, evening }, 2)
    await ctx.reply(EVENING_QUESTIONS[2], { parse_mode: 'Markdown', reply_markup: cancelKeyboard.reply_markup })
    return
  }

  if (session.state === 'evening_q3') {
    await trackEvent({
      userId: session.userId,
      type: 'telegram_evening_answered',
      source: 'telegram',
      state: 'evening',
      payload: {
        step: 'q3',
        text: answer,
      },
    })
    evening.q3 = answer

    // Streak оновлення — використовуємо streak/service.ts або пряме оновлення
    try {
      const expertId = await ensureUserExpertId(session.userId)
      await registerStreakActivity(session.userId, expertId, 'daily_checkin')
    } catch (error) {
      console.error('[TelegramMentor] evening streak upsert failed', error)
    }

    try {
      await updateUserState({
        userId: session.userId,
        source: 'evening',
        answers: {
          q1: evening.q1,
          q2: evening.q2,
          q3: evening.q3,
        },
      })
    } catch (error) {
      console.error('[TelegramMentor] evening state normalization failed', error)
    }

    const aiReply = await getEveningAI(evening)
    await clearSession(session.userId, chatId)
    await trackEvent({
      userId: session.userId,
      type: 'telegram_evening_completed',
      source: 'telegram',
      state: 'day',
    })
    await ctx.reply(
      `🌙 *Вечірня рефлексія завершена!*\n\n${aiReply}`,
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
  } catch (error) {
    console.error('[TelegramMentor] evening AI reply failed', error)
    return '✅ День зафіксовано. Гарного відпочинку!'
  }
}
