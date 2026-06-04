import type { Context, Telegraf } from 'telegraf'
import { Markup } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'
import { prisma } from '../../../db/client.js'
import { analyticsHandler } from './analytics.handler.js'
import { activateProductSubscription } from '../../../modules/subscriptions/payments/paymentActivation.service.js'
import { sendAbTestBlock12Welcome } from '../../../modules/subscriptions/payments/callback.notifications.js'
import {
  handleCoachNotifyCommand,
  handleCoachUsersCommand,
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

function resolveCoachScheduleWebAppUrl(): string {
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/coach-schedule.html`
}

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

async function checkCoachAccess(ctx: Context): Promise<boolean> {
  if (ctx.chat?.type && ctx.chat.type !== 'private') return false
  return checkCoachRole(ctx)
}

async function showCoachMenu(ctx: Context): Promise<void> {
  const text = `${coachBotContent.start.title}\n\n${coachBotContent.start.subtitle}`
  await ctx.reply(text, {
    ...Markup.inlineKeyboard([
      [
        Markup.button.webApp(coachBotContent.menu.schedule, resolveCoachScheduleWebAppUrl()),
        Markup.button.callback(coachBotContent.menu.nextWeek, 'coach:next_week'),
      ],
      [
        Markup.button.callback(coachBotContent.menu.audio, 'coach-content:audio'),
        Markup.button.callback(coachBotContent.menu.planner, 'coach-content:planner'),
      ],
      [
        Markup.button.callback(coachBotContent.menu.dna, 'coach:analytics'),
        Markup.button.callback(coachBotContent.menu.payments, 'coach-content:payments'),
      ],
      [
        Markup.button.callback(coachBotContent.menu.members, 'coach-content:users'),
        Markup.button.callback(coachBotContent.menu.notifications, 'coach-content:notify'),
      ],
    ]),
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
  telegramBot.start(async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(
        'Цей бот для коуча Starway Studio.\n'
        + 'Якщо ти коуч — відкрий його в особистому чаті та звернись до адміністратора.',
      )
      return
    }
    await showCoachMenu(ctx)
  })
  telegramBot.command('start', async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) {
      await ctx.reply(
        'Цей бот для коуча Starway Studio.\n'
        + 'Якщо ти коуч — відкрий його в особистому чаті та звернись до адміністратора.',
      )
      return
    }
    await showCoachMenu(ctx)
  })
  telegramBot.hears(/^\/schedule(?:@\w+)?(?:\s+(.*))?$/iu, async (ctx) => {
    const isCoach = await checkCoachAccess(ctx)
    if (!isCoach) return

    const payload = getCommandPayload(ctx).toLowerCase()
    if (payload.startsWith('add')) {
      await nextWeekMenuHandler(ctx)
      return
    }

    await scheduleMenuHandler(ctx)
  })
  telegramBot.action('coach:schedule', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return scheduleMenuHandler(ctx)
  })
  telegramBot.action(/^coach:slot:/, async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return scheduleToggleHandler(ctx)
  })
  telegramBot.action('coach:next_week', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekMenuHandler(ctx)
  })
  telegramBot.action(/^coach:nw:day:/, async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return toggleDayHandler(ctx)
  })
  telegramBot.action('coach:nw:hours', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return hoursMenuHandler(ctx)
  })
  telegramBot.action(/^coach:nw:hour:/, async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return toggleHourHandler(ctx)
  })
  telegramBot.action('coach:nw:done', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekDoneHandler(ctx)
  })
  telegramBot.action(/^coach:nw:(label):/, async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return nextWeekNoopHandler(ctx)
  })
  telegramBot.action('coach:analytics', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return analyticsHandler(ctx)
  })
  telegramBot.action('coach:participants', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return handleCoachUsersCommand(ctx, '')
  })
  telegramBot.action('coach:notifications', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    return handleCoachNotifyCommand(ctx, '')
  })
  telegramBot.action('content_os:start_planning', async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    await ctx.answerCbQuery('Починаємо планування').catch(() => undefined)
    await ctx.reply([
      '📍 Зараз: Аналіз тижня',
      '⬜ Далі: Бізнес-сигнали → Інсайти → Тема → Контент-план',
      '',
      'Ми аналізуємо минулий тиждень і плануємо новий?',
      'Або одразу плануємо — і ти розкажеш що було по ходу?',
    ].join('\n'))
  })
  telegramBot.action(/^admin:grant_focus:/, async (ctx) => {
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
  })
  telegramBot.action(/^admin:deny_focus:/, async (ctx) => {
    if (!await checkCoachAccess(ctx)) return ctx.answerCbQuery()
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const parts = raw.split(':')
    const userId = parts[2] ?? ''
    await ctx.answerCbQuery('Відхилено').catch(() => undefined)
    await ctx.reply(`❌ Ручне надання доступу відхилено.\nuserId: ${userId}`)
  })
}
