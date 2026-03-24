// backend/src/modules/telegram-mentor/handlers/start.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { buildWebDeepLink, generateDeepLink, resolveDeepLinkToken } from '../../deeplinks/service.js'
import { trackEvent } from '../../events/service.js'
import { startFlow } from '../../start-flow/service.js'
import { getAccessControlState } from '../../access/service.js'
import { verifyTelegramLinkCode } from '../../social/service.js'
import { findLinkedUserId, upsertTelegramBinding } from '../services/linking.service.js'
import { resolveOrCreateTelegramGuestUser } from '../../user/identity.service.js'
import {
  aiMentorStartKeyboard,
  continueOrRestartKeyboard,
  getTelegramAppUrl,
  mainMenuKeyboard,
  openAppKeyboard,
  openUrlKeyboard,
} from '../keyboards.js'

type TelegramUserState = 'NEW' | 'LINKED' | 'RETURNING' | 'TRIAL' | 'SUBSCRIBED'
export type UserState =
  | 'new'
  | 'lm_started'
  | 'lm_engaged'
  | 'lm_almost_done'
  | 'lm_completed'
  | 'lm_exited'
  | 'active'
  | 'in_trial'
  | 'subscribed'

export function isLeadMagnetActive(state: UserState | null | undefined): boolean {
  return state === 'lm_started'
    || state === 'lm_engaged'
    || state === 'lm_almost_done'
    || state === 'lm_completed'
    || state === 'lm_exited'
}

type InlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
type StateMessage = {
  text: string
  buttons: InlineButton[][]
}

const LEGACY_DEEPLINK_PREFIX = 'link_'
const GENERIC_DEEPLINK_PREFIX = 'dl_'
const STARTWAY_DEEPLINK_PREFIX = 'starway_'
const MENTOR_RETURN_PAYLOAD = 'mentor_return'

type StartContext = Context & {
  startPayload?: string
}

type StartReply = {
  text: string
  reply_markup: ReturnType<typeof openAppKeyboard>['reply_markup']
}

type MenuUser = {
  id: string
  trialStartsAt: Date | null
}

type MenuMentor = {
  insight: string | null
  stage: string | null
  blocker?: string | null
}

type ProductShowcaseItem = {
  id: string
  title: string
  description: string
  infoUrl: string | null
}

const TELEGRAM_PRODUCT_SHOWCASE: ProductShowcaseItem[] = [
  {
    id: 'ai-mentor',
    title: '🤖 AI Ментор',
    description: 'Щоденні сесії, мікрозавдання, AI аналіз стану та підтримка 24/7.',
    infoUrl: getTelegramAppUrl('/products/ai-mentor'),
  },
  {
    id: 'five-points',
    title: '🎁 5 точок опори',
    description: 'Безкоштовний практикум для знайомства з системою і фіксації стартової точки.',
    infoUrl: getTelegramAppUrl('/products/five-points'),
  },
  {
    id: 'system-21',
    title: '🔥 Система 21',
    description: '21 день для виходу з відкладання і повернення в дію.',
    infoUrl: getTelegramAppUrl('/products/system-21'),
  },
  {
    id: 'fears',
    title: '🛡️ Страхи',
    description: 'Робота з внутрішніми блоками, сумнівами і реакціями.',
    infoUrl: getTelegramAppUrl('/products/fears'),
  },
  {
    id: 'code-of-change',
    title: '🎯 Код змін',
    description: 'Стратегія цілей, рішень і системного руху.',
    infoUrl: getTelegramAppUrl('/products/code-of-change'),
  },
  {
    id: 'state-mastery',
    title: '⚡ Стан — ключ до успіху',
    description: 'Керування енергією, відновленням і внутрішньою стабільністю.',
    infoUrl: getTelegramAppUrl('/products/state-mastery'),
  },
  {
    id: 'consultation',
    title: '👥 Консультація з Надею',
    description: 'Персональний розбір, фокус на вузькому місці і стратегія руху.',
    infoUrl: getTelegramAppUrl('/products/consultation'),
  },
]

function getProductShowcaseMessage(): StateMessage {
  return {
    text:
      'Starway.\n\n' +
      'Система яка веде від поточного стану до конкретного результату.\n' +
      'Без мотивації. Без зайвого.\n\n' +
      'Зараз у системі доступні:\n\n' +
      TELEGRAM_PRODUCT_SHOWCASE.map(product => `• ${product.title} — ${product.description}`).join('\n') +
      '\n\nОбери продукт і відкрий сторінку з деталями:',
    buttons: TELEGRAM_PRODUCT_SHOWCASE.map(product => [
      product.infoUrl
        ? { text: `Дізнатись більше · ${product.title}`, url: product.infoUrl }
        : { text: `Дізнатись більше · ${product.title}`, callback_data: 'return_main_menu' },
    ]),
  }
}

function getPauseSessionMessage(kind: 'trial' | 'subscription'): StateMessage {
  return {
    text: kind === 'trial'
      ? 'Сесію призупинено.\n\nТріал продовжує тривати, дні не зупиняються.\nКошти не списуються, але й час не заморожується.\n\nКоли повернешся, продовжиш з того місця, де зупинилась.'
      : 'Сесію призупинено.\n\nПідписка залишається активною, кошти не повертаються.\nКоли повернешся, продовжиш з того місця, де зупинилась.',
    buttons: [
      [{ text: '▶️ Продовжити з місця зупинки', callback_data: 'continue_ai_mentor' }],
      [{ text: '🏠 Головне меню', callback_data: 'return_main_menu' }],
    ],
  }
}

async function sendResolvedDeepLinkReply(ctx: Context, params: {
  userId: string
  action: 'bind_telegram' | 'continue_flow' | 'open_web' | 'open_miniapp' | 'resume_task' | 'open_mentor'
  path: string | null
  telegramState: UserState | 'guest'
}): Promise<void> {
  const fallbackPath = params.path ?? '/onboarding/continue'
  const nextLink = await generateDeepLink({
    userId: params.userId,
    action: params.action === 'bind_telegram' ? 'continue_flow' : params.action,
    source: 'telegram',
    target: params.action === 'open_miniapp' ? 'miniapp' : 'web',
    path: fallbackPath,
    payload: {
      from: 'telegram_start',
      action: params.action,
    },
  })

  const url = buildWebDeepLink(nextLink.token, nextLink.path)
  const canOpenMiniApp = params.action === 'open_miniapp'
    ? await hasMiniAppAccess(params.userId)
    : false
  const label = params.action === 'open_miniapp' && canOpenMiniApp
    ? '📱 Відкрити Mini App'
    : '🌐 Продовжити у web'
  const text = params.action === 'bind_telegram'
    ? 'Telegram підключено. Продовжуй у додатку з того самого кроку.'
    : 'Контекст збережено. Продовжуй з цього самого кроку.'

  await ctx.reply(text, {
    reply_markup: openUrlKeyboard(url, label).reply_markup,
  })

  await trackEvent({
    userId: params.userId,
    type: 'telegram_deeplink_handoff_ready',
    source: 'telegram',
    state: params.telegramState,
    payload: {
      action: params.action,
      path: nextLink.path,
      target: params.action === 'open_miniapp' ? 'miniapp' : 'web',
    },
  })
}

function getStartPayload(ctx: StartContext): string {
  if (ctx.startPayload) {
    return ctx.startPayload.trim()
  }

  const text = 'message' in ctx && ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  return String(text ?? '').replace('/start', '').trim()
}

function isSendPulsePayload(payload: string): boolean {
  return /^[a-f0-9]{24}$/.test(payload)
}

async function setPersistentKeyboardSilently(ctx: Context): Promise<void> {
  try {
    const sent = await ctx.reply('\u200B', {
      reply_markup: mainMenuKeyboard.reply_markup,
    })
    if (ctx.chat?.id) {
      await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id)
        .catch(() => {})
    }
  } catch {
    // completely silent
  }
}

async function hasMiniAppAccess(userId: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const access = await getAccessControlState(userId)
    return access.hasSubscription
  } catch {
    return false
  }
}

async function getAccessAwareAppReplyMarkup(
  userId: string | null,
  fallbackPath = '/products/ai-mentor',
): Promise<ReturnType<typeof openUrlKeyboard>['reply_markup'] | undefined> {
  if (await hasMiniAppAccess(userId)) {
    return openAppKeyboard().reply_markup
  }

  const fallbackUrl = getTelegramAppUrl(fallbackPath)
  if (!fallbackUrl) {
    return undefined
  }

  return openUrlKeyboard(fallbackUrl, '🌐 Відкрити сайт').reply_markup
}

async function hasActiveLeadMagnetSession(userId: string): Promise<boolean> {
  const lead = await prisma.funnelLead.findFirst({
    where: {
      userId,
      status: 'LEAD',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      updatedAt: true,
    },
  })

  if (!lead) {
    return false
  }

  return Date.now() - lead.updatedAt.getTime() < 24 * 60 * 60 * 1000
}

async function markLeadMagnetSessionActive(userId: string, payload: string): Promise<void> {
  const existing = await prisma.funnelLead.findFirst({
    where: {
      userId,
      status: 'LEAD',
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    await prisma.funnelLead.update({
      where: { id: existing.id },
      data: {
        source: payload,
        notes: 'active_lead_magnet_session',
      },
    })
    return
  }

  await prisma.funnelLead.create({
    data: {
      userId,
      source: payload,
      status: 'LEAD',
      notes: 'active_lead_magnet_session',
    },
  })
}

async function hasActiveSendPulseLeadMagnetSession(userId: string): Promise<boolean> {
  const lead = await prisma.funnelLead.findFirst({
    where: {
      userId,
      status: 'LEAD',
      notes: 'active_lead_magnet_session',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      source: true,
      updatedAt: true,
    },
  })

  if (!lead) {
    return false
  }

  if (!lead.source || !isSendPulsePayload(lead.source)) {
    return false
  }

  return Date.now() - lead.updatedAt.getTime() < 24 * 60 * 60 * 1000
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

async function getLeadMagnetNudgeCount(userId: string): Promise<number> {
  return prisma.funnelLead.count({
    where: {
      userId,
      notes: {
        startsWith: 'NUDGE_SENT:',
      },
    },
  })
}

export async function resolveLinkedUserIdFromContext(ctx: Context): Promise<string | null> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null

  if (!chatId || !telegramUserId) {
    return null
  }

  return findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })
}

function getTrialDay(trialStartsAt: Date | null | undefined): string {
  if (!trialStartsAt) {
    return '?'
  }

  return String(Math.max(1, Math.floor((Date.now() - trialStartsAt.getTime()) / 86400000) + 1))
}

async function getLastActivityAt(userId: string): Promise<Date | null> {
  const [mentor, session, conversation, entry, lead] = await Promise.all([
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { lastInteractionAt: 'desc' },
      select: { lastInteractionAt: true },
    }),
    prisma.aIMentorSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.aIConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.funnelLead.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ])

  return [mentor?.lastInteractionAt, session?.updatedAt, conversation?.updatedAt, entry?.createdAt, lead?.updatedAt]
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
}

export async function resolveUserState(userId: string): Promise<UserState> {
  const [user, mentor, entries, conversations, leads, subscription, lastActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStartsAt: true,
        trialEndsAt: true,
      },
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
    prisma.dailyEntry.count({ where: { userId } }),
    prisma.aIConversation.count({ where: { userId } }),
    prisma.funnelLead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        status: true,
        notes: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        trialEndsAt: true,
      },
    }),
    getLastActivityAt(userId),
  ])

  void mentor

  if (!user) {
    return 'new'
  }

  if (subscription?.status === 'ACTIVE') {
    return 'subscribed'
  }

  if (
    subscription?.status === 'TRIAL' &&
    (!subscription.trialEndsAt || subscription.trialEndsAt.getTime() > Date.now())
  ) {
    return 'in_trial'
  }

  if (user.trialStartsAt && (!user.trialEndsAt || user.trialEndsAt.getTime() > Date.now())) {
    return 'in_trial'
  }

  const hoursSilent = lastActivity
    ? (Date.now() - lastActivity.getTime()) / 3600000
    : 999

  const hasInteraction = entries > 0 || conversations > 0
  const latestLead = leads[0] ?? null

  if (!latestLead) {
    if (hasInteraction && hoursSilent <= 24) {
      return 'active'
    }
    return 'new'
  }

  const normalizedNotes = (latestLead.notes ?? '').toLowerCase()
  if (normalizedNotes.includes('finished')) {
    return 'lm_completed'
  }

  if (normalizedNotes.includes('exit')) {
    return 'lm_exited'
  }

  const progress = extractLeadProgress(normalizedNotes)
  if (progress !== null) {
    if (progress >= 80) {
      return 'lm_almost_done'
    }
    if (progress >= 30) {
      return 'lm_engaged'
    }
    return 'lm_started'
  }

  const leadAgeHours = (Date.now() - latestLead.updatedAt.getTime()) / 3600000
  if (hasInteraction && leadAgeHours <= 6) {
    return 'lm_almost_done'
  }
  if (hasInteraction || leadAgeHours <= 24 || normalizedNotes.includes('active_lead_magnet_session')) {
    return 'lm_engaged'
  }

  return 'lm_started'
}

export function getStateMessage(
  state: UserState,
  name: string,
  mentor: MenuMentor | null,
  trialDay?: string,
  nudgeCount = 0,
): StateMessage {
  const insight = mentor?.insight ? `\n\n${mentor.insight}` : ''
  const activeStateLabel = mentor?.stage ? `\nСтан: ${mentor.stage}` : '\nСтан: у процесі'
  const map: Record<UserState, StateMessage> = {
    new: getProductShowcaseMessage(),
    lm_started: {
      text: `Ти відкрила лідмагніт, але не почала.${insight}\n\nЯкщо залишиш це тут, нічого не зміниться.\n\nПродовжиш зараз чи вийдеш?`,
      buttons: [
        [{ text: '▶️ Продовжити', callback_data: 'lm_continue' }],
        [{ text: '× Вийти', callback_data: 'lm_exit_soft' }],
      ],
    },
    lm_engaged: {
      text: `Ти почала і зупинилась.${insight}\n\nСаме на цьому місці результат знову відкладається.\n\nПовертаємось чи закриваємо?`,
      buttons: [
        [{ text: '▶️ Продовжити', callback_data: 'lm_continue' }],
        [{ text: '× Вийти', callback_data: 'lm_exit_soft' }],
      ],
    },
    lm_almost_done: {
      text: `Ти майже дійшла.${insight}\n\nЗупинка зараз означає втратити майже завершений крок.\n\nДотискаємо чи виходиш?`,
      buttons: [
        [{ text: '▶️ Завершити', callback_data: 'lm_continue' }],
        [{ text: '× Вийти', callback_data: 'lm_exit_soft' }],
      ],
    },
    lm_completed: {
      text: `Ти завершила лідмагніт.${insight}\n\nДалі або запускаєш систему, або залишаєш все на рівні розуміння.\n\n7 днів з AI Ментором + колесо балансу — наступний крок.`,
      buttons: [
        [{ text: '✨ 7 днів з AI Ментором', callback_data: 'start_trial' }],
        [{ text: '× Вийти', callback_data: 'lm_exit_soft' }],
      ],
    },
    lm_exited: {
      text: `Ти вийшла з лідмагніту.${insight}\n\nЩо це означає зараз?`,
      buttons: [
        [{ text: 'Не готова', callback_data: 'lm_exit_not_ready' }],
        [{ text: 'Не потрібно', callback_data: 'lm_exit_not_needed' }],
        [{ text: '▶️ Повернутись', callback_data: 'lm_continue' }],
      ],
    },
    active: {
      text: 'З поверненням.\nПродовжуємо з того місця де зупинились?',
      buttons: [
        [{ text: '▶️ Продовжити', callback_data: 'continue_flow' }],
        [{ text: '📊 Мій стан', callback_data: 'open_status' }],
      ],
    },
    in_trial: {
      text:
        `Сесія активна.\nПідписка: тріал · день ${trialDay ?? '?'} із 7.${activeStateLabel}${insight}\n\n` +
        'Можеш продовжити з місця зупинки або вийти із сесії.',
      buttons: [
        [{ text: '▶️ Продовжити', callback_data: 'continue_ai_mentor' }],
        [{ text: '⏸ Вийти із сесії', callback_data: 'pause_trial_session' }],
      ],
    },
    subscribed: {
      text:
        `Сесія активна.\nПідписка: активна.${activeStateLabel}${insight}\n\n` +
        'Можеш продовжити з місця зупинки або вийти із сесії.',
      buttons: [
        [{ text: '▶️ Продовжити', callback_data: 'continue_ai_mentor' }],
        [{ text: '⏸ Вийти із сесії', callback_data: 'pause_subscription_session' }],
      ],
    },
  }

  if (nudgeCount >= 1) {
    if (state === 'lm_started' || state === 'lm_engaged' || state === 'lm_almost_done') {
      return {
        text: `Не залишай це ще однією думкою після уроку.${insight}\n\nЯкщо не закриєш цей крок зараз, система знову залишиться незапущеною.`,
        buttons: [
          [{ text: '▶️ Продовжити', callback_data: 'lm_continue' }],
          [{ text: '✨ 7 днів з AI Ментором', callback_data: 'start_trial' }],
          [{ text: '🧭 5 точок опори', callback_data: 'open_lidmagnet' }],
        ],
      }
    }
  }

  void name
  return map[state]
}

export async function getStateMenu(
  state: UserState,
  user: MenuUser,
  mentor: MenuMentor | null,
): Promise<StateMessage> {
  const nudgeCount = await getLeadMagnetNudgeCount(user.id)
  return getStateMessage(state, '', mentor, getTrialDay(user.trialStartsAt), nudgeCount)
}

export async function sendEntryOffer(ctx: Context): Promise<void> {
  const menu = getStateMessage('new', '', null)
  await ctx.reply(menu.text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menu.buttons },
  })
}

export async function sendStateMenu(ctx: Context, userId: string): Promise<void> {
  const [user, mentor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        trialStartsAt: true,
      },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId },
      select: {
        insight: true,
        stage: true,
        blocker: true,
      },
    }),
  ])

  if (!user) {
    return
  }

  const state = await resolveUserState(userId)
  const menu = await getStateMenu(state, user, mentor)

  await ctx.reply(menu.text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menu.buttons },
  })
}

export function getNudgeText(
  state: UserState,
  mentor: { insight: string | null; blocker: string | null } | null,
  nudgeCount = 0,
): string {
  const insight = mentor?.insight ?? ''
  const blocker = mentor?.blocker ?? ''

  const map: Partial<Record<UserState, string>> = {
    lm_started: `Ти відкрила, але не почала.${blocker ? `\n\n${blocker}` : ''}\n\nПоки крок не зроблено, система не запускається.`,
    lm_engaged: `Ти зупинилась посередині.${blocker ? `\n\n${blocker}` : ''}\n\nЯкщо не повернешся, залишишся в тій самій точці.`,
    lm_almost_done: `${insight ? `${insight}\n\n` : ''}Ти майже завершила.\n\nЗараз зупинитись означає обірвати крок перед фіналом.`,
    lm_completed: `${insight ? `${insight}\n\n` : ''}Лідмагніт завершено.\n\nНаступне рішення: або запускаєш 7 днів з AI Ментором, або лишаєш усе без системи.`,
    lm_exited: 'Ти вийшла.\n\nПотрібно зафіксувати чому: не готова чи не потрібно.',
  }

  if (nudgeCount >= 1 && (state === 'lm_started' || state === 'lm_engaged' || state === 'lm_almost_done')) {
    return `Не залишай це після уроку.${blocker ? `\n\n${blocker}` : ''}\n\nАбо продовжуєш, або свідомо зупиняєшся тут.`
  }

  return map[state] ?? 'Starway. Система від стану до результату.'
}

async function getUserState(userId: string | null): Promise<{ state: TelegramUserState; trialDay: number | null }> {
  if (!userId) {
    return { state: 'NEW', trialDay: null }
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      createdAt: true,
      trialEndsAt: true,
    },
  })

  if (subscription?.status === 'ACTIVE') {
    return { state: 'SUBSCRIBED', trialDay: null }
  }

  if (subscription?.status === 'TRIAL') {
    const now = Date.now()
    const isTrialActive = !subscription.trialEndsAt || subscription.trialEndsAt.getTime() > now
    if (isTrialActive) {
      const trialDay = Math.max(1, Math.floor((now - subscription.createdAt.getTime()) / 86400000) + 1)
      return { state: 'TRIAL', trialDay: Math.min(trialDay, 7) }
    }
  }

  return { state: 'LINKED', trialDay: null }
}

async function decideNextStep(state: TelegramUserState, userId: string | null, trialDay: number | null): Promise<StartReply> {
  if (state === 'NEW') {
    const menu = getProductShowcaseMessage()
    return { text: menu.text, reply_markup: { inline_keyboard: menu.buttons } }
  }

  if (state === 'TRIAL') {
    const mentor = userId
      ? await prisma.userAIMentor.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { stage: true, insight: true, blocker: true },
        })
      : null
    const menu = getStateMessage('in_trial', '', mentor, String(trialDay ?? 1))
    return {
      text: menu.text,
      reply_markup: { inline_keyboard: menu.buttons },
    }
  }

  if (state === 'SUBSCRIBED') {
    const mentor = userId
      ? await prisma.userAIMentor.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { stage: true, insight: true, blocker: true },
        })
      : null
    const menu = getStateMessage('subscribed', '', mentor)
    return {
      text: menu.text,
      reply_markup: { inline_keyboard: menu.buttons },
    }
  }

  if (userId) {
    const menu = getProductShowcaseMessage()
    return { text: menu.text, reply_markup: { inline_keyboard: menu.buttons } }
  }

  return {
    text: 'Starway. Система від стану до результату.',
    reply_markup: continueOrRestartKeyboard().reply_markup,
  }
}

async function resolveUserId(ctx: Context): Promise<string | null> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null
  if (!chatId || !telegramUserId) {
    return null
  }

  return findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })
}

export async function handleStartWheel(ctx: Context) {
  const userId = await resolveUserId(ctx)
  if (!userId) {
    const replyMarkup = await getAccessAwareAppReplyMarkup(null)
    await ctx.reply('Відкрий додаток і натисни Підключити Telegram', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentState: 'TELEGRAM_LINKED',
      currentStep: 'WHEEL',
    },
  })

  const wheelUrl = getTelegramAppUrl('/wheel')
  await ctx.reply(
    'Колесо балансу.\n\nОціни кожну сферу від 1 до 10.\nЧесно — не як хочеш, а як є зараз.',
    {
      reply_markup: {
        inline_keyboard: [[
          wheelUrl
            ? { text: '▶️ Почати оцінку', url: wheelUrl }
            : { text: '← Повернутись', callback_data: 'return_main_menu' },
        ]],
      },
    },
  )
}

export async function handleStartTrial(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE]
    // Original trial logic remains below for normal mode.
    await ctx.reply('Доступ відкриється після завершення практикуму', {
      reply_markup: {
        inline_keyboard: [[{ text: '▶️ Продовжити', callback_data: 'lm_continue' }]],
      },
    })
    return
  }

  const userId = await resolveUserId(ctx)
  if (!userId) {
    const replyMarkup = await getAccessAwareAppReplyMarkup(null)
    await ctx.reply('Відкрий додаток і натисни Підключити Telegram', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialStartsAt: true },
  })

  if (user?.trialStartsAt) {
    const appUrl = getTelegramAppUrl()
    await ctx.reply('Ти вже використав пробний період.', {
      reply_markup: {
        inline_keyboard: [[
          appUrl
            ? { text: '🚀 Отримати повний доступ', url: appUrl }
            : { text: '← Повернутись', callback_data: 'return_main_menu' },
        ]],
      },
    })
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      trialStartsAt: new Date(),
      trialEndsAt: new Date(Date.now() + 7 * 86400000),
      currentState: 'TRIAL_DAY_1',
      currentStep: 'WHEEL',
    },
  })

  const wheelUrl = getTelegramAppUrl('/wheel')
  await ctx.reply(
    '7 днів розпочато.\n\nДень 1 — Колесо балансу.\nЦе точка відліку. Потім побачиш зміни.',
    {
      reply_markup: {
        inline_keyboard: [[
          wheelUrl
            ? { text: '▶️ Пройти колесо', url: wheelUrl }
            : { text: '← Повернутись', callback_data: 'return_main_menu' },
        ]],
      },
    },
  )
}

export async function handleContinueFlow(ctx: Context) {
  const userId = await resolveUserId(ctx)
  const userState = await getUserState(userId)
  const nextStep = await decideNextStep(userState.state, userId, userState.trialDay)
  await ctx.reply(nextStep.text, { reply_markup: nextStep.reply_markup })
}

export async function handleRestartFlow(ctx: Context) {
  const nextStep = await decideNextStep('NEW', null, null)
  await ctx.reply(nextStep.text, { reply_markup: nextStep.reply_markup })
}

export async function handleStart(ctx: StartContext) {
  const rawChatId = ctx.chat?.id
  if (!rawChatId) {
    await trackEvent({
      type: 'telegram_start',
      source: 'telegram',
      payload: {
        hasChat: false,
      },
    })
    const replyMarkup = await getAccessAwareAppReplyMarkup(null)
    await ctx.reply('⚠️ Не вдалося визначити чат.', {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
    return
  }

  const chatId = String(rawChatId)
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null
  const payload = getStartPayload(ctx)

  let linkedUserId = await findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })

  if (linkedUserId) {
    const existingState = await resolveUserState(linkedUserId).catch(() => 'new' as UserState)
    if (isLeadMagnetActive(existingState)) {
      return
    }
  }

  // =========================
  // 🚀 1. PAYLOAD = ПРІОРИТЕТ
  // =========================
  if (payload) {
    if (payload.startsWith(GENERIC_DEEPLINK_PREFIX)) {
      const resolvedDeepLink = await resolveDeepLinkToken({ token: payload, consume: true })

      if (resolvedDeepLink) {
        linkedUserId = await resolveOrCreateTelegramGuestUser({
          linkedUserId: resolvedDeepLink.userId,
          telegramUserId,
          telegramUserName,
          chatId,
          firstName,
        })

        await upsertTelegramBinding({
          userId: linkedUserId,
          chatId,
          telegramUserId,
          telegramUserName,
          firstName,
        })

        const state = await resolveUserState(linkedUserId).catch(() => 'new' as UserState)
        await trackEvent({
          userId: linkedUserId,
          type: 'telegram_start',
          source: 'telegram',
          state,
          payload: {
            payload,
            branch: 'generic_deeplink',
            action: resolvedDeepLink.action,
            target: resolvedDeepLink.target,
            path: resolvedDeepLink.path,
          },
        })

        if (resolvedDeepLink.action === 'bind_telegram' || resolvedDeepLink.target !== 'telegram') {
          await sendResolvedDeepLinkReply(ctx, {
            userId: linkedUserId,
            action: resolvedDeepLink.action,
            path: resolvedDeepLink.path,
            telegramState: state,
          })
          return
        }

        await sendStateMenu(ctx, linkedUserId)
        return
      }
    }

    const verifiedLegacyUserId = await verifyTelegramLinkCode(payload)
    if (verifiedLegacyUserId) {
      linkedUserId = verifiedLegacyUserId

      await upsertTelegramBinding({
        userId: linkedUserId,
        chatId,
        telegramUserId,
        telegramUserName,
        firstName,
      })

      await trackEvent({
        userId: linkedUserId,
        type: 'telegram_start',
        source: 'telegram',
        state: 'guest',
        payload: {
          payload,
          branch: 'legacy_binding_payload',
        },
      })

      await ctx.reply('Telegram підключено. Повернись у додаток, щоб продовжити flow.', {
        ...(await (async () => {
          const replyMarkup = await getAccessAwareAppReplyMarkup(linkedUserId)
          return replyMarkup ? { reply_markup: replyMarkup } : {}
        })()),
      })
      return
    }

    linkedUserId = await resolveOrCreateTelegramGuestUser({
      linkedUserId,
      telegramUserId,
      telegramUserName,
      chatId,
      firstName,
    })

    await upsertTelegramBinding({
      userId: linkedUserId,
      chatId,
      telegramUserId,
      telegramUserName,
      firstName,
    })

    // 🎯 якщо це SendPulse або будь-який funnel payload
    const isFunnel =
      isSendPulsePayload(payload) ||
      payload.startsWith('sp_') ||
      payload.startsWith('lead_') ||
      payload.startsWith(STARTWAY_DEEPLINK_PREFIX) ||
      payload.startsWith(LEGACY_DEEPLINK_PREFIX) ||
      payload.length > 10

    if (isFunnel) {
      const existingState = await resolveUserState(linkedUserId).catch(() => 'new' as UserState)
      if (isLeadMagnetActive(existingState)) {
        return
      }

      await markLeadMagnetSessionActive(linkedUserId, payload)
      await trackEvent({
        userId: linkedUserId,
        type: 'telegram_start',
        source: 'telegram',
        state: 'lm_engaged',
        payload: {
          payload,
          branch: 'funnel_payload',
        },
      })

      await ctx.reply('Зараз ти проходиш безкоштовний практикум 👇\nЗаверши його, щоб рухатись далі.')
      return
    }

    // ❗ payload є, але не funnel → все одно НЕ new
    await trackEvent({
      userId: linkedUserId,
      type: 'telegram_start',
      source: 'telegram',
      state: 'guest',
      payload: {
        payload,
        branch: 'non_funnel_payload',
      },
    })
    await sendStateMenu(ctx, linkedUserId)
    return
  }

  // =========================
  // 🧱 2. НЕМА PAYLOAD
  // =========================

  if (!linkedUserId) {
    await trackEvent({
      type: 'telegram_start',
      source: 'telegram',
      state: 'new',
      payload: {
        branch: 'new',
      },
    })
    const msg = getStateMessage('new', firstName, null)

    await ctx.reply(msg.text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: msg.buttons },
    })

    await setPersistentKeyboardSilently(ctx)
    return
  }

  // =========================
  // 🔁 3. LINKED USER
  // =========================

  await upsertTelegramBinding({
    userId: linkedUserId,
    chatId,
    telegramUserId,
    telegramUserName,
    firstName,
  })

  // Активний lead magnet = повна тиша.
  if (await hasActiveSendPulseLeadMagnetSession(linkedUserId)) {
    return
  }

  const [user, mentor, state] = await Promise.all([
    prisma.user.findUnique({
      where: { id: linkedUserId },
      select: { trialStartsAt: true },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId: linkedUserId },
      select: { insight: true, stage: true },
    }),
    resolveUserState(linkedUserId),
  ])

  const nudgeCount = await getLeadMagnetNudgeCount(linkedUserId)

  const msg = getStateMessage(
    state,
    firstName,
    mentor,
    getTrialDay(user?.trialStartsAt),
    nudgeCount,
  )

  if (isLeadMagnetActive(state)) {
    return
  }

  await trackEvent({
    userId: linkedUserId,
    type: 'telegram_start',
    source: 'telegram',
    state,
    payload: {
      branch: 'linked',
    },
  })

  await ctx.reply(msg.text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: msg.buttons },
  })

  await setPersistentKeyboardSilently(ctx)
}
