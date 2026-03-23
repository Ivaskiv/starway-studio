import type { Context } from 'telegraf'
import { bot } from '../../lib/telegram.js'
import { prisma } from '../../db/client.js'
import { trackEvent } from '../events/service.js'
import { handleAIMentor } from './handlers/aiMentor.js'
import { handleChat } from './handlers/chat.js'
import { handleEvening, handleEveningAnswer } from './handlers/evening.js'
import { handleLidmagnet } from './handlers/lidmagnet.js'
import { handleMorning, handleMorningAnswer } from './handlers/morning.js'
import { handlePrivacy } from './handlers/privacy.js'
import {
  handleContinueFlow,
  handleRestartFlow,
  resolveLinkedUserIdFromContext,
  resolveUserState,
  sendEntryOffer,
  sendStateMenu,
  handleStart,
  handleStartTrial,
  handleStartWheel,
} from './handlers/start.js'
import { handleStatus } from './handlers/status.js'
import { handleTaskDone, handleTasks } from './handlers/tasks.js'
import { getTelegramAppUrl, mainMenuKeyboard, openAppKeyboard, supportMenuKeyboard } from './keyboards.js'
import { handleUpdate } from './router/router.js'
import { clearSession, getSession, getUserIdByChatId } from './session.js'
import { logger } from '../../utils/logger.js'
import { lmOnlyModeMiddleware } from '../../middleware/lmOnlyMode.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

export async function registerMentorBot() {
  if (mentorBotRegistered) return
  mentorBotRegistered = true

  // Prevent duplicate processing of the same Telegram update.
  bot.use(async (ctx, next) => {
    const updateId = ctx.update.update_id
    if (processedUpdates.has(updateId)) {
      return
    }

    processedUpdates.add(updateId)
    setTimeout(() => processedUpdates.delete(updateId), 5_000)

    await next()
  })

  // [LM_ONLY_MODE] added
  // Middleware placed before command/message/callback handlers.
  bot.use(lmOnlyModeMiddleware)

  bot.command('start', async (ctx) => {
    await handleStart(ctx as Context & { startPayload?: string })
  })

  bot.on('message', async (ctx) => {
    try {
      if (!('text' in ctx.message) || !ctx.message?.text) {
        return
      }

      await handleMessageUpdate(ctx)
    } catch (error) {
      logger.error('[handleMessageUpdate]', error)
      throw error
    }
  })

  bot.on('callback_query', async (ctx) => {
    try {
      await handleCallbackUpdate(ctx)
    } catch (error) {
      logger.error('[handleCallbackUpdate]', error)
      throw error
    }
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[bot.catch]', err)
      try {
        const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
        const link = chatId
          ? await prisma.telegramLink.findFirst({
              where: { chatId },
              select: { userId: true },
            })
          : null

        if (link?.userId) {
          await sendStateMenu(ctx, link.userId)
          return
        }

        await sendEntryOffer(ctx)
      } catch {
        // silent
      }
    })()
  })

  await bot.telegram.setMyCommands([])

  console.log('✅ [TelegramMentor] Handlers registered')
}

function getChatId(ctx: Context): string | null {
  const chat = ctx.chat as { id?: number } | undefined
  return chat?.id ? String(chat.id) : null
}

async function getUserIdByTelegramContext(ctx: Context): Promise<string | null> {
  const chatId = getChatId(ctx)
  if (!chatId) {
    return null
  }

  return getUserIdByChatId(chatId)
}

async function resolveTelegramEventState(ctx: Context, userId: string | null): Promise<string | null> {
  const chatId = getChatId(ctx)
  const session = chatId ? await getSession(chatId) : null
  if (session?.state.startsWith('morning_q')) {
    return 'morning'
  }

  if (session?.state.startsWith('evening_q')) {
    return 'evening'
  }

  if (!userId) {
    return null
  }

  return resolveUserState(userId)
}

function getBannerReason(mentor: { stage: string | null; clarityLevel: string | null; insight: string | null } | null): string {
  if (!mentor) {
    return 'Ось що може допомогти на наступному кроці:'
  }

  if (mentor.stage === 'CONFLICT') {
    return `Система бачить: ${mentor.insight ?? 'є розрив між хочу і роблю'}.\n\nОсь що може допомогти зрушити:`
  }

  if (mentor.stage === 'AWARENESS') {
    return 'Ти розумієш де проблема.\nНаступний крок — конкретна система:'
  }

  if (mentor.stage === 'DECISION') {
    return 'Ти вже майже готовий(а) діяти.\nОсь інструменти які прискорять:'
  }

  if (mentor.clarityLevel === 'LOW') {
    return 'Багато питань — мало ясності.\nОсь що дає структуру:'
  }

  return 'На основі твого стану — ось що підходить найбільше:'
}

async function getProductBanners(userId: string) {
  const products = await prisma.product.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      name: true,
      description: true,
    },
  })

  return products.map(product => ({
    title: product.name,
    subtitle: product.description ?? 'Наступний крок у системі Starway.',
    cta: 'Відкрити',
    url: getTelegramAppUrl(`/products/${product.id}`),
  }))
}

async function handleMessageUpdate(ctx: Context): Promise<void> {
  // [LM_ONLY_MODE FIX]
  // /start обробляє тільки bot.command('start'), щоб уникнути double-fire.
  const msgText = 'message' in ctx && ctx.message && 'text' in ctx.message
    ? String(ctx.message.text ?? '').trim()
    : ''
  if (msgText.startsWith('/start')) {
    return
  }

  await handleUpdate(ctx)
}

async function handleCallbackUpdate(ctx: Context): Promise<void> {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await handleFallback(ctx)
    return
  }

  const data = ctx.callbackQuery.data
  const userId = await getUserIdByTelegramContext(ctx)
  const state = await resolveTelegramEventState(ctx, userId)

  await trackEvent({
    userId,
    type: 'telegram_button_click',
    source: 'telegram',
    state,
    payload: {
      callbackData: data,
    },
  })

  if (data.startsWith('done_')) {
    await handleTaskDone(ctx, data.replace('done_', ''))
    return
  }

  if (data === 'continue_ai_mentor') {
    // [LM_ONLY_MODE DISABLED]
    // Original AI mentor callback remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleAIMentor(ctx)
    return
  }

  if (data === 'continue_flow') {
    // [LM_ONLY_MODE DISABLED]
    // Original continue flow remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleContinueFlow(ctx)
    return
  }

  if (data === 'restart_flow') {
    // [LM_ONLY_MODE DISABLED]
    // Original restart flow remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleRestartFlow(ctx)
    return
  }

  if (data === 'start_wheel') {
    // [LM_ONLY_MODE DISABLED]
    // Original wheel entry remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleStartWheel(ctx)
    return
  }

  if (data === 'start_trial') {
    // [LM_ONLY_MODE DISABLED]
    // Original trial start remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleStartTrial(ctx)
    return
  }

  if (data === 'buy_subscription') {
    // [LM_ONLY_MODE DISABLED]
    // Original subscription CTA remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    const url = getTelegramAppUrl('/dashboard/subscription') ?? getTelegramAppUrl('/subscription')
    await ctx.reply('Щоб отримати повний доступ, відкрий сторінку підписки.', {
      reply_markup: {
        inline_keyboard: [[
          url
            ? { text: '🚀 Відкрити підписку', url }
            : { text: '🏠 Головне меню', callback_data: 'main_menu' },
        ]],
      },
    })
    return
  }

  if (data === 'pause_trial_session' || data === 'pause_subscription_session') {
    await ctx.answerCbQuery()
    await ctx.reply(
      data === 'pause_trial_session'
        ? 'Сесію призупинено.\n\nТріал продовжує тривати, дні не зупиняються.\nКоли повернешся, продовжиш з того місця, де зупинилась.'
        : 'Сесію призупинено.\n\nПідписка залишається активною, кошти не повертаються.\nКоли повернешся, продовжиш з того місця, де зупинилась.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ Продовжити з місця зупинки', callback_data: 'continue_ai_mentor' }],
            [{ text: '🏠 Головне меню', callback_data: 'return_main_menu' }],
          ],
        },
      },
    )
    return
  }

  if (data === 'return_main_menu' || data === 'main_menu') {
    await ctx.answerCbQuery()
    await handleFallback(ctx)
    return
  }

  if (data === 'lm_continue') {
    await ctx.answerCbQuery()
    const url = getTelegramAppUrl('/lead-magnet')
    await ctx.reply('Продовжуємо.', {
      reply_markup: {
        inline_keyboard: [[
          url
            ? { text: '▶️ Перейти до матеріалу', url }
            : { text: '🏠 Головне меню', callback_data: 'main_menu' },
        ]],
      },
    })
    return
  }

  if (data === 'lm_exit_soft') {
    await ctx.answerCbQuery()
    await ctx.reply('Зафіксуй причину виходу.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Не готова', callback_data: 'lm_exit_not_ready' }],
          [{ text: 'Не потрібно', callback_data: 'lm_exit_not_needed' }],
        ],
      },
    })
    return
  }

  if (data === 'lm_exit_not_ready' || data === 'lm_exit_not_needed') {
    await ctx.answerCbQuery()

    const userId = await getUserIdByTelegramContext(ctx)
    if (!userId) {
      return
    }

    const activeLead = await prisma.funnelLead.findFirst({
      where: {
        userId,
        status: 'LEAD',
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })

    if (activeLead) {
      await prisma.funnelLead.update({
        where: { id: activeLead.id },
        data: {
          notes: data === 'lm_exit_not_ready' ? 'exit_not_ready' : 'exit_not_needed',
        },
      })
    }

    await ctx.reply('Зафіксовано.', {
      reply_markup: {
        inline_keyboard: [[
          { text: '✨ 7 днів з AI Ментором', callback_data: 'start_trial' },
        ]],
      },
    })
    return
  }

  if (data === 'lm_exit_confirm') {
    await ctx.answerCbQuery()

    const userId = await getUserIdByTelegramContext(ctx)
    if (!userId) {
      return
    }

    const [entries, streak, wheel, mentor] = await Promise.all([
      prisma.dailyEntry.count({ where: { userId } }),
      prisma.streak.findFirst({
        where: { userId },
        select: { current: true },
      }),
      prisma.wheelAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.userAIMentor.findFirst({
        where: { userId },
        select: { stage: true, insight: true },
      }),
    ])

    const stats = [
      entries ? `Записів: ${entries}` : null,
      streak?.current ? `Серія: ${streak.current} днів` : null,
      wheel ? `Колесо: ${new Date(wheel.createdAt).toLocaleDateString('uk-UA')}` : null,
      mentor?.stage ? `Стадія: ${mentor.stage}` : null,
      mentor?.insight ? `\n${mentor.insight}` : null,
    ].filter((value): value is string => Boolean(value)).join('\n')

    await ctx.reply(`Ось де ти зараз:\n\n${stats || 'Даних ще немає.'}\n\nВсе одно вийти?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '▶️ Залишитись', callback_data: 'lm_continue' }],
          [{ text: '× Вийти', callback_data: 'lm_exit_final' }],
        ],
      },
    })
    return
  }

  if (data === 'lm_exit_final') {
    await ctx.answerCbQuery()

    const userId = await getUserIdByTelegramContext(ctx)
    if (!userId) {
      return
    }

    const activeLead = await prisma.funnelLead.findFirst({
      where: {
        userId,
        status: 'LEAD',
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })

    if (activeLead) {
      await prisma.funnelLead.update({
        where: { id: activeLead.id },
        data: {
          status: 'CHURNED',
          notes: 'lead_magnet_exited',
        },
      })
    }

    const [mentor, banners] = await Promise.all([
      prisma.userAIMentor.findFirst({
        where: { userId },
        select: { stage: true, clarityLevel: true, insight: true },
      }),
      getProductBanners(userId),
    ])

    await ctx.reply(getBannerReason(mentor))

    for (const banner of banners.slice(0, 3)) {
      await new Promise(resolve => setTimeout(resolve, 800))
      await ctx.reply(`${banner.title}\n\n${banner.subtitle}`, {
        reply_markup: {
          inline_keyboard: [[
            banner.url
              ? { text: banner.cta, url: banner.url }
              : { text: '🏠 Головне меню', callback_data: 'main_menu' },
          ]],
        },
      })
    }
    return
  }

  if (data === 'open_lidmagnet') {
    // [LM_ONLY_MODE DISABLED]
    // Original lead magnet trigger remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleLidmagnet(ctx)
    return
  }

  if (data === 'open_status') {
    // [LM_ONLY_MODE DISABLED]
    // Original status path remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleStatus(ctx)
    return
  }

  if (data === 'open_tasks') {
    // [LM_ONLY_MODE DISABLED]
    // Original task path remains below but is blocked in LM_ONLY mode.
    await ctx.answerCbQuery()
    await handleTasks(ctx)
    return
  }

  if (data === 'open_support') {
    await ctx.answerCbQuery()
    await ctx.reply('Підтримка:', {
      reply_markup: supportMenuKeyboard.reply_markup,
    })
    return
  }

  if (data === 'open_privacy') {
    await ctx.answerCbQuery()
    await handlePrivacy(ctx)
    return
  }

  if (data === 'open_goal') {
    await ctx.answerCbQuery()
    await handleGoal(ctx)
    return
  }

  await handleFallback(ctx)
}

async function handleCommand(ctx: Context, text: string, chatId: string): Promise<void> {
  const command = normalizeCommand(text)

  if (command === '/privacy') {
    await handlePrivacy(ctx)
    return
  }

  if (command === '/cancel') {
    const session = await getSession(chatId)
    if (session) await clearSession(session.userId, chatId)
    if (session?.userId) {
      await sendStateMenu(ctx, session.userId)
      return
    }

    await sendEntryOffer(ctx)
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

  await handleFallback(ctx)
}

async function handleFunnel(ctx: Context, text: string, state: string): Promise<void> {
  if (state.startsWith('morning_q')) {
    await handleMorningAnswer(ctx, text)
    return
  }

  if (state.startsWith('evening_q')) {
    await handleEveningAnswer(ctx, text)
    return
  }

  await handleFallback(ctx)
}

async function handleAI(ctx: Context, text: string): Promise<void> {
  await handleChat(ctx, text)
}

async function handleFallback(ctx: Context): Promise<void> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (userId) {
    await sendStateMenu(ctx, userId)
    return
  }

  await sendEntryOffer(ctx)
}

async function handleGoal(ctx: Context): Promise<void> {
  await ctx.reply('Щоб переглянути або оновити ціль, відкрий додаток.', {
    reply_markup: openAppKeyboard().reply_markup,
  })
}

function isCommand(text: string): boolean {
  return text.startsWith('/')
}

function isFunnel(state?: string): boolean {
  if (!state) {
    return false
  }

  return state.startsWith('morning_q') || state.startsWith('evening_q')
}

function isAI(state?: string): boolean {
  if (!state) {
    return false
  }

  return state === 'chat'
}

function normalizeCommand(text: string): string {
  if (!text.startsWith('/')) {
    return ''
  }

  const token = text.split(/\s+/, 1)[0] ?? ''
  return token.replace(/@\w+$/, '')
}
