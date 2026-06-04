import { Markup } from 'telegraf'
import type { Context } from 'telegraf'

import { coachOnly } from '../../middleware/coachOnly.middleware.js'
import { prisma } from '../../db/client.js'
import { coachContent, buildPlannerResultTitle } from '../content/coachContent.content.js'
import {
  generateContentPlannerDraft,
  getPlannerWeekWindow,
  listCoachZoomSessions,
  formatZoomListMessage,
  saveContentPlan,
  saveCoachNote,
  type ContentPlanMode,
  type CoachPlannerDraft,
} from '../../modules/coach-content/contentPlanner.service.js'

interface PlannerSession {
  userId: string
  chatId: string
  mode: ContentPlanMode
  step: 'COLLECTING' | 'GENERATING' | 'CONFIRMING'
  topic: string | null
  draft: CoachPlannerDraft | null
  createdAt: number
}

interface NoteCaptureState {
  userId: string
  chatId: string
  createdAt: number
}

const plannerSessions = new Map<string, PlannerSession>()
const pendingNotes = new Map<string, NoteCaptureState>()

function getUserKey(ctx: Context): string | null {
  const userId = ctx.from?.id ? String(ctx.from.id) : ''
  return userId || null
}

function getChatId(ctx: Context): string | null {
  return ctx.chat?.id ? String(ctx.chat.id) : null
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return null

  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: telegramUserId },
      ],
    },
    select: { id: true, role: true },
  })

  if (!coach) return null
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return null
  return coach.id
}

function buildPlannerKeyboard(mode: ContentPlanMode) {
  if (mode === 'REELS_IDEAS') {
    return Markup.inlineKeyboard([
      [Markup.button.callback(coachContent.buttons.confirm, 'coach-content:confirm')],
      [Markup.button.callback(coachContent.buttons.rewrite, 'coach-content:rewrite')],
      [Markup.button.callback(coachContent.buttons.changeTopic, 'coach-content:topic:custom')],
      [Markup.button.callback(coachContent.buttons.cancel, 'coach-content:cancel')],
    ])
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback(coachContent.buttons.confirm, 'coach-content:confirm')],
    [Markup.button.callback(coachContent.buttons.rewrite, 'coach-content:rewrite')],
    [Markup.button.callback(coachContent.buttons.changeTopic, 'coach-content:topic:custom')],
    [Markup.button.callback(coachContent.buttons.cancel, 'coach-content:cancel')],
  ])
}

function buildCollectingKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(coachContent.buttons.sales, 'coach-content:topic:sales')],
    [Markup.button.callback(coachContent.buttons.burnout, 'coach-content:topic:burnout')],
    [Markup.button.callback(coachContent.buttons.continue, 'coach-content:topic:clear')],
    [Markup.button.callback(coachContent.buttons.cancel, 'coach-content:cancel')],
  ])
}

function clearPlannerSession(userId: string): void {
  plannerSessions.delete(userId)
}

function clearNoteCapture(userId: string): void {
  pendingNotes.delete(userId)
}

function setPlannerSession(session: PlannerSession): void {
  plannerSessions.set(session.userId, session)
}

function getPlannerSession(userId: string): PlannerSession | null {
  return plannerSessions.get(userId) ?? null
}

function setNoteCapture(state: NoteCaptureState): void {
  pendingNotes.set(state.userId, state)
}

function getNoteCapture(userId: string): NoteCaptureState | null {
  return pendingNotes.get(userId) ?? null
}

async function showPlannerPrompt(ctx: Context, mode: ContentPlanMode, userId: string, chatId: string, topic?: string | null): Promise<void> {
  clearPlannerSession(userId)
  clearNoteCapture(userId)

  const week = getPlannerWeekWindow()
  setPlannerSession({
    userId,
    chatId,
    mode,
    step: mode === 'REELS_IDEAS' ? 'GENERATING' : 'COLLECTING',
    topic: topic?.trim() || null,
    draft: null,
    createdAt: Date.now(),
  })

  if (mode === 'REELS_IDEAS') {
    await generateAndShowDraft(ctx, userId, topic ?? null)
    return
  }

  await ctx.reply([
    `🧭 ${coachContent.planner.title} — ${coachContent.mode[mode]}`,
    '',
    coachContent.planner.intro,
    coachContent.planner.collecting,
    coachContent.planner.collectingHint,
    '',
    `${coachContent.planner.periodPrefix} ${week.weekRange}`,
  ].join('\n'), buildCollectingKeyboard()).catch(() => undefined)
}

async function generateAndShowDraft(ctx: Context, userId: string, topic?: string | null): Promise<void> {
  const session = getPlannerSession(userId)
  if (!session) return

  session.step = 'GENERATING'
  session.topic = topic?.trim() || session.topic || null
  setPlannerSession(session)

  await ctx.reply(coachContent.planner.generating).catch(() => undefined)

  try {
    const draft = await generateContentPlannerDraft({
      userId,
      mode: session.mode,
      topic: session.topic,
    })

    session.step = 'CONFIRMING'
    session.draft = draft
    setPlannerSession(session)

    const zoomHeader = draft.zooms.length > 0
      ? draft.zooms.map((item, index) => `• ${index + 1}. ${item.topic} (${item.type})`).join('\n')
      : coachContent.planner.noData

    const noteHeader = draft.notes.length > 0
      ? draft.notes.map((note, index) => `• ${index + 1}. ${note}`).join('\n')
      : coachContent.planner.noData

    const reply = [
      `✍️ ${buildPlannerResultTitle(session.mode, draft.weekRange)}`,
      '',
      topic ? `${coachContent.planner.focusPrefix} ${topic}` : coachContent.planner.focusNoTopic,
      '',
      coachContent.planner.zoomContextTitle,
      zoomHeader,
      '',
      coachContent.planner.notesTitle,
      noteHeader,
      '',
      draft.content,
    ].join('\n')

    await ctx.reply(reply, buildPlannerKeyboard(session.mode)).catch(() => undefined)
    return
  } catch (error) {
    console.error('[coach-content] draft generation failed', error)
    clearPlannerSession(userId)

    const message = error instanceof Error && error.message === 'ai_not_configured'
      ? coachContent.planner.aiNotConfigured
      : coachContent.planner.errorFallback

    await ctx.reply(message).catch(() => undefined)
  }
}

async function saveCurrentDraft(ctx: Context, userId: string): Promise<void> {
  const session = getPlannerSession(userId)
  if (!session?.draft) return

  await saveContentPlan({
    expertId: userId,
    weekStart: session.draft.weekStart,
    mode: session.mode,
    content: session.draft.content,
  })

  await ctx.reply([coachContent.planner.saved, '', session.draft.content].join('\n')).catch(() => undefined)
  clearPlannerSession(userId)
}

async function promptForTopic(ctx: Context, userId: string): Promise<void> {
  const session = getPlannerSession(userId)
  if (!session) return

  session.step = 'COLLECTING'
  session.topic = null
  session.draft = null
  setPlannerSession(session)

  await ctx.reply([
    coachContent.planner.collecting,
    coachContent.planner.collectingHint,
  ].join('\n')).catch(() => undefined)
}

async function generateWithoutTopic(ctx: Context, userId: string): Promise<void> {
  const session = getPlannerSession(userId)
  if (!session) return

  await generateAndShowDraft(ctx, userId, null)
}

async function handlePlannerText(ctx: Context, text: string): Promise<boolean> {
  const userId = getUserKey(ctx)
  const chatId = getChatId(ctx)
  if (!userId || !chatId) return false

  if (text.trim().startsWith('/')) return false

  const noteCapture = getNoteCapture(userId)
  if (noteCapture) {
    const noteText = text.trim()
    if (!noteText) {
      await ctx.reply(coachContent.planner.noteEmpty).catch(() => undefined)
      return true
    }

    await saveCoachNote({ userId, content: noteText, source: 'coach_content_flow' })
    clearNoteCapture(userId)
    await ctx.reply(coachContent.planner.noteSaved).catch(() => undefined)
    return true
  }

  const session = getPlannerSession(userId)
  if (!session || session.step !== 'COLLECTING') return false

  const topic = text.trim()
  if (!topic) {
    await ctx.reply(coachContent.planner.collectingHint).catch(() => undefined)
    return true
  }

  await generateAndShowDraft(ctx, userId, topic)
  return true
}

async function handlePlannerAction(ctx: Context, action: string): Promise<boolean> {
  const userId = getUserKey(ctx)
  const chatId = getChatId(ctx)
  if (!userId || !chatId) return false

  const session = getPlannerSession(userId)
  if (!session) return false

  if (action === 'coach-content:confirm') {
    await ctx.answerCbQuery(coachContent.buttons.confirm).catch(() => undefined)
    await saveCurrentDraft(ctx, userId)
    return true
  }

  if (action === 'coach-content:rewrite') {
    await ctx.answerCbQuery(coachContent.buttons.rewrite).catch(() => undefined)
    await generateAndShowDraft(ctx, userId, session.topic)
    return true
  }

  if (action === 'coach-content:cancel') {
    await ctx.answerCbQuery(coachContent.buttons.cancel).catch(() => undefined)
    clearPlannerSession(userId)
    clearNoteCapture(userId)
    await ctx.reply(coachContent.planner.cancelled).catch(() => undefined)
    return true
  }

  if (action === 'coach-content:topic:sales') {
    await ctx.answerCbQuery(coachContent.buttons.sales).catch(() => undefined)
    await generateAndShowDraft(ctx, userId, coachContent.topics.sales)
    return true
  }

  if (action === 'coach-content:topic:burnout') {
    await ctx.answerCbQuery(coachContent.buttons.burnout).catch(() => undefined)
    await generateAndShowDraft(ctx, userId, coachContent.topics.burnout)
    return true
  }

  if (action === 'coach-content:topic:clear') {
    await ctx.answerCbQuery(coachContent.buttons.clear).catch(() => undefined)
    await generateWithoutTopic(ctx, userId)
    return true
  }

  if (action === 'coach-content:topic:custom') {
    await ctx.answerCbQuery(coachContent.buttons.changeTopic).catch(() => undefined)
    await promptForTopic(ctx, userId)
    return true
  }

  return false
}

async function handleNoteCommand(ctx: Context, payload: string): Promise<boolean> {
  const userId = getUserKey(ctx)
  const chatId = getChatId(ctx)
  if (!userId || !chatId) return false

  const inlineText = payload.trim()
  if (inlineText) {
    await saveCoachNote({ userId, content: inlineText, source: 'coach_content_flow' })
    clearNoteCapture(userId)
    await ctx.reply(coachContent.note.saved).catch(() => undefined)
    return true
  }

  setNoteCapture({ userId, chatId, createdAt: Date.now() })
  await ctx.reply([coachContent.note.title, '', coachContent.note.prompt].join('\n')).catch(() => undefined)
  return true
}

export async function handleCoachContentCommand(ctx: Context, mode: ContentPlanMode, payload = ''): Promise<boolean> {
  const coachUserId = await resolveCoachUserId(ctx)
  const chatId = getChatId(ctx)
  if (!coachUserId || !chatId) return false

  await showPlannerPrompt(ctx, mode, coachUserId, chatId, payload?.trim() || null)
  return true
}

export async function handleCoachContentNote(ctx: Context, payload = ''): Promise<boolean> {
  const coachUserId = await resolveCoachUserId(ctx)
  const chatId = getChatId(ctx)
  if (!coachUserId || !chatId) return false

  await handleNoteCommand(ctx, payload)
  return true
}

export async function handleCoachContentZooms(ctx: Context): Promise<boolean> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) return false

  const sessions = await listCoachZoomSessions(coachUserId)
  const message = formatZoomListMessage(sessions)
  await ctx.reply(message).catch(() => undefined)
  return true
}

export async function handleCoachContentText(ctx: Context, next: () => Promise<unknown>): Promise<void> {
  const text = String((ctx.message as { text?: string } | undefined)?.text ?? '').trim()
  if (!text) {
    await next()
    return
  }

  const handled = await handlePlannerText(ctx, text)
  if (handled) return

  await next()
}

export async function handleCoachContentAction(ctx: Context, action: string): Promise<boolean> {
  return handlePlannerAction(ctx, action)
}

export function clearCoachContentState(userId: string): void {
  clearPlannerSession(userId)
  clearNoteCapture(userId)
}

export async function ensureCoachContentAccess(ctx: Context, next: () => Promise<void>): Promise<void> {
  await coachOnly(ctx, next)
}
