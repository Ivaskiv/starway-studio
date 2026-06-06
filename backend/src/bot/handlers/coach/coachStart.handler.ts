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
import { handleCoachContentCommand } from '../../flows/contentPlanner.flow.js'
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

function resolveCoachCalendarWebAppUrl(): string {
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/zoom-calendar`
}

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

const COACH_RUNTIME_ERROR_MESSAGE = '❌ Сталася помилка. Спробуй ще раз.'

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
  if (ctx.chat?.type && ctx.chat.type !== 'private') return false
  return checkCoachRole(ctx)
}

async function showCoachMenu(ctx: Context): Promise<void> {
  const text = `${coachBotContent.start.title}\n\n${coachBotContent.start.subtitle}`
  await ctx.reply(text, {
    reply_markup: {
      keyboard: [
        [
          Markup.button.text(coachBotContent.menu.audio),
          Markup.button.webApp(coachBotContent.menu.schedule, resolveCoachCalendarWebAppUrl()),
        ],
        [
          Markup.button.text(coachBotContent.menu.planner),
          Markup.button.text(coachBotContent.menu.dna),
        ],
        [
          Markup.button.text(coachBotContent.menu.script),
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
    },
  })
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

export function registerCoachBotHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.start(withCoachRuntimeProtection('start', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(
        'Цей бот для коуча Starway Studio.\n'
        + 'Якщо ти коуч — відкрий його в особистому чаті та звернись до адміністратора.',
      )
      return
    }
    await showCoachMenu(ctx)
  }))
  telegramBot.command('start', withCoachRuntimeProtection('command:start', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(
        'Цей бот для коуча Starway Studio.\n'
        + 'Якщо ти коуч — відкрий його в особистому чаті та звернись до адміністратора.',
      )
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
  telegramBot.hears(coachBotContent.menu.audio, withCoachRuntimeProtection('menu:audio', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await handleCoachAudioCommand(ctx, '')
  }))
  telegramBot.hears(coachBotContent.menu.planner, withCoachRuntimeProtection('menu:planner', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN')
  }))
  telegramBot.hears(coachBotContent.menu.script, withCoachRuntimeProtection('menu:script', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await handleCoachContentCommand(ctx, 'FULL_CONTENT')
  }))
  telegramBot.hears(coachBotContent.menu.dna, withCoachRuntimeProtection('menu:analytics', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return
    await analyticsHandler(ctx)
  }))
  telegramBot.action(/^admin:grant_focus:/, withCoachRuntimeProtection('action:admin:grant_focus', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const parts = raw.split(':')
    const userId = parts[2] ?? ''
    const orderReference = parts.slice(3).join(':') || undefined
    if (!userId) {
      await ctx.answerCbQuery('Некоректний userId').catch(() => undefined)
      return
    }
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
      await ctx.answerCbQuery('Доступ відкрито').catch(() => undefined)
      await ctx.reply(`✅ Доступ до ФОКУС відкрито вручну.\nuserId: ${userId}`)
      return
    }
    await ctx.answerCbQuery('Помилка').catch(() => undefined)
    await ctx.reply(`❌ Не вдалося відкрити доступ.\nПричина: ${result.message}\nuserId: ${userId}`)
  }))
  telegramBot.action(/^admin:deny_focus:/, withCoachRuntimeProtection('action:admin:deny_focus', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const parts = raw.split(':')
    const userId = parts[2] ?? ''
    await ctx.answerCbQuery('Відхилено').catch(() => undefined)
    await ctx.reply(`❌ Ручне надання доступу відхилено.\nuserId: ${userId}`)
  }))
}
