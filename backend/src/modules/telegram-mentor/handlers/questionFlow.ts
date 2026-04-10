import type { Context } from 'telegraf'

import { rewardEngine } from '../../gamification/reward.engine.js'
import { saveDailySession, getJournalDayAnchor } from '../../daily-cycle/service.js'
import { saveDailyAnswer } from '../../daily-cycle/service.js'
import { getSharedSessionState } from '../../daily-cycle/sessionSync.service.js'
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
import { getAccessAwareAppReplyMarkupForContext } from './start.js'

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
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply('Не вдалося знайти питання. Спробуй ще раз через /start.', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
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
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply('Спершу підключи Telegram до акаунта Starway.', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
    return
  }

  const targetDate = initialData?.journalDate && typeof initialData.journalDate === 'string'
    ? initialData.journalDate
    : getJournalDayAnchor(new Date()).toISOString()
  const synced = await getSharedSessionState(userId, kind, targetDate)
  const nextIndex = Math.max(initialStep, synced.lastQuestionIndex)

  if (synced.completedAt) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(
      kind === 'morning'
        ? '✅ Ранкова сесія вже завершена. Дані синхронізовані між каналами.'
        : '✅ Вечірню сесію вже завершено. Дані синхронізовані між каналами.',
      replyMarkup ? { reply_markup: replyMarkup } : undefined,
    )
    return
  }

  const nextData: SessionData = {
    answers: synced.answers,
    journalDate: synced.date,
    [kind]: synced.answers,
  }

  await updateSession(userId, chatId, questionState(kind, nextIndex), nextData, nextIndex)
  await replyWithQuestion(ctx, kind, nextIndex)
}

export async function resumeQuestionSession(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  const session = await getSession(chatId)
  const parsed = session ? parseQuestionState(session.state) : null

  if (!session?.userId || !parsed) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply('Активної сесії зараз немає. Відкрий Starway або напиши /morning чи /evening.', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
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

  const sessionDate =
    typeof session.data?.journalDate === 'string'
      ? session.data.journalDate
      : getJournalDayAnchor(new Date()).toISOString()
  const synced = await getSharedSessionState(session.userId, kind, sessionDate)
  const currentIndex = synced.lastQuestionIndex
  const question = await getQuestion(kind, currentIndex)
  if (!question) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply('Не вдалося відновити питання. Спробуй ще раз через /start.', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
    return
  }

  const mergedAnswers = {
    ...synced.answers,
    [question.id]: normalizedAnswer,
  }

  const hasNext = await hasNextQuestion(kind, currentIndex)
  if (hasNext) {
    const nextIndex = currentIndex + 1
    await saveDailyAnswer(session.userId, {
      entryId: synced.entryId,
      session: kind,
      questionId: question.id,
      answer: normalizedAnswer,
      date: synced.date,
      lastQuestionIndex: nextIndex,
      channel: 'tg',
    })
    const nextData: SessionData = {
      ...session.data,
      answers: mergedAnswers,
      journalDate: synced.date,
      [kind]: mergedAnswers,
    }
    await updateSession(session.userId, chatId, questionState(kind, nextIndex), nextData, nextIndex)
    await replyWithQuestion(ctx, kind, nextIndex)
    return
  }

  await saveDailySession(session.userId, {
    session: kind,
    answers: mergedAnswers,
    date: synced.date,
    channel: 'tg',
    finalize: true,
  })
  await rewardEngine.onDailyEntryCreated(session.userId)
  await clearSession(session.userId, chatId)
  const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)

  await ctx.reply(
    kind === 'morning'
      ? '✅ Ранкова сесія збережена. Дані синхронізовані зі Starway.'
      : '✅ Вечірню рефлексію збережено. Дані синхронізовані зі Starway.',
    replyMarkup ? { reply_markup: replyMarkup } : undefined,
  )
}
