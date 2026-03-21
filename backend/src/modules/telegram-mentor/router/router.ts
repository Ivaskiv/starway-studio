import type { Context } from 'telegraf'
import type { AIMessageRole } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { logAssistantRoutingMeta } from '../../ai-mentor/state.service.js'
import { trackEvent, trackQuestionEvent } from '../../events/service.js'
import { handleAIMentor } from '../handlers/aiMentor.js'
import { handleChat } from '../handlers/chat.js'
import { handleEvening, handleEveningAnswer } from '../handlers/evening.js'
import { handleLidmagnet } from '../handlers/lidmagnet.js'
import { handleMorning, handleMorningAnswer } from '../handlers/morning.js'
import { handlePrivacy } from '../handlers/privacy.js'
import {
  getStateMessage,
  resolveLinkedUserIdFromContext,
  resolveUserState,
  sendEntryOffer,
  sendStateMenu,
} from '../handlers/start.js'
import { handleStatus } from '../handlers/status.js'
import { handleTasks } from '../handlers/tasks.js'
import { openAppKeyboard, supportMenuKeyboard } from '../keyboards.js'
import { getSession } from '../session.js'
import type { FlowState, RouterContext } from './context.js'
import { resolveIntent, type Intent } from './intent.js'
import type { RoleResult } from '../roles/base.role.js'
import { runAdsRoleResult } from '../roles/ads.role.js'
import { runFunnelRole } from '../roles/funnel.role.js'
import { runMentorRole } from '../roles/mentor.role.js'
import { runProducerRoleResult } from '../roles/producer.role.js'
import { runSeoRoleResult } from '../roles/seo.role.js'

function isLmOnlyModeEnabled(): boolean {
  // [LM_ONLY_MODE] added
  return process.env.APP_MODE === 'LM_ONLY'
}

function getStartPayloadValue(ctx: Context): string {
  if ('startPayload' in ctx && typeof ctx.startPayload === 'string') {
    return ctx.startPayload.trim()
  }

  const text = 'message' in ctx && ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  return String(text ?? '').replace('/start', '').trim()
}

function extractLeadProgress(notes: string | null | undefined): number | null {
  if (!notes) {
    return null
  }

  const match = notes.match(/progress\s*[:=]\s*(\d{1,3})/i)
  if (!match) {
    return null
  }

  const progress = Number(match[1])
  if (Number.isNaN(progress)) {
    return null
  }

  return Math.max(0, Math.min(100, progress))
}

function getTrialDayValue(trialStartsAt: Date | null | undefined): string | null {
  if (!trialStartsAt) {
    return null
  }

  return String(Math.max(1, Math.floor((Date.now() - trialStartsAt.getTime()) / 86400000) + 1))
}

function normalizeCommand(text: string): string {
  if (!text.startsWith('/')) {
    return ''
  }

  const token = text.split(/\s+/, 1)[0] ?? ''
  return token.replace(/@\w+$/, '')
}

function isFunnel(state?: string): boolean {
  if (!state) {
    return false
  }

  return state.startsWith('morning_q') || state.startsWith('evening_q')
}

function resolveFlowState(
  userState: RouterContext['userState'],
  sessionState: string | null,
  hasPendingTask: boolean,
): FlowState {
  if (sessionState?.startsWith('morning_q')) {
    return 'morning'
  }

  if (sessionState?.startsWith('evening_q')) {
    return 'evening'
  }

  if (userState === 'new') {
    return 'guest'
  }

  if (userState === 'in_trial' || userState === 'subscribed' || userState === 'active' || hasPendingTask) {
    return 'day'
  }

  return null
}

async function buildRouterContext(ctx: Context): Promise<RouterContext> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  const telegramId = ctx.from?.id ? String(ctx.from.id) : chatId
  const rawText = 'message' in ctx && ctx.message && 'text' in ctx.message
    ? String(ctx.message.text ?? '').trim()
    : ''
  const payload = getStartPayloadValue(ctx)
  const session = chatId ? await getSession(chatId) : null
  const userId = await resolveLinkedUserIdFromContext(ctx)

  if (!userId) {
    return {
      userId: null,
      telegramId,
      chatId,
      updateType: rawText.startsWith('/') ? 'command' : 'text',
      payload,
      rawText,
      userState: 'new',
      subscriptionStatus: null,
      trialDay: null,
      leadProgress: null,
      mentorStage: null,
      mentorInsight: null,
      mentorBlocker: null,
      activeSession: Boolean(session),
      flowState: null,
      hasPendingTask: false,
    }
  }

  const [userState, subscription, mentor, latestLead, user, pendingTask] = await Promise.all([
    resolveUserState(userId),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        stage: true,
        insight: true,
        blocker: true,
      },
    }),
    prisma.funnelLead.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        notes: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStartsAt: true,
      },
    }),
    prisma.microTask.findFirst({
      where: {
        userId,
        isCompleted: false,
      },
      select: { id: true },
      orderBy: { dueAt: 'asc' },
    }),
  ])

  const flowState = resolveFlowState(userState, session?.state ?? null, Boolean(pendingTask))

  return {
    userId,
    telegramId,
    chatId,
    updateType: rawText.startsWith('/') ? 'command' : 'text',
    payload,
    rawText,
    userState,
    subscriptionStatus: subscription?.status ?? null,
    trialDay: getTrialDayValue(user?.trialStartsAt),
    leadProgress: extractLeadProgress(latestLead?.notes),
    mentorStage: mentor?.stage ?? null,
    mentorInsight: mentor?.insight ?? null,
    mentorBlocker: mentor?.blocker ?? null,
    activeSession: Boolean(session),
    flowState,
    hasPendingTask: Boolean(pendingTask),
    userMenuContext: {
      trialStartsAt: user?.trialStartsAt ?? null,
    },
  }
}

function isLeadMagnetState(state: RouterContext['userState']): boolean {
  return state === 'lm_started' || state === 'lm_engaged' || state === 'lm_almost_done' || state === 'lm_completed' || state === 'lm_exited'
}

function mapIntentToCategory(intent: Intent): string {
  switch (intent) {
    case 'lead_magnet':
    case 'progress':
      return 'lead_magnet'
    case 'product_intent':
      return 'product'
    case 'resistance':
      return 'objection'
    case 'off_topic':
      return 'off_topic'
    case 'support':
    case 'general':
      return 'general'
    default:
      return 'unknown'
  }
}

function getProductContext(
  userState: RouterContext['userState'],
): 'lead_magnet' | 'trial' | 'subscription' | 'general' {
  if (isLeadMagnetState(userState)) {
    return 'lead_magnet'
  }

  if (userState === 'in_trial') {
    return 'trial'
  }

  if (userState === 'subscribed') {
    return 'subscription'
  }

  return 'general'
}

async function handleActiveQuestionSession(
  ctx: Context,
  routerContext: RouterContext,
  intent: Intent,
): Promise<boolean> {
  if (!routerContext.activeSession) {
    return false
  }

  const session = await getSession(routerContext.chatId)
  if (!session || !isFunnel(session.state)) {
    return false
  }

  // Під час активної сесії не виходимо в chat-mode.
  if (intent === 'support' || intent === 'off_topic') {
    await ctx.reply(
      'Зараз у тебе активна сесія.\n\nДай відповідь на поточне питання або натисни «← Повернутись».',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '← Повернутись', callback_data: 'return_main_menu' }],
            [{ text: '📊 Мій стан', callback_data: 'open_status' }],
          ],
        },
      },
    )
    return true
  }

  if (session.state.startsWith('morning_q')) {
    await handleMorningAnswer(ctx, routerContext.rawText)
    return true
  }

  if (session.state.startsWith('evening_q')) {
    await handleEveningAnswer(ctx, routerContext.rawText)
    return true
  }

  return false
}

async function getOrCreateConversation(userId: string): Promise<string> {
  const existing = await prisma.aIConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  const created = await prisma.aIConversation.create({
    data: {
      userId,
      title: 'telegram-router',
      context: { source: 'telegram-router' },
    },
    select: { id: true },
  })

  return created.id
}

async function logConversation(userId: string, userText: string, assistantText: string): Promise<void> {
  const conversationId = await getOrCreateConversation(userId)
  const data: Array<{ conversationId: string; role: AIMessageRole; content: string }> = [
    { conversationId, role: 'user', content: userText },
    { conversationId, role: 'assistant', content: assistantText },
  ]

  await prisma.aIMessage.createMany({ data })
}

async function handleCommandRoute(ctx: Context, chatId: string, text: string): Promise<void> {
  const command = normalizeCommand(text)

  if (isLmOnlyModeEnabled()) {
    // [LM_ONLY_MODE DISABLED]
    // Original command routing remains below for normal mode.
    await sendEntryOffer(ctx)
    return
  }

  if (command === '/privacy') {
    await handlePrivacy(ctx)
    return
  }

  if (command === '/morning') {
    await handleMorning(ctx)
    return
  }

  if (command === '/evening') {
    await handleEvening(ctx)
    return
  }

  if (command === '/task') {
    await handleTasks(ctx)
    return
  }

  if (command === '/tasks') {
    await handleTasks(ctx)
    return
  }

  if (command === '/status') {
    await handleStatus(ctx)
    return
  }

  if (command === '/aimentor' || command === '/ai-mentor') {
    await handleAIMentor(ctx)
    return
  }

  if (command === '/lidmagnet') {
    await handleLidmagnet(ctx)
    return
  }

  if (command === '/cancel') {
    const session = await getSession(chatId)
    if (session?.userId) {
      await sendStateMenu(ctx, session.userId)
      return
    }

    await sendEntryOffer(ctx)
    return
  }

  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (userId) {
    await sendStateMenu(ctx, userId)
    return
  }

  await sendEntryOffer(ctx)
}

async function applyRoleResult(ctx: Context, routerContext: RouterContext, result: RoleResult): Promise<void> {
  if (!routerContext.userId) {
    await ctx.reply(result.reply, {
      reply_markup: result.buttons && result.buttons.length > 0
        ? { inline_keyboard: result.buttons.map(button => [button]) }
        : undefined,
    })
    return
  }

  if (result.nextState) {
    const mentor = await prisma.userAIMentor.findFirst({
      where: { userId: routerContext.userId },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (mentor) {
      await prisma.userAIMentor.update({
        where: { id: mentor.id },
        data: {
          currentState: result.nextState,
          lastInteractionAt: new Date(),
        },
      })
    }
  }

  if (routerContext.rawText) {
    await logConversation(routerContext.userId, routerContext.rawText, result.reply)
  }

  await trackEvent({
    userId: routerContext.userId,
    type: 'ai_reply_generated',
    source: 'telegram',
    state: routerContext.flowState ?? routerContext.userState,
    payload: {
      reply: result.reply,
      intent: routerContext.rawText ? undefined : 'system',
    },
  })

  if (result.action === 'TRIGGER_SENDPULSE') {
    await prisma.funnelLead.create({
      data: {
        userId: routerContext.userId,
        source: 'telegram-router',
        notes: 'TRIGGER_SENDPULSE',
      },
    })
  }

  await ctx.reply(result.reply, {
    reply_markup: result.buttons && result.buttons.length > 0
      ? { inline_keyboard: result.buttons.map(button => [button]) }
      : undefined,
  })
}

async function logRouting(
  routerContext: RouterContext,
  intent: Intent,
  category: string,
): Promise<void> {
  if (!routerContext.userId || !routerContext.rawText) {
    return
  }

  await logAssistantRoutingMeta(routerContext.userId, {
    state: routerContext.flowState ?? routerContext.userState,
    intent,
    category,
    text: routerContext.rawText,
  })

  await trackEvent({
    userId: routerContext.userId,
    type: 'telegram_message_received',
    source: 'telegram',
    state: routerContext.flowState ?? routerContext.userState,
    payload: {
      text: routerContext.rawText,
      intent,
      category,
      flowState: routerContext.flowState,
    },
  })

  await trackQuestionEvent({
    userId: routerContext.userId,
    source: 'telegram',
    state: routerContext.flowState ?? routerContext.userState,
    text: routerContext.rawText,
    detectedIntent: intent,
    productContext: getProductContext(routerContext.userState),
    category: category === 'general'
      || category === 'product'
      || category === 'lead_magnet'
      || category === 'objection'
      || category === 'off_topic'
      ? category
      : 'unknown',
  })
}

export async function handleUpdate(ctx: Context): Promise<void> {
  const routerContext = await buildRouterContext(ctx)

  if (!routerContext.chatId) {
    await sendEntryOffer(ctx)
    return
  }

  const intent = resolveIntent(routerContext)

  if (intent === 'command') {
    await handleCommandRoute(ctx, routerContext.chatId, routerContext.rawText)
    return
  }

  await logRouting(routerContext, intent, mapIntentToCategory(intent))

  if (await handleActiveQuestionSession(ctx, routerContext, intent)) {
    return
  }

  if (!routerContext.userId) {
    await sendEntryOffer(ctx)
    return
  }

  if (isLmOnlyModeEnabled()) {
    // [LM_ONLY_MODE] added
    // In funnel-only mode only lm_* states stay reachable through the router.
    if (isLeadMagnetState(routerContext.userState)) {
      await applyRoleResult(ctx, routerContext, await runFunnelRole(routerContext, intent))
      return
    }

    await sendEntryOffer(ctx)
    return
  }

  if (routerContext.flowState === 'guest') {
    await sendStateMenu(ctx, routerContext.userId)
    return
  }

  if (isLeadMagnetState(routerContext.userState)) {
    await applyRoleResult(ctx, routerContext, await runFunnelRole(routerContext, intent))
    return
  }

  if (intent === 'seo_request') {
    await applyRoleResult(ctx, routerContext, await runSeoRoleResult(routerContext.userId))
    return
  }

  if (intent === 'ads_request') {
    await applyRoleResult(ctx, routerContext, await runAdsRoleResult(routerContext.userId))
    return
  }

  if (intent === 'producer_request') {
    await applyRoleResult(ctx, routerContext, await runProducerRoleResult(routerContext.userId, routerContext.rawText))
    return
  }

  if (routerContext.flowState === 'day' && routerContext.hasPendingTask && intent === 'progress') {
    await handleTasks(ctx)
    return
  }

  if (
    routerContext.userState === 'in_trial'
    || routerContext.userState === 'subscribed'
    || routerContext.userState === 'active'
  ) {
    await applyRoleResult(ctx, routerContext, await runMentorRole(routerContext, intent))
    return
  }

  if (intent === 'support' || intent === 'off_topic' || intent === 'product_intent' || intent === 'progress') {
    await sendStateMenu(ctx, routerContext.userId)
    return
  }

  await handleChat(ctx, routerContext.rawText)
}
