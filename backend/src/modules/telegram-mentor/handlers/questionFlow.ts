import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { rewardEngine } from '../../gamification/reward.engine.js'
import { saveDailySession, getJournalDayAnchor } from '../../daily-cycle/index.js'
import { saveDailyAnswer } from '../../daily-cycle/index.js'
import { getSharedSessionState } from '../../daily-cycle/sessionSync.service.js'
import {
  clearSession,
  getActiveQuestionSet,
  getSession,
  getUserIdByChatId,
  parseQuestionState,
  questionState,
  updateSession,
} from '../session.js'
import { DYNAMIC_QUESTIONS, getDynamicQuestionsCount } from '../types.js'
import type { Question, SessionData } from '../types.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

type SessionKind = 'morning' | 'evening'

async function getQuestionsForUser(kind: SessionKind, userId: string): Promise<Question[]> {
  const questionSet = await getActiveQuestionSet()
  if (kind !== 'morning') {
    return questionSet[kind]
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifecycleState: true },
  })
  const lifecycleState = String(user?.lifecycleState ?? 'NEW_USER')
  const dynamicQuestions = DYNAMIC_QUESTIONS
    .slice(0, getDynamicQuestionsCount(lifecycleState))
    .map(question => ({ ...question }))

  return [...questionSet.morning, ...dynamicQuestions]
}

function getSessionTitle(kind: SessionKind): string {
  return kind === 'morning' ? '🌅 Ранкова сесія' : '🌙 Вечірня рефлексія'
}

async function replyWithQuestion(ctx: Context, kind: SessionKind, index: number, userId?: string | null) {
  if (!userId) return
  const questions = await getQuestionsForUser(kind, userId)
  const question = questions[index] ?? null

  if (!question) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const relationship = userId
      ? await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
      : null
    const copy = buildRecoveryCopy('question_missing', resolveConversationProfile('stankey'), {
      relationship,
    })
    await planMessage(ctx, 'ctx.reply', 'question_missing_reply', `${copy.title}\n${copy.body}`, replyMarkup)
    return
  }

  const total = questions.length
  const hint = question.hint ? `\n\n<i>${question.hint}</i>` : ''

  await planMessage(
    ctx,
    'ctx.reply',
    'question_prompt',
    `${getSessionTitle(kind)} · ${index + 1}/${total}\n\n<b>${question.text}</b>${hint}\n\nНапиши відповідь одним повідомленням.`,
    undefined,
    'HTML',
  )
}

export async function startQuestionSession(ctx: Context, kind: SessionKind, initialData?: SessionData, initialStep = 0) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  const userId = await getUserIdByChatId(chatId)
  if (!userId) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const copy = buildRecoveryCopy('session_expired', resolveConversationProfile('stankey'), {
      nextStep: 'підключити Telegram до акаунта Starway',
    })
    await planMessage(ctx, 'ctx.reply', 'question_session_expired', `${copy.title}\n${copy.body}`, replyMarkup)
    return
  }

  const targetDate = initialData?.journalDate && typeof initialData.journalDate === 'string'
    ? initialData.journalDate
    : getJournalDayAnchor(new Date()).toISOString()
  const synced = await getSharedSessionState(userId, kind, targetDate)
  const nextIndex = Math.max(initialStep, synced.lastQuestionIndex)

  if (synced.completedAt) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await planMessage(
      ctx,
      'ctx.reply',
      'question_session_completed',
      kind === 'morning'
        ? '✅ Ранкова сесія вже завершена. Дані синхронізовані між каналами.'
        : '✅ Вечірню сесію вже завершено. Дані синхронізовані між каналами.',
      replyMarkup,
    )
    return
  }

  const nextData: SessionData = {
    answers: synced.answers,
    journalDate: synced.date,
    [kind]: synced.answers,
  }

  await updateSession(userId, chatId, questionState(kind, nextIndex), nextData, nextIndex)
  await replyWithQuestion(ctx, kind, nextIndex, userId)
}

export async function resumeQuestionSession(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  const session = await getSession(chatId)
  const parsed = session ? parseQuestionState(session.state) : null

  if (!session?.userId || !parsed) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const relationship = session?.userId
      ? await resolveRelationshipMemory(session.userId, 'stankey').catch(() => null)
      : null
    const copy = buildRecoveryCopy('flow_interrupted', resolveConversationProfile('stankey'), {
      step: 'morning_q1',
      relationship,
    })
    await planMessage(ctx, 'ctx.reply', 'question_resume_interrupted', `${copy.title}\n${copy.body}`, replyMarkup)
    return
  }

  await replyWithQuestion(ctx, parsed.type, parsed.index, session.userId)
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
  const questions = await getQuestionsForUser(kind, session.userId)
  const question = questions[currentIndex] ?? null
  if (!question) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const relationship = session?.userId
      ? await resolveRelationshipMemory(session.userId, 'stankey').catch(() => null)
      : null
    const copy = buildRecoveryCopy('question_missing', resolveConversationProfile('stankey'), {
      context: kind === 'morning' ? 'ранкова сесія' : 'вечірня рефлексія',
      relationship,
    })
    await planMessage(ctx, 'ctx.reply', 'question_missing_in_answer', `${copy.title}\n${copy.body}`, replyMarkup)
    return
  }

  const mergedAnswers = {
    ...synced.answers,
    [question.id]: normalizedAnswer,
  }

  const hasNext = currentIndex + 1 < questions.length
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
    await replyWithQuestion(ctx, kind, nextIndex, session.userId)
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

  await planMessage(
    ctx,
    'ctx.reply',
    'question_session_saved',
      kind === 'morning'
        ? '✅ Ранковий крок збережено. Я залишив наступну дію на місці.'
        : '✅ Вечірню дію збережено. Історію дня підхоплено без втрат.',
    replyMarkup,
  )
}
