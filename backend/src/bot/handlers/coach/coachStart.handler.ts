import type { Context, Telegraf } from 'telegraf'
import { Markup } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'
import { prisma } from '../../../db/client.js'
import { analyticsHandler } from './analytics.handler.js'
import { activateProductSubscription } from '../../../modules/subscriptions/payments/paymentActivation.service.js'
import { sendAbTestBlock12Welcome } from '../../../modules/subscriptions/payments/callback.notifications.js'
import {
  handleCoachAudioCommand,
  handleCoachNotifyCommand,
  handleCoachUsersCommand,
  validateCoachContentCatalog,
} from '../coachContent.handler.js'
import {
  hoursMenuHandler,
  nextWeekDoneHandler,
  nextWeekMenuHandler,
  nextWeekNoopHandler,
  scheduleMenuHandler,
  scheduleToggleHandler,
  toggleDayHandler,
  toggleHourHandler,
} from './schedule.handler.js'
import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'
import {
  AI_OPERATOR_ACTIONS,
  isCoachDialogueAwaiting,
  isCoachPostEditingActive,
  runCoachOperatorAction,
  runCoachStartDay,
  submitCoachDialogues,
  submitCoachEditedPost,
} from '../../../modules/ai-operator/operator.service.js'

const COACH_CALENDAR_ROUTE = '/miniapp/zoom-calendar'

function resolveCoachCalendarWebAppUrl(): string {
  const base = resolveTelegramWebappBaseUrl()
  const finalUrl = `${base.replace(/\/$/, '')}${COACH_CALENDAR_ROUTE}`
  console.info('[ZOOM_CALENDAR_BUTTON_DEBUG]', {
    source: 'coachStart.resolveCoachCalendarWebAppUrl',
    chatId: null,
    finalUrl,
    mode: 'web_app',
    envBase: {
      TELEGRAM_WEBAPP_BASE_URL: process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? null,
      PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL?.trim() ?? null,
    },
    route: COACH_CALENDAR_ROUTE,
  })
  return finalUrl
}

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

const COACH_RUNTIME_ERROR_MESSAGE = coachBotContent.runtime.error

async function reportCoachRuntimeError(ctx: Context, scope: string, error: unknown): Promise<void> {
  console.error(`[coach-start:${scope}] failed`, error)
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
  }
  await ctx.reply(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
}

function withCoachRuntimeProtection<T extends Context>(
  scope: string,
  handler: (ctx: T) => Promise<unknown>,
) {
  return async (ctx: T): Promise<void> => {
    try {
      await handler(ctx)
    } catch (error) {
      await reportCoachRuntimeError(ctx, scope, error)
    }
  }
}

async function checkCoachAccess(ctx: Context): Promise<boolean> {
  if (ctx.chat?.type && ctx.chat.type !== 'private') {
    const chatId = String(ctx.chat?.id ?? '').trim()
    const opsChatId = String(
      process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
    ).trim()
    if (!chatId || !opsChatId || chatId !== opsChatId) {
      return false
    }
  }
  return checkCoachRole(ctx)
}

function isStarwayOpsChat(ctx: Context): boolean {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const opsChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  return Boolean(chatId && opsChatId && chatId === opsChatId)
}

async function resolvePaymentAdminTarget(rawCallbackData: string): Promise<{
  userId: string
  orderReference: string | null
} | null> {
  const parts = rawCallbackData.split(':')
  const firstPayloadPart = parts[2] ?? ''
  const secondPayloadPart = parts[3] ?? ''

  if (!firstPayloadPart || firstPayloadPart === 'missing_checkout_token') {
    return null
  }

  if (secondPayloadPart) {
    const legacyCheckout = await prisma.checkoutSession.findFirst({
      where: {
        userId: firstPayloadPart,
        orderReference: secondPayloadPart,
      },
      select: {
        userId: true,
        orderReference: true,
      },
    })

    return legacyCheckout ?? {
      userId: firstPayloadPart,
      orderReference: secondPayloadPart,
    }
  }

  return prisma.checkoutSession.findUnique({
    where: { token: firstPayloadPart },
    select: {
      userId: true,
      orderReference: true,
    },
  })
}

async function showCoachMenu(ctx: Context): Promise<void> {
  const text = `${coachBotContent.start.title}\n\n${coachBotContent.start.subtitle}`
  await ctx.reply(text, {
    reply_markup: {
      keyboard: [
        [
          Markup.button.text(coachBotContent.menu.calendar),
          Markup.button.text(coachBotContent.menu.conduct),
        ],
        [
          Markup.button.text(coachBotContent.menu.members),
          Markup.button.text(coachBotContent.menu.analytics),
        ],
        [
          Markup.button.text(coachBotContent.menu.library),
          Markup.button.text(coachBotContent.menu.settings),
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
    },
  })
}

async function showCoachSystemMenu(ctx: Context): Promise<void> {
  const finalUrl = resolveCoachCalendarWebAppUrl()
  console.info('[ZOOM_CALENDAR_BUTTON_DEBUG]', {
    source: 'coachStart.showCoachSystemMenu',
    chatId: String(ctx.chat?.id ?? ctx.from?.id ?? ''),
    finalUrl,
    mode: 'web_app',
    envBase: {
      TELEGRAM_WEBAPP_BASE_URL: process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? null,
      PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL?.trim() ?? null,
    },
    route: COACH_CALENDAR_ROUTE,
  })

  await ctx.reply(
    `${coachBotContent.system.title}\n\n${coachBotContent.system.subtitle}`,
    Markup.inlineKeyboard([
      [Markup.button.webApp(coachBotContent.menu.schedule, finalUrl)],
      [Markup.button.callback(coachBotContent.menu.members, 'coach:participants')],
      [Markup.button.callback(coachBotContent.menu.notifications, 'coach:notifications')],
      [Markup.button.callback(coachBotContent.menu.payments, 'coach-content:payments')],
      [Markup.button.callback('📈 Повна аналітика', 'coach:analytics')],
    ]),
  )
}

async function showCoachNewZoomPrompt(ctx: Context): Promise<void> {
  await ctx.reply(coachBotContent.audio.uploadPrompt)
}

async function checkCoachRole(ctx: Context): Promise<boolean> {
  const tgId = ctx.from?.id?.toString()
  if (!tgId) return false

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId: tgId },
        { telegramChatId: tgId },
      ],
    },
    select: { role: true },
  })

  return user?.role === 'EXPERT' || user?.role === 'SUPERADMIN'
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  const tgId = ctx.from?.id?.toString()
  if (!tgId) return null

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId: tgId },
        { telegramChatId: tgId },
      ],
    },
    select: { id: true },
  })

  return user?.id ?? null
}

export function registerCoachBotHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.use(async (ctx, next) => {
    if (!ctx.message || !('text' in ctx.message)) {
      return next()
    }
    if (!await checkCoachAccess(ctx)) {
      return next()
    }

    const userId = await resolveCoachUserId(ctx)
    if (!userId) {
      return next()
    }

    const text = String(ctx.message.text ?? '').trim()
    if (!text) {
      return next()
    }

    if (await isCoachPostEditingActive(userId)) {
      const step = await submitCoachEditedPost(userId, text)
      await ctx.reply(step.text, {
        parse_mode: 'HTML',
        ...(step.buttons.length
          ? { reply_markup: { inline_keyboard: step.buttons } }
          : {}),
      })
      return
    }

    if (!await isCoachDialogueAwaiting(userId)) {
      return next()
    }

    const step = await submitCoachDialogues(userId, text)
    await ctx.reply(step.text, {
      parse_mode: 'HTML',
      ...(step.buttons.length
        ? { reply_markup: { inline_keyboard: step.buttons } }
        : {}),
    })
    return
  })

  telegramBot.start(withCoachRuntimeProtection('start', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(coachBotContent.access.denied)
      return
    }
    await showCoachMenu(ctx)
  }))
  telegramBot.command('start', withCoachRuntimeProtection('command:start', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(coachBotContent.access.denied)
      return
    }
    await showCoachMenu(ctx)
  }))
  telegramBot.hears(/^\/schedule(?:@\w+)?(?:\s+(.*))?$/iu, withCoachRuntimeProtection('command:schedule', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) return

    const payload = getCommandPayload(ctx).toLowerCase()
    if (payload.startsWith('add')) {
      await nextWeekMenuHandler(ctx)
      return
    }

    await scheduleMenuHandler(ctx)
  }))
  telegramBot.hears(/^\/start-day(?:@\w+)?$/iu, withCoachRuntimeProtection('command:start-day', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return

    const userId = await resolveCoachUserId(ctx)
    if (!userId) {
      await ctx.reply('Не вдалося визначити профіль коуча.')
      return
    }

    const step = await runCoachStartDay(userId)
    await ctx.reply(
      step.text,
      {
        parse_mode: 'HTML',
        ...(step.buttons.length
          ? { reply_markup: { inline_keyboard: step.buttons } }
          : {}),
      },
    )
  }))
  telegramBot.action('coach:schedule', withCoachRuntimeProtection('action:coach:schedule', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return scheduleMenuHandler(ctx)
  }))
  telegramBot.action(/^coach:slot:/, withCoachRuntimeProtection('action:coach:slot', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return scheduleToggleHandler(ctx)
  }))
  telegramBot.action('coach:next_week', withCoachRuntimeProtection('action:coach:next_week', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekMenuHandler(ctx)
  }))
  telegramBot.action(/^coach:nw:day:/, withCoachRuntimeProtection('action:coach:nw:day', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return toggleDayHandler(ctx)
  }))
  telegramBot.action('coach:nw:hours', withCoachRuntimeProtection('action:coach:nw:hours', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return hoursMenuHandler(ctx)
  }))
  telegramBot.action(/^coach:nw:hour:/, withCoachRuntimeProtection('action:coach:nw:hour', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return toggleHourHandler(ctx)
  }))
  telegramBot.action('coach:nw:done', withCoachRuntimeProtection('action:coach:nw:done', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekDoneHandler(ctx)
  }))
  telegramBot.action(/^coach:nw:(label):/, withCoachRuntimeProtection('action:coach:nw:label', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekNoopHandler(ctx)
  }))
  telegramBot.action('coach:analytics', withCoachRuntimeProtection('action:coach:analytics', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return analyticsHandler(ctx)
  }))
  telegramBot.action('coach:participants', withCoachRuntimeProtection('action:coach:participants', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return handleCoachUsersCommand(ctx, '')
  }))
  telegramBot.action('coach:notifications', withCoachRuntimeProtection('action:coach:notifications', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return handleCoachNotifyCommand(ctx, '')
  }))
  telegramBot.action('content_os:start_planning', withCoachRuntimeProtection('action:content_os:start_planning', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    await ctx.answerCbQuery('Починаємо планування').catch(() => undefined)
    await ctx.reply([
      '📍 Зараз: Аналіз тижня',
      '⬜ Далі: Бізнес-сигнали → Інсайти → Тема → Контент-план',
      '',
      'Ми аналізуємо минулий тиждень і плануємо новий?',
      'Або одразу плануємо — і ти розкажеш що було по ходу?',
    ].join('\n'))
  }))
  telegramBot.action(/^aiop:/, withCoachRuntimeProtection('action:ai-operator', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()

    const userId = await resolveCoachUserId(ctx)
    if (!userId) {
      await ctx.answerCbQuery('Профіль не знайдено').catch(() => undefined)
      return
    }

    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const action = raw as typeof AI_OPERATOR_ACTIONS[keyof typeof AI_OPERATOR_ACTIONS]
    const step = await runCoachOperatorAction(userId, action)

    await ctx.answerCbQuery('Оновлено').catch(() => undefined)
    await ctx.editMessageText(step.text, {
      parse_mode: 'HTML',
      ...(step.buttons.length
        ? { reply_markup: { inline_keyboard: step.buttons } }
        : {}),
    }).catch(() => undefined)
  }))
  telegramBot.hears(coachBotContent.menu.library, withCoachRuntimeProtection('menu:audio', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await handleCoachAudioCommand(ctx, '')
  }))
  telegramBot.hears(coachBotContent.menu.conduct, withCoachRuntimeProtection('menu:newZoom', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await showCoachNewZoomPrompt(ctx)
  }))
  telegramBot.hears(coachBotContent.menu.members, withCoachRuntimeProtection('menu:members', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await handleCoachUsersCommand(ctx, '')
  }))
  telegramBot.hears(coachBotContent.menu.analytics, withCoachRuntimeProtection('menu:analytics', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await analyticsHandler(ctx)
  }))
  telegramBot.hears(coachBotContent.menu.calendar, withCoachRuntimeProtection('menu:calendar', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await scheduleMenuHandler(ctx)
  }))
  telegramBot.hears(coachBotContent.menu.settings, withCoachRuntimeProtection('menu:system', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await showCoachSystemMenu(ctx)
  }))
  telegramBot.action(/^admin:grant_focus:/, withCoachRuntimeProtection('action:admin:grant_focus', async (ctx) => {
    const hasAccess = await checkCoachAccess(ctx)
    if (!hasAccess && !isStarwayOpsChat(ctx)) {
      return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
    }
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const checkoutTarget = await resolvePaymentAdminTarget(raw)
    if (!checkoutTarget?.userId || !checkoutTarget.orderReference) {
      await ctx.answerCbQuery(coachBotContent.paymentAdmin.invalidToken).catch(() => undefined)
      return
    }
    const userId = checkoutTarget.userId
    const orderReference = checkoutTarget.orderReference
    const result = await activateProductSubscription({
      userId,
      productCode: 'focus',
      source: 'coach_manual',
      orderReference,
      planMonths: 1,
      manualNote: 'coach confirmed via telegram',
    })
    if (result.success) {
      await sendAbTestBlock12Welcome(userId).catch(() => undefined)
      await ctx.answerCbQuery(coachBotContent.paymentAdmin.accessGranted).catch(() => undefined)
      await ctx.reply(`${coachBotContent.paymentAdmin.manualAccessGranted}\nuserId: ${userId}`)
      return
    }
    await ctx.answerCbQuery(coachBotContent.paymentAdmin.error).catch(() => undefined)
    await ctx.reply(`${coachBotContent.paymentAdmin.manualAccessFailed}\nПричина: ${result.message}\nuserId: ${userId}`)
  }))
  telegramBot.action(/^admin:deny_focus:/, withCoachRuntimeProtection('action:admin:deny_focus', async (ctx) => {
    const hasAccess = await checkCoachAccess(ctx)
    if (!hasAccess && !isStarwayOpsChat(ctx)) {
      return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
    }
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const checkoutTarget = await resolvePaymentAdminTarget(raw)
    if (!checkoutTarget?.userId) {
      await ctx.answerCbQuery(coachBotContent.paymentAdmin.invalidToken).catch(() => undefined)
      return
    }
    const userId = checkoutTarget.userId
    await ctx.answerCbQuery(coachBotContent.paymentAdmin.denied).catch(() => undefined)
    await ctx.reply(`${coachBotContent.paymentAdmin.manualAccessDenied}\nuserId: ${userId}`)
  }))
}
