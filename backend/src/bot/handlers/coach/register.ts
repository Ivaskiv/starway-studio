import type { Telegraf } from 'telegraf'

import {
  AI_OPERATOR_ACTIONS,
  isCoachDialogueAwaiting,
  isCoachPostEditingActive,
  runCoachOperatorAction,
  runCoachStartDay,
  submitCoachDialogues,
  submitCoachEditedPost,
} from '../../../modules/ai-operator/operator.service.js'
import {
  notifyUserFocusPaymentIssueDenied,
  sendFocusPaymentSuccessTelegramMessageByOrder,
} from '../../../modules/subscriptions/payments/callback/notifications.js'
import { activateProductSubscription } from '../../../modules/subscriptions/payments/activation.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import {
  handleCoachAudioCommand,
  handleCoachNotifyCommand,
  handleCoachPaymentsCommand,
  PARTICIPANTS_UPCOMING_CALLBACK,
  handleCoachUsersCommand,
  validateCoachContentCatalog,
} from '../coach-content/index.js'

import { analyticsHandler } from './analytics.js'
import {
  hoursMenuHandler,
  nextWeekDoneHandler,
  nextWeekMenuHandler,
  nextWeekNoopHandler,
  scheduleMenuHandler,
  scheduleToggleHandler,
  toggleDayHandler,
  toggleHourHandler,
} from './schedule.js'
import {
  checkCoachAccess,
  isStarwayOpsChat,
  resolveCoachUserId,
} from './access.js'
import {
  getCommandPayload,
  withCoachRuntimeProtection,
} from './runtime.js'
import {
  MENU_AGENTS_PATTERN,
  MENU_ANALYTICS_PATTERN,
  MENU_CALENDAR_PATTERN,
  MENU_CONDUCT_PATTERN,
  MENU_LIBRARY_PATTERN,
  MENU_NOTIFICATIONS_PATTERN,
  MENU_PAYMENTS_PATTERN,
  MENU_SETTINGS_PATTERN,
  showCoachCalendarMenu,
  showCoachAgentsMenu,
  showCoachMenu,
  showCoachSettingsBack,
  showCoachSystemMenu,
} from './menu.js'
import {
  activateTrialZoomFromValidatedPayment,
  resolvePaymentAdminTarget,
} from './payments.js'
import {
  confirmCoachZoomSession,
  showCoachNewZoomPrompt,
} from './zoom.js'

export function registerCoachBotHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.use(async (ctx, next) => {
    if (!ctx.message || !('text' in ctx.message)) {
      return next()
    }
    if (!(await checkCoachAccess(ctx))) {
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

    if (!(await isCoachDialogueAwaiting(userId))) {
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

  telegramBot.start(
    withCoachRuntimeProtection('start', async (ctx) => {
      const isCoach = await checkCoachAccess(ctx)
      if (!isCoach) {
        await ctx.reply(coachBotContent.access.denied)
        return
      }
      await showCoachMenu(ctx)
    })
  )
  telegramBot.hears(
    /^\/schedule(?:@\w+)?(?:\s+(.*))?$/iu,
    withCoachRuntimeProtection('command:schedule', async (ctx) => {
      const isCoach = await checkCoachAccess(ctx)
      if (!isCoach) return

      const payload = getCommandPayload(ctx).toLowerCase()
      if (payload.startsWith('add')) {
        await nextWeekMenuHandler(ctx)
        return
      }

      await scheduleMenuHandler(ctx)
    })
  )
  telegramBot.hears(
    /^\/start-day(?:@\w+)?$/iu,
    withCoachRuntimeProtection('command:start-day', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return

      const userId = await resolveCoachUserId(ctx)
      if (!userId) {
        await ctx.reply('Не вдалося визначити профіль коуча.')
        return
      }

      const step = await runCoachStartDay(userId)
      await ctx.reply(step.text, {
        parse_mode: 'HTML',
        ...(step.buttons.length
          ? { reply_markup: { inline_keyboard: step.buttons } }
          : {}),
      })
    })
  )
  telegramBot.action(
    'coach:schedule',
    withCoachRuntimeProtection('action:coach:schedule', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return scheduleMenuHandler(ctx)
    })
  )
  telegramBot.action(
    /^coach:slot:/,
    withCoachRuntimeProtection('action:coach:slot', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return scheduleToggleHandler(ctx)
    })
  )
  telegramBot.action(
    'coach:next_week',
    withCoachRuntimeProtection('action:coach:next_week', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return nextWeekMenuHandler(ctx)
    })
  )
  telegramBot.action(
    /^coach:nw:day:/,
    withCoachRuntimeProtection('action:coach:nw:day', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return toggleDayHandler(ctx)
    })
  )
  telegramBot.action(
    'coach:nw:hours',
    withCoachRuntimeProtection('action:coach:nw:hours', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return hoursMenuHandler(ctx)
    })
  )
  telegramBot.action(
    /^coach:nw:hour:/,
    withCoachRuntimeProtection('action:coach:nw:hour', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return toggleHourHandler(ctx)
    })
  )
  telegramBot.action(
    'coach:nw:done',
    withCoachRuntimeProtection('action:coach:nw:done', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return nextWeekDoneHandler(ctx)
    })
  )
  telegramBot.action(
    /^coach:nw:(label):/,
    withCoachRuntimeProtection('action:coach:nw:label', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return nextWeekNoopHandler(ctx)
    })
  )
  telegramBot.action(
    'coach:settings:back',
    withCoachRuntimeProtection('action:coach:settings:back', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return showCoachSettingsBack(ctx)
    })
  )
  telegramBot.action(
    'coach:analytics',
    withCoachRuntimeProtection('action:coach:analytics', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return analyticsHandler(ctx)
    })
  )
  telegramBot.action(
    'coach:participants',
    withCoachRuntimeProtection('action:coach:participants', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return handleCoachUsersCommand(ctx, '')
    })
  )
  telegramBot.action(
    PARTICIPANTS_UPCOMING_CALLBACK,
    withCoachRuntimeProtection('action:coach:participants:upcoming', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      return handleCoachUsersCommand(ctx, 'upcoming')
    })
  )
  telegramBot.action(
    /^coach:notifications(?::.*)?$/,
    withCoachRuntimeProtection('action:coach:notifications', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
      const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      const payload = raw.replace(/^coach:notifications:?/, '').trim()
      return handleCoachNotifyCommand(ctx, payload)
    })
  )
  telegramBot.action(
    'content_os:start_planning',
    withCoachRuntimeProtection(
      'action:content_os:start_planning',
      async (ctx) => {
        if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()
        await ctx.answerCbQuery('Починаємо планування').catch(() => undefined)
        await ctx.reply(
          [
            '📍 Зараз: Аналіз тижня',
            '⬜ Далі: Бізнес-сигнали → Інсайти → Тема → Контент-план',
            '',
            'Ми аналізуємо минулий тиждень і плануємо новий?',
            'Або одразу плануємо — і ти розкажеш що було по ходу?',
          ].join('\n')
        )
      }
    )
  )


  telegramBot.action(
    /^aiop:/,
    withCoachRuntimeProtection('action:ai-operator', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return ctx.answerCbQuery()

      const userId = await resolveCoachUserId(ctx)
      if (!userId) {
        await ctx.answerCbQuery('Профіль не знайдено').catch(() => undefined)
        return
      }

      const raw =
        'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      const action =
        raw as (typeof AI_OPERATOR_ACTIONS)[keyof typeof AI_OPERATOR_ACTIONS]
      const step = await runCoachOperatorAction(userId, action)

      await ctx.answerCbQuery('Оновлено').catch(() => undefined)
      await ctx
        .editMessageText(step.text, {
          parse_mode: 'HTML',
          ...(step.buttons.length
            ? { reply_markup: { inline_keyboard: step.buttons } }
            : {}),
        })
        .catch(() => undefined)
    })
  )
  telegramBot.hears(
    MENU_LIBRARY_PATTERN,
    withCoachRuntimeProtection('menu:audio', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await handleCoachAudioCommand(ctx, '')
    })
  )
  telegramBot.hears(
    MENU_CONDUCT_PATTERN,
    withCoachRuntimeProtection('menu:newZoom', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await showCoachNewZoomPrompt(ctx)
    })
  )
  telegramBot.hears(
    coachBotContent.menu.members,
    withCoachRuntimeProtection('menu:members', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await handleCoachUsersCommand(ctx, '')
    })
  )
  telegramBot.hears(
    MENU_ANALYTICS_PATTERN,
    withCoachRuntimeProtection('menu:analytics', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await analyticsHandler(ctx)
    })
  )
  telegramBot.hears(
    MENU_AGENTS_PATTERN,
    withCoachRuntimeProtection('menu:agents', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await showCoachAgentsMenu(ctx)
    })
  )
  telegramBot.hears(
    MENU_CALENDAR_PATTERN,
    withCoachRuntimeProtection('menu:calendar', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await showCoachCalendarMenu(ctx)
    })
  )
  telegramBot.hears(
    MENU_NOTIFICATIONS_PATTERN,
    withCoachRuntimeProtection('menu:notifications', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await handleCoachNotifyCommand(ctx, '')
    })
  )
  telegramBot.hears(
    MENU_PAYMENTS_PATTERN,
    withCoachRuntimeProtection('menu:payments', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await handleCoachPaymentsCommand(ctx)
    })
  )
  telegramBot.hears(
    MENU_SETTINGS_PATTERN,
    withCoachRuntimeProtection('menu:system', async (ctx) => {
      if (!(await checkCoachAccess(ctx))) return
      await showCoachSystemMenu(ctx)
    })
  )
  telegramBot.action(
    /^admin:grant_focus:/,
    withCoachRuntimeProtection('action:admin:grant_focus', async (ctx) => {
      const hasAccess = await checkCoachAccess(ctx)
      if (!hasAccess && !isStarwayOpsChat(ctx)) {
        return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
      }
      const raw =
        'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      const checkoutTarget = await resolvePaymentAdminTarget(raw)
      if (!checkoutTarget?.userId || !checkoutTarget.orderReference) {
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.invalidToken)
          .catch(() => undefined)
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
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.accessGranted)
          .catch(() => undefined)
        const alreadyActive = result.message === 'already_active'

        if (!alreadyActive) {
          await sendFocusPaymentSuccessTelegramMessageByOrder({
            userId,
            orderReference: checkoutTarget.orderReference,
          }).catch((error: unknown) => {
            console.error(
              '[coach-start:admin:grant_focus] success sender failed',
              {
                userId,
                orderReference: checkoutTarget.orderReference,
                error: error instanceof Error ? error.message : String(error),
              }
            )
          })
        }

        await ctx.reply(
          alreadyActive
            ? `Доступ до ФОКУСУ вже був активний.\nuserId: ${userId}`
            : `${coachBotContent.paymentAdmin.manualAccessGranted}\nuserId: ${userId}`
        )
        return
      }
      await ctx
        .answerCbQuery(coachBotContent.paymentAdmin.error)
        .catch(() => undefined)
      await ctx.reply(
        `${coachBotContent.paymentAdmin.manualAccessFailed}\nПричина: ${result.message}\nuserId: ${userId}`
      )
    })
  )
  telegramBot.action(
    /^admin:grant_trial_zoom:/,
    withCoachRuntimeProtection('action:admin:grant_trial_zoom', async (ctx) => {
      const hasAccess = await checkCoachAccess(ctx)
      if (!hasAccess && !isStarwayOpsChat(ctx)) {
        return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
      }
      const raw =
        'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      const checkoutTarget = await resolvePaymentAdminTarget(
        raw.replace('admin:grant_trial_zoom:', 'admin:grant_focus:')
      )
      if (!checkoutTarget?.userId || !checkoutTarget.orderReference) {
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.invalidToken)
          .catch(() => undefined)
        return
      }

      const result = await activateTrialZoomFromValidatedPayment({
        userId: checkoutTarget.userId,
        orderReference: checkoutTarget.orderReference,
        amount: checkoutTarget.amount,
        currency: checkoutTarget.currency,
      })

      if (result.success) {
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.trialAccessGranted)
          .catch(() => undefined)
        await ctx.reply(
          `${coachBotContent.paymentAdmin.manualTrialAccessGranted}\nuserId: ${checkoutTarget.userId}\norderReference: ${checkoutTarget.orderReference}`
        )
        return
      }

      if (result.message === 'PAYMENT_EVIDENCE_NOT_VALIDATED') {
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.askPaymentDetails)
          .catch(() => undefined)
        await ctx.reply(
          `Підтверджена оплата для пробного Zoom не знайдена.\nuserId: ${checkoutTarget.userId}\norderReference: ${checkoutTarget.orderReference}`
        )
        return
      }

      await ctx
        .answerCbQuery(coachBotContent.paymentAdmin.error)
        .catch(() => undefined)
      await ctx.reply(
        `${coachBotContent.paymentAdmin.manualTrialAccessFailed}\nПричина: ${result.message}\nuserId: ${checkoutTarget.userId}`
      )
    })
  )
  telegramBot.action(
    /^admin:deny_focus:/,
    withCoachRuntimeProtection('action:admin:deny_focus', async (ctx) => {
      const hasAccess = await checkCoachAccess(ctx)
      if (!hasAccess && !isStarwayOpsChat(ctx)) {
        return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
      }
      const raw =
        'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      const checkoutTarget = await resolvePaymentAdminTarget(raw)
      if (!checkoutTarget?.userId) {
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.invalidToken)
          .catch(() => undefined)
        return
      }
      const userId = checkoutTarget.userId
      await ctx
        .answerCbQuery(coachBotContent.paymentAdmin.denied)
        .catch(() => undefined)
      await notifyUserFocusPaymentIssueDenied(userId).catch(() => undefined)
      await ctx.reply(
        `${coachBotContent.paymentAdmin.manualAccessDenied}\nuserId: ${userId}`
      )
    })
  )
  telegramBot.action(
  /^coach:zoom:confirm:(.+)$/,
  withCoachRuntimeProtection('action:coach:zoom:confirm', async (ctx) => {
    if (!await checkCoachAccess(ctx)) {
      return ctx.answerCbQuery()
    }

    const raw =
      'data' in ctx.callbackQuery
        ? String(ctx.callbackQuery.data ?? '')
        : ''

    const sessionId = raw.replace('coach:zoom:confirm:', '').trim()

    if (!sessionId) {
      return ctx.answerCbQuery('Сесію не знайдено')
    }

    await confirmCoachZoomSession(ctx, sessionId)
  })
)
  telegramBot.action(
    /^admin:ask_payment_details:/,
    withCoachRuntimeProtection(
      'action:admin:ask_payment_details',
      async (ctx) => {
        const hasAccess = await checkCoachAccess(ctx)
        if (!hasAccess && !isStarwayOpsChat(ctx)) {
          return ctx.answerCbQuery('Немає доступу').catch(() => undefined)
        }
        const raw =
          'data' in ctx.callbackQuery
            ? String(ctx.callbackQuery.data ?? '')
            : ''
        const checkoutTarget = await resolvePaymentAdminTarget(
          raw.replace('admin:ask_payment_details:', 'admin:grant_focus:')
        )
        if (!checkoutTarget?.userId) {
          await ctx
            .answerCbQuery(coachBotContent.paymentAdmin.invalidToken)
            .catch(() => undefined)
          return
        }
        await ctx
          .answerCbQuery(coachBotContent.paymentAdmin.askPaymentDetails)
          .catch(() => undefined)
        await ctx.reply(
          `Запитай у користувача чек або деталі транзакції.\nuserId: ${checkoutTarget.userId}\norderReference: ${checkoutTarget.orderReference ?? 'unknown'}`
        )
      }
    )
  )
}
