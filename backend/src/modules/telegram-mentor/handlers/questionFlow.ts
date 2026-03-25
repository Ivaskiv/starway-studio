import type { Context } from 'telegraf'

import { rewardEngine } from '../../gamification/reward.engine.js'
import { saveDailySession } from '../../daily-cycle/service.js'
import { openAppKeyboard } from '../keyboards.js'
import {
  clearSession,
  getActiveQuestionSet,
  getQuestion,
  getSession,
  getUserIdByChatId,
  hasNextQuestion,
  parseQuestionState,
  questionState,
  updateSession,
} from '../session.js'
import type { SessionData } from '../types.js'

type SessionKind = 'morning' | 'evening'

function getSessionTitle(kind: SessionKind): string {
  return kind === 'morning' ? '🌅 Ранкова сесія' : '🌙 Вечірня рефлексія'
}

async function replyWithQuestion(ctx: Context, kind: SessionKind, index: number) {
  const [question, questionSet] = await Promise.all([
    getQuestion(kind, index),
    getActiveQuestionSet(),
  ])

  if (!question) {
    await ctx.reply('Не вдалося знайти питання. Спробуй ще раз через /start.', {
      reply_markup: openAppKeyboard().reply_markup,
    })
    return
  }

  const total = questionSet[kind].length
  const hint = question.hint ? `\n\n<i>${question.hint}</i>` : ''

  await ctx.reply(
    `${getSessionTitle(kind)} · ${index + 1}/${total}\n\n<b>${question.text}</b>${hint}\n\nНапиши відповідь одним повідомленням.`,
    {
      parse_mode: 'HTML',
    },
  )
}

export async function startQuestionSession(ctx: Context, kind: SessionKind, initialData?: SessionData, initialStep = 0) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  const userId = await getUserIdByChatId(chatId)
  if (!userId) {
    await ctx.reply('Спершу підключи Telegram до акаунта Starway.', {
      reply_markup: openAppKeyboard().reply_markup,
    })
    return
  }

  const nextData: SessionData = {
    answers: initialData?.answers && typeof initialData.answers === 'object' ? initialData.answers : {},
    [kind]: initialData?.[kind] && typeof initialData[kind] === 'object' ? initialData[kind] : {},
  }

  await updateSession(userId, chatId, questionState(kind, initialStep), nextData, initialStep)
  await replyWithQuestion(ctx, kind, initialStep)
}

export async function resumeQuestionSession(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  const session = await getSession(chatId)
  const parsed = session ? parseQuestionState(session.state) : null

  if (!session?.userId || !parsed) {
    await ctx.reply('Активної сесії зараз немає. Відкрий Starway або напиши /morning чи /evening.', {
      reply_markup: openAppKeyboard().reply_markup,
    })
    return
  }

  await replyWithQuestion(ctx, parsed.type, parsed.index)
}

export async function answerQuestion(ctx: Context, kind: SessionKind, answer: string) {
  const chatId = String(ctx.chat?.id ?? '')
  const normalizedAnswer = answer.trim()
  if (!chatId || !normalizedAnswer) return

  const session = await getSession(chatId)
  const parsed = session ? parseQuestionState(session.state) : null

  if (!session?.userId || !parsed || parsed.type !== kind) {
    await startQuestionSession(ctx, kind)
    return
  }

  const question = await getQuestion(kind, parsed.index)
  if (!question) {
    await ctx.reply('Не вдалося відновити питання. Спробуй ще раз через /start.', {
      reply_markup: openAppKeyboard().reply_markup,
    })
    return
  }

  const currentAnswers =
    session.data?.[kind] && typeof session.data[kind] === 'object'
      ? { ...(session.data[kind] as Record<string, string>) }
      : {}

  const mergedAnswers = {
    ...currentAnswers,
    [question.id]: normalizedAnswer,
  }

  const nextData: SessionData = {
    ...session.data,
    answers: mergedAnswers,
    [kind]: mergedAnswers,
  }

  const hasNext = await hasNextQuestion(kind, parsed.index)
  if (hasNext) {
    const nextIndex = parsed.index + 1
    await updateSession(session.userId, chatId, questionState(kind, nextIndex), nextData, nextIndex)
    await replyWithQuestion(ctx, kind, nextIndex)
    return
  }

  await saveDailySession(session.userId, {
    session: kind,
    answers: mergedAnswers,
    date: new Date().toISOString(),
  })
  await rewardEngine.onDailyEntryCreated(session.userId)
  await clearSession(session.userId, chatId)

  await ctx.reply(
    kind === 'morning'
      ? '✅ Ранкова сесія збережена. Дані синхронізовані зі Starway.'
      : '✅ Вечірню рефлексію збережено. Дані синхронізовані зі Starway.',
    {
      reply_markup: openAppKeyboard().reply_markup,
    },
  )
}
