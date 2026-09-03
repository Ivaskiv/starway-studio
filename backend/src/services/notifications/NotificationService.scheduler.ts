import { NotificationChannel, type Prisma, type Notification, NotificationStatus, NotificationType, type NotificationJob, type User, } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { NotificationEvent } from './NotificationEvent.js'
import { buildNotificationData, getNotificationDuplicateWindowStart, isCriticalNotificationTemplate, resolveNotificationTemplateKey, resolveNotificationType, } from './domain/notificationPolicy.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import { buildTelegramDeepLink, generateDeepLink } from '../../modules/deeplinks/service.js'
import type { EventPayload, WeeklySummaryPayload } from './NotificationService.foundation.js'
import { TELEGRAM_SAFE_FRONTEND_URL, minutesToDate, nextMorningNine, startOfDay, buildMiniAppStartUrl, buildTelegramSafeWebDeepLink, buildMentorTelegramActions } from './NotificationService.foundation.js'
import { buildTelegramCard, loadEligibleUsers, loadDeliveryUser } from './NotificationService.telegram.js'
import { NotificationServiceQueue } from './NotificationService.queue.js'

export abstract class NotificationServiceScheduler extends NotificationServiceQueue {
  async scheduleDailyMorningDue(): Promise<void> {
    const users = await loadEligibleUsers()

    await Promise.all(users.map(async (user) => {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.dailyMorningEnabled) return
      await this.schedule(NotificationEvent.DAILY_MORNING_DUE, user.id, minutesToDate(preferences.dailyMorningTime))
    }))
  }

  async scheduleDailyEveningDue(): Promise<void> {
    const users = await loadEligibleUsers()

    await Promise.all(users.map(async (user) => {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.dailyEveningEnabled) return
      await this.schedule(NotificationEvent.DAILY_EVENING_DUE, user.id, minutesToDate(preferences.dailyEveningTime))
    }))
  }

  async scheduleWeeklySummaryDue(): Promise<void> {
    const users = await loadEligibleUsers()
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    for (const user of users) {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.weeklySummaryEnabled) continue

      const [streak, wheels, sessions] = await Promise.all([
        prisma.streak.findFirst({
          where: { userId: user.id, ruleKey: 'daily_checkin', endAt: null },
          orderBy: { updatedAt: 'desc' },
          select: { current: true },
        }),
        prisma.wheelAssessment.count({
          where: { userId: user.id, createdAt: { gte: weekStart } },
        }),
        prisma.dailyEntry.count({
          where: { userId: user.id, createdAt: { gte: weekStart } },
        }),
      ])

      await this.schedule(NotificationEvent.WEEKLY_SUMMARY, user.id, new Date(), {
        streak: streak?.current ?? 0,
        wheels,
        sessions,
      })
    }
  }

  async scheduleStreakRiskDue(): Promise<void> {
    const users = await loadEligibleUsers()
    const todayStart = startOfDay()

    for (const user of users) {
      const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
      if (!preferences.telegramEnabled || !preferences.streakRiskEnabled) continue

      const [streak, todayActivity] = await Promise.all([
        prisma.streak.findFirst({
          where: { userId: user.id, ruleKey: 'daily_checkin', endAt: null },
          orderBy: { updatedAt: 'desc' },
          select: { current: true },
        }),
        prisma.dailyEntry.findFirst({
          where: {
            userId: user.id,
            createdAt: { gte: todayStart },
          },
          select: { id: true },
        }),
      ])

      const current = streak?.current ?? 0
      if (current <= 0 || todayActivity) continue

      await this.schedule(NotificationEvent.STREAK_RISK, user.id, new Date(), { current })
    }
  }

  async sendDailyMorning(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.DAILY_MORNING_DUE, userId)
  }

  async sendDailyEvening(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.DAILY_EVENING_DUE, userId)
  }

  async sendStreakAlert(userId: string, currentStreak: number): Promise<NotificationJob> {
    return this.emit(NotificationEvent.STREAK_RISK, userId, { current: currentStreak })
  }

  async sendLevelUp(userId: string, level: number): Promise<NotificationJob> {
    return this.emit(NotificationEvent.LEVEL_UP, userId, { level })
  }

  async sendWeeklySummary(userId: string, summary: WeeklySummaryPayload): Promise<NotificationJob> {
    return this.emit(NotificationEvent.WEEKLY_SUMMARY, userId, summary)
  }

  async sendStreakBroken(userId: string): Promise<NotificationJob> {
    return this.emit(NotificationEvent.STREAK_BROKEN, userId)
  }

  async sendNewMicroTasks(userId: string, firstName: string, titles: string[]): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '✦ AI склав твої завдання на сьогодні',
      body: [
        `${firstName}, готово ${titles.length} мікрозавдання.`,
        '',
        ...titles.slice(0, 3).map(title => `• ${title}`),
        '',
        'Почни з першого — він найважливіший.',
      ].join('\n'),
      telegramHtml: buildTelegramCard({
        title: '✦ AI склав твої завдання на сьогодні',
        intro: `${firstName}, готово ${titles.length} мікрозавдання.`,
        facts: titles.slice(0, 3),
        note: 'Почни з першого — він зараз дасть найбільший рух.',
      }),
      templateKey: `microtasks_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('tasks'),
      data: { titles },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendTaskCompleted(userId: string, taskTitle: string, xpReward: number): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '✅ Завдання виконано',
      body: `Ти закрив(ла) "${taskTitle}". +${xpReward} XP 🔥 Наступний крок уже готовий.`,
      telegramHtml: buildTelegramCard({
        title: '✅ Завдання виконано',
        intro: 'Крок зафіксовано в системі.',
        facts: [
          taskTitle,
          `Нараховано: +${xpReward} XP`,
        ],
        note: 'Наступний крок: запланувати зустріч або закріпити рух у системі.',
      }),
      templateKey: `task_completed_${taskTitle.slice(0, 48)}`,
      ctaText: '📊 Мій прогрес',
      ctaUrl: buildMiniAppStartUrl('tracker'),
      data: { taskTitle, xpReward },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendMicroTaskReminder(userId: string, taskTitle: string, dueSoon = false): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: dueSoon ? '⏰ Дедлайн уже близько' : '📌 Повернись до задачі',
      body: dueSoon
        ? `Задача "${taskTitle}" добігає дедлайну. Краще закрити її зараз коротким ривком.`
        : `Задача "${taskTitle}" ще не почата. Один крок зараз збереже темп дня.`,
      telegramHtml: buildTelegramCard({
        title: dueSoon ? '⏰ Дедлайн уже близько' : '📌 Повернись до задачі',
        intro: dueSoon
          ? 'Час по цій задачі майже вичерпано.'
          : 'Ця задача ще не почата, але день можна втримати одним кроком.',
        facts: [taskTitle],
        note: dueSoon
          ? 'Краще закрити її зараз коротким ривком.'
          : 'Один крок зараз збереже темп дня.',
      }),
      templateKey: `${dueSoon ? 'microtask_due' : 'microtask_nudge'}_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('tasks'),
      data: { taskTitle, dueSoon },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async sendExpiredTaskNotice(userId: string, taskTitle: string): Promise<void> {
    if (await this.shouldSuppressMentorTaskNotification(userId)) {
      return
    }

    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '📦 Дедлайн задачі минув',
      body: `Задача "${taskTitle}" перейшла в прострочені. На вечірній рефлексії можна буде або закрити її, або перепланувати.`,
      telegramHtml: buildTelegramCard({
        title: '📦 Дедлайн задачі минув',
        intro: 'Одна із задач перейшла в прострочені.',
        facts: [taskTitle],
        note: 'На вечірній рефлексії її можна або закрити, або перепланувати без хаосу.',
      }),
      templateKey: `microtask_expired_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🌙 Вечірня рефлексія',
      ctaUrl: buildMiniAppStartUrl('ai_evening'),
      data: { taskTitle },
      isEnabled: preferences => preferences.aiRemindersEnabled,
      requiresMentorAccess: true,
    })
  }

  async scheduleStreakBroken(userId: string): Promise<NotificationJob> {
    return this.schedule(NotificationEvent.STREAK_BROKEN, userId, nextMorningNine())
  }

  async sendDiagnosticEvent(event: NotificationEvent, userId: string, payload?: EventPayload): Promise<boolean> {
    const user = await loadDeliveryUser(userId)
    if (!user) {
      throw new Error('notification_user_not_found')
    }

    const message = await this.buildMessage(event, user, payload)
    const templateKey = `test_${resolveNotificationTemplateKey(event, payload)}_${Date.now()}`

    const sent = await this.sendDirectTelegramNotification({
      userId,
      type: resolveNotificationType(event),
      title: `🧪 Тест · ${message.title}`,
      body: message.body,
      telegramHtml: message.telegramHtml,
      templateKey,
      ctaText: message.ctaText,
      ctaUrl: message.ctaUrl,
      ctaMode: message.ctaMode,
      ctaActions: message.ctaActions,
      data: {
        ...(payload ?? {}),
        diagnostic: true,
        sourceEvent: event,
      },
      isEnabled: () => true,
      force: true,
    })

    if (!sent) {
      throw new Error('notification_delivery_failed')
    }

    console.info('[notifications] diagnostic telegram sent', {
      event,
      userId,
      templateKey,
    })

    return sent
  }

  async sendLifecycleTelegramNotification(input: {
    event: NotificationEvent
    userId: string
    templateKey: string
    payload?: EventPayload
    duplicateWindowStart?: Date
  }): Promise<boolean> {
    const user = await loadDeliveryUser(input.userId)
    if (!user) return false

    const message = await this.buildMessage(input.event, user, input.payload)

    return this.sendDirectTelegramNotification({
      userId: input.userId,
      type: resolveNotificationType(input.event),
      title: message.title,
      body: message.body,
      telegramHtml: message.telegramHtml,
      templateKey: input.templateKey,
      ctaText: message.ctaText,
      ctaUrl: message.ctaUrl,
      ctaMode: message.ctaMode,
      ctaActions: message.ctaActions,
      data: {
        ...(input.payload ?? {}),
        sourceEvent: input.event,
      },
      duplicateWindowStart: input.duplicateWindowStart,
      isEnabled: (preferences) => this.isEventEnabledByPreferences(input.event, preferences),
    })
  }

  async sendZoomBookingOpenedNotification(input: {
    userId: string
    sessionId: string
    topic: string
    scheduledAt: Date
    ctaUrl: string
  }): Promise<boolean> {
    const scheduledLabel = input.scheduledAt.toLocaleString('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
    const topic = input.topic.trim() || 'Zoom-практика'

    return this.sendDirectTelegramNotification({
      userId: input.userId,
      type: NotificationType.AI_REMINDER,
      title: 'Відкрито запис на Zoom',
      body: [
        'Запис на найближчу Zoom-практику вже відкрито.',
        '',
        `${scheduledLabel}`,
        topic,
        '',
        'Забронюй місце та підготуй питання до практики.',
      ].join('\n'),
      telegramHtml: buildTelegramCard({
        title: 'Відкрито запис на Zoom',
        intro: 'Запис на найближчу Zoom-практику вже відкрито.',
        facts: [scheduledLabel, topic],
        note: 'Забронюй місце та підготуй питання до практики.',
      }),
      templateKey: `zoom_booking_open_${input.sessionId}`,
      ctaText: 'ВІДКРИТИ ZOOM',
      ctaUrl: input.ctaUrl,
      data: {
        sessionId: input.sessionId,
        scheduledAt: input.scheduledAt.toISOString(),
        topic,
      },
      duplicateWindowStart: new Date(0),
      isEnabled: () => true,
    })
  }

  async sendSessionHandoffNotification(input: {
    userId: string
    session: 'morning' | 'evening'
    step?: number
    answers?: Record<string, string>
    date?: string
  }): Promise<boolean> {
    const startOfToday = startOfDay()
    const dateKey = startOfToday.toISOString().slice(0, 10)
    const sessionPath = '/dashboard?from=tg&step=cycle'
    const miniAppUrl = buildMiniAppStartUrl(input.session === 'morning' ? 'ai_morning' : 'ai_evening')

    let telegramUrl = ''
    let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
    try {
      const deepLink = await generateDeepLink({
        userId: input.userId,
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        path: sessionPath,
        payload: {
          session: input.session,
          step: Math.max(0, Number(input.step ?? 0)),
          answers: input.answers ?? {},
          date: input.date ?? new Date().toISOString(),
        },
      })
      telegramUrl = buildTelegramDeepLink(deepLink.token)
    } catch (error) {
      console.warn('[notifications] failed to generate telegram resume deeplink, falling back to mini app', {
        userId: input.userId,
        session: input.session,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }

    try {
      const webLink = await generateDeepLink({
        userId: input.userId,
        action: 'continue_flow',
        source: 'telegram',
        target: 'web',
        path: sessionPath,
        payload: {
          session: input.session,
          step: Math.max(0, Number(input.step ?? 0)),
          answers: input.answers ?? {},
          date: input.date ?? new Date().toISOString(),
        },
      })
      webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
    } catch (error) {
      console.warn('[notifications] failed to generate web session handoff deeplink, falling back to dashboard path', {
        userId: input.userId,
        session: input.session,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }

    return this.sendDirectTelegramNotification({
      userId: input.userId,
      type: input.session === 'morning' ? NotificationType.DAILY_MORNING : NotificationType.DAILY_EVENING,
      title: input.session === 'morning' ? '🌅 Твій фокус' : '🌙 Що було найцінніше сьогодні?',
      body: input.session === 'morning'
        ? 'Один короткий крок уже визначений. Обери, де зручно продовжити: у mini app, на сайті або прямо тут у Telegram.'
        : 'Закрий день одним коротким підсумком. Обери, де зручно завершити цикл: у mini app, на сайті або прямо тут у Telegram.',
      templateKey: `session_handoff_${input.session}_${dateKey}`,
      ctaActions: buildMentorTelegramActions({
        miniAppUrl,
        webUrl,
        telegramCallback: input.session === 'morning' ? 'resume_morning_session' : 'resume_evening_session',
      }),
      data: {
        session: input.session,
        step: input.step ?? 0,
        answersCount: Object.keys(input.answers ?? {}).length,
        date: input.date ?? new Date().toISOString(),
      },
      duplicateWindowStart: startOfToday,
      isEnabled: preferences => input.session === 'morning'
        ? preferences.dailyMorningEnabled
        : preferences.dailyEveningEnabled,
    })
  }
}
