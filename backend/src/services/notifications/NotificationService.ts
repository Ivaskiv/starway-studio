import {
  NotificationChannel,
  type Notification,
  NotificationStatus,
  NotificationType,
  type NotificationJob,
  type User,
} from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { NotificationEvent } from './NotificationEvent.js'
import { notificationDeliveryLayer } from './delivery/NotificationDeliveryLayer.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import { notificationRepository } from './repositories/NotificationRepository.js'
import { notificationJobService } from './services/NotificationJobService.js'
import { notificationRecordService } from './services/NotificationRecordService.js'
import { LEVELS } from '../../modules/gamification/level.system.js'

type EventPayload = Record<string, unknown>

type PersistedJobPayload = {
  event: NotificationEvent
  userId: string
  payload?: EventPayload
}

type WeeklySummaryPayload = {
  streak: number
  wheels: number
  sessions: number
}

const DAILY_LIMIT = 2
const STREAK_MILESTONE_REWARDS: Record<number, { neuroGems: number; bitMind?: number }> = {
  3: { neuroGems: 10 },
  7: { neuroGems: 30 },
  14: { neuroGems: 60 },
  30: { neuroGems: 100, bitMind: 1 },
  100: { neuroGems: 300, bitMind: 3 },
}
const CRITICAL_TEMPLATE_PREFIXES = ['level_up_', 'streak_broken']

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const DEFAULT_MINIAPP_URL = (process.env.MINIAPP_URL ?? `${DEFAULT_FRONTEND_URL}/miniapp`).replace(/\/$/, '')

function minutesToDate(minutesFromMidnight: number, baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0)
  return date
}

function nextMorningNine(baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return date
}

function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date = new Date()) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + 1)
  return next
}

function buildMiniAppStartUrl(startapp: string) {
  const url = new URL(DEFAULT_MINIAPP_URL)
  url.searchParams.set('startapp', startapp)
  return url.toString()
}

function eventToType(event: NotificationEvent): NotificationType {
  switch (event) {
    case NotificationEvent.DAILY_MORNING_DUE:
      return NotificationType.DAILY_MORNING
    case NotificationEvent.DAILY_EVENING_DUE:
      return NotificationType.DAILY_EVENING
    case NotificationEvent.STREAK_RISK:
    case NotificationEvent.STREAK_MILESTONE:
    case NotificationEvent.STREAK_BROKEN:
      return NotificationType.STREAK_ALERT
    case NotificationEvent.LEVEL_UP:
    case NotificationEvent.NEAR_LEVEL_UP:
      return NotificationType.LEVEL_UP
    case NotificationEvent.WEEKLY_SUMMARY:
      return NotificationType.WEEKLY_SUMMARY
    case NotificationEvent.AI_INACTIVE:
      return NotificationType.AI_REMINDER
    case NotificationEvent.SUBSCRIPTION_EXPIRING:
      return NotificationType.SUBSCRIPTION
  }
}

function toPersistedJobPayload(payload: unknown): PersistedJobPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('notification_job_payload_invalid')
  }

  const record = payload as Record<string, unknown>
  const event = record.event
  const userId = record.userId

  if (typeof event !== 'string' || typeof userId !== 'string') {
    throw new Error('notification_job_payload_invalid')
  }

  return {
    event: event as NotificationEvent,
    userId,
    payload: typeof record.payload === 'object' && record.payload !== null && !Array.isArray(record.payload)
      ? record.payload as EventPayload
      : undefined,
  }
}

function buildWeeklySummaryPayload(payload?: EventPayload): WeeklySummaryPayload {
  return {
    streak: Number(payload?.streak ?? 0),
    wheels: Number(payload?.wheels ?? 0),
    sessions: Number(payload?.sessions ?? 0),
  }
}

function isCriticalTemplateKey(templateKey: string) {
  return CRITICAL_TEMPLATE_PREFIXES.some(prefix => templateKey.startsWith(prefix))
}

async function loadEligibleUsers(): Promise<Array<Pick<User, 'id' | 'firstName' | 'email' | 'telegramChatId' | 'telegramUserId'> & { telegramLinks: Array<{ chatId: string | null }> }>> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { telegramChatId: { not: null } },
        { telegramUserId: { not: null } },
        { telegramLinks: { some: { isActive: true, chatId: { not: null } } } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}

async function loadDeliveryUser(userId: string): Promise<DeliveryUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}

function templateKeyForEvent(event: NotificationEvent, payload?: EventPayload) {
  switch (event) {
    case NotificationEvent.LEVEL_UP:
      return `level_up_${Number(payload?.level ?? 0)}`
    case NotificationEvent.NEAR_LEVEL_UP:
      return `near_level_${String(payload?.nextLevel ?? 'unknown')}`
    case NotificationEvent.STREAK_MILESTONE:
      return `streak_${Number(payload?.current ?? 0)}`
    case NotificationEvent.STREAK_BROKEN:
      return 'streak_broken'
    case NotificationEvent.STREAK_RISK:
      return 'streak_risk'
    case NotificationEvent.WEEKLY_SUMMARY:
      return 'weekly_summary'
    default:
      return eventToType(event)
  }
}

export class NotificationService {
  private async sendDirectTelegramNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    templateKey: string
    ctaText?: string
    ctaUrl?: string
    data?: EventPayload
    duplicateWindowStart?: Date
    isEnabled: (preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>) => boolean
  }): Promise<boolean> {
    const user = await loadDeliveryUser(input.userId)
    if (!user) return false

    const preferences = await notificationPreferenceRepository.ensureForUser(input.userId)
    if (!preferences.telegramEnabled || !input.isEnabled(preferences)) {
      return false
    }

    const dayStart = startOfDay()
    const dayEnd = endOfDay()
    const duplicateWindowStart = input.duplicateWindowStart ?? dayStart

    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        channel: NotificationChannel.TELEGRAM,
        templateKey: input.templateKey,
        createdAt: { gte: duplicateWindowStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (duplicate) return false

    if (!isCriticalTemplateKey(input.templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: input.userId,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })

      if (todayCount >= DAILY_LIMIT) {
        return false
      }
    }

    const message: DeliveryMessage = {
      title: input.title,
      body: input.body,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
    }

    const sent = await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      templateKey: input.templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    return sent
  }

  async emit(event: NotificationEvent, userId: string, payload?: EventPayload): Promise<NotificationJob> {
    return this.enqueueJob(event, userId, new Date(), payload)
  }

  async schedule(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    return this.enqueueJob(event, userId, runAt, payload)
  }

  async createNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: EventPayload
    templateKey?: string
    channel: NotificationChannel
    status: NotificationStatus
    sentAt?: Date | null
  }): Promise<Notification> {
    return notificationRecordService.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      templateKey: input.templateKey,
      channel: input.channel,
      status: input.status,
    })
  }

  async enqueueJob(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    return notificationJobService.enqueue(eventToType(event), {
      event,
      userId,
      payload: payload ?? {},
    }, runAt)
  }

  async processJob(job: NotificationJob): Promise<void> {
    const persisted = toPersistedJobPayload(job.payload)
    const user = await loadDeliveryUser(persisted.userId)

    if (!user) {
      throw new Error('notification_user_not_found')
    }

    const type = eventToType(persisted.event)
    const templateKey = templateKeyForEvent(persisted.event, persisted.payload)
    const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
    const message = await this.buildMessage(persisted.event, user, persisted.payload)
    const dayStart = startOfDay()
    const dayEnd = endOfDay()

    const inAppDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.IN_APP,
        templateKey,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!inAppDuplicate) {
      await this.createNotification({
        userId: user.id,
        type,
        title: message.title,
        body: message.body,
        data: { event: persisted.event, ...(persisted.payload ?? {}) },
        templateKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      })
      await notificationDeliveryLayer.sendInApp(user, message)
    }

    if (!preferences.telegramEnabled) {
      return
    }

    if (!this.isEventEnabledByPreferences(persisted.event, preferences)) {
      return
    }

    const duplicateWindowStart = persisted.event === NotificationEvent.WEEKLY_SUMMARY
      ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      : dayStart

    const telegramDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.TELEGRAM,
        templateKey,
        createdAt: {
          gte: duplicateWindowStart,
          lt: dayEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (telegramDuplicate) {
      return
    }

    if (!isCriticalTemplateKey(templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })
      if (todayCount >= DAILY_LIMIT) {
        return
      }
    }

    const sent = await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: user.id,
      type,
      title: message.title,
      body: message.body,
      data: { event: persisted.event, ...(persisted.payload ?? {}) },
      templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    if (!sent) {
      throw new Error('notification_delivery_failed')
    }
  }

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
      templateKey: `microtasks_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('home'),
      data: { titles },
      isEnabled: preferences => preferences.aiRemindersEnabled,
    })
  }

  async sendTaskCompleted(userId: string, taskTitle: string, xpReward: number): Promise<void> {
    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '✅ Завдання виконано',
      body: `Ти закрив(ла) "${taskTitle}". +${xpReward} XP уже нараховано.`,
      templateKey: `task_completed_${taskTitle.slice(0, 48)}`,
      ctaText: '📊 Мій прогрес',
      ctaUrl: buildMiniAppStartUrl('tracker'),
      data: { taskTitle, xpReward },
      isEnabled: preferences => preferences.aiRemindersEnabled,
    })
  }

  async sendMicroTaskReminder(userId: string, taskTitle: string, dueSoon = false): Promise<void> {
    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: dueSoon ? '⏰ Дедлайн уже близько' : '📌 Повернись до задачі',
      body: dueSoon
        ? `Задача "${taskTitle}" добігає дедлайну. Краще закрити її зараз коротким ривком.`
        : `Задача "${taskTitle}" ще не почата. Один крок зараз збереже темп дня.`,
      templateKey: `${dueSoon ? 'microtask_due' : 'microtask_nudge'}_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🗂 Відкрити завдання',
      ctaUrl: buildMiniAppStartUrl('home'),
      data: { taskTitle, dueSoon },
      isEnabled: preferences => preferences.aiRemindersEnabled,
    })
  }

  async sendExpiredTaskNotice(userId: string, taskTitle: string): Promise<void> {
    await this.sendDirectTelegramNotification({
      userId,
      type: NotificationType.AI_REMINDER,
      title: '📦 Дедлайн задачі минув',
      body: `Задача "${taskTitle}" перейшла в прострочені. На вечірній рефлексії можна буде або закрити її, або перепланувати.`,
      templateKey: `microtask_expired_${taskTitle.slice(0, 40)}_${startOfDay().toISOString().slice(0, 10)}`,
      ctaText: '🌙 Вечірня рефлексія',
      ctaUrl: buildMiniAppStartUrl('ai_evening'),
      data: { taskTitle },
      isEnabled: preferences => preferences.aiRemindersEnabled,
    })
  }

  async scheduleStreakBroken(userId: string): Promise<NotificationJob> {
    return this.schedule(NotificationEvent.STREAK_BROKEN, userId, nextMorningNine())
  }

  private isEventEnabledByPreferences(
    event: NotificationEvent,
    preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>,
  ) {
    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
        return preferences.dailyMorningEnabled
      case NotificationEvent.DAILY_EVENING_DUE:
        return preferences.dailyEveningEnabled
      case NotificationEvent.LEVEL_UP:
      case NotificationEvent.NEAR_LEVEL_UP:
        return preferences.levelUpEnabled
      case NotificationEvent.AI_INACTIVE:
        return preferences.aiRemindersEnabled
      case NotificationEvent.STREAK_RISK:
        return preferences.streakRiskEnabled
      case NotificationEvent.STREAK_MILESTONE:
        return preferences.streakAlertsEnabled
      case NotificationEvent.STREAK_BROKEN:
        return preferences.streakBrokenEnabled
      case NotificationEvent.WEEKLY_SUMMARY:
        return preferences.weeklySummaryEnabled
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
        return preferences.subscriptionEnabled
      default:
        return true
    }
  }

  private async buildMessage(event: NotificationEvent, user: DeliveryUser, payload?: EventPayload): Promise<DeliveryMessage> {
    const firstName = user.firstName ?? 'Привіт'

    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
        return {
          title: '🌅 Ранкова рефлексія',
          body: `${firstName}, час зафіксувати стан і задати фокус на день.`,
          ctaText: '✦ Почати рефлексію',
          ctaUrl: buildMiniAppStartUrl('ai_morning'),
        }
      case NotificationEvent.DAILY_EVENING_DUE:
        return {
          title: '🌙 Вечірній підсумок',
          body: `${firstName}, одна коротка сесія зараз збере день в систему і підтримає ритм.`,
          ctaText: '✦ Підбити підсумок',
          ctaUrl: buildMiniAppStartUrl('ai_evening'),
        }
      case NotificationEvent.STREAK_RISK: {
        const current = Number(payload?.current ?? 0)
        return {
          title: '⚡ Стрік під загрозою',
          body: `${firstName}, стрік ${current} днів під загрозою. Зайди в Starway, щоб не втратити ритм.`,
          ctaText: '🔥 Зберегти стрік',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      }
      case NotificationEvent.STREAK_MILESTONE: {
        const current = Number(payload?.current ?? 0)
        const reward = STREAK_MILESTONE_REWARDS[current]
        const streakMessages: Record<number, string> = {
          3: 'Ти вже формуєш звичку. Перші три дні були найскладніші — ти їх пройшла.',
          7: 'Тиждень без зупинки. Звичка вже починає закріплюватися.',
          14: 'Два тижні системної роботи. Ти вже не стартуєш — ти продовжуєш.',
          30: 'Місяць безперервної роботи. Це вже архітектура звички, не випадковий ривок.',
          100: 'Сто днів. Це легендарна стабільність і реальний системний стиль.',
        }
        const rewardLine = reward
          ? ` Нагорода: +${reward.neuroGems} NEUROGEMS${reward.bitMind ? ` · +${reward.bitMind} BITMIND` : ''}.`
          : ''
        return {
          title: `🔥 Стрік ${current} днів`,
          body: `${firstName}, ${streakMessages[current] ?? 'Ти зафіксувала важливу серію днів.'}${rewardLine}`,
          ctaText: current >= 30 ? '🏅 Відкрити нагороду' : '📊 Мій прогрес',
          ctaUrl: buildMiniAppStartUrl(current >= 30 ? 'level_up' : 'tracker'),
        }
      }
      case NotificationEvent.STREAK_BROKEN:
        return {
          title: '💔 Стрік перервався',
          body: 'Серія перервалася, але ритм можна повернути. Почни з однієї короткої дії сьогодні.',
          ctaText: '💎 Відкрити трекер',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      case NotificationEvent.LEVEL_UP:
      {
        const nextLevel = LEVELS.find(level => level.level === Number(payload?.level ?? 1))
        const rewardMap: Record<string, number> = {
          Explorer: 20,
          Thinker: 30,
          Builder: 50,
          Strategist: 100,
          Visionary: 120,
          Architect: 160,
          Mentor: 200,
          Mastermind: 240,
          Oracle: 300,
        }
        return {
          title: '🌟 Новий рівень',
          body: nextLevel
            ? `${firstName} → ${nextLevel.title}. +${rewardMap[nextLevel.title] ?? 0} NEUROGEMS нараховано. Нові можливості вже відкриті.`
            : `Рівень ${Number(payload?.level ?? 1)} відкрито. Твій прогрес зафіксований, відкрий кабінет і подивись що вже відкрито.`,
          ctaText: '🌟 Відкрити нові можливості',
          ctaUrl: buildMiniAppStartUrl('level_up'),
        }
      }
      case NotificationEvent.NEAR_LEVEL_UP:
        return {
          title: '⚡ Майже новий рівень',
          body: `${firstName}, до рівня ${String(payload?.nextLevel ?? '')} залишилось лише ${Number(payload?.xpLeft ?? 0)} XP. Одна дія — і ти там.`,
          ctaText: '🎯 Відкрити практику',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      case NotificationEvent.WEEKLY_SUMMARY: {
        const summary = buildWeeklySummaryPayload(payload)
        return {
          title: '📚 Тижневий підсумок',
          body: `Стрік: ${summary.streak} · Колесо: ${summary.wheels} · Сесії: ${summary.sessions}. Відкрий лабораторію й рухайся далі по системі.`,
          ctaText: '📚 Відкрити лабораторію',
          ctaUrl: buildMiniAppStartUrl('library'),
        }
      }
      case NotificationEvent.AI_INACTIVE:
        return {
          title: '🤖 AI-нагадування',
          body: 'Ти давно не заходила в AI flow. Повернись на одну коротку сесію і віднови темп.',
          ctaText: '✦ Відкрити AI',
          ctaUrl: buildMiniAppStartUrl('ai'),
        }
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
      {
        const daysLeft = Number(payload?.daysLeft ?? 0)
        return {
          title: '💎 Підписка',
          body: daysLeft > 0
            ? `До завершення підписки залишилось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дні' : 'днів'}. Перевір доступ зараз, щоб не втратити прогрес, історію і AI-сесії.`
            : 'Перевір підписку зараз, щоб не втратити прогрес, історію і AI-сесії.',
          ctaText: '💎 Відкрити підписку',
          ctaUrl: buildMiniAppStartUrl('subscription'),
        }
      }
    }
  }
}

export const notificationService = new NotificationService()
