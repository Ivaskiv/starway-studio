import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import type {
  JournalDayState,
  JournalEvent,
  JournalResponse,
  TaskBlockStatus,
  ZoomBlockStatus,
} from './types.js'

const DEFAULT_TIMEZONE = 'Europe/Kyiv'

let notificationColumnsAvailable: boolean | null = null

function getMonthRange(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('invalid_month_range')
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

  return { start, end }
}

function getDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error('invalid_date_range')
  }

  return { start, end }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function hasOwnRecordValue(record: Record<string, unknown> | null, key: string) {
  return Boolean(record && Object.prototype.hasOwnProperty.call(record, key) && record[key] != null)
}

function hasMeaningfulContent(record: Record<string, unknown> | null) {
  return Boolean(record && Object.keys(record).length > 0)
}

function isLegacyDailyContent(record: Record<string, unknown> | null) {
  if (!record) return false
  return (
    hasOwnRecordValue(record, 'state')
    || hasOwnRecordValue(record, 'choice')
    || hasOwnRecordValue(record, 'dayFact')
    || hasOwnRecordValue(record, 'drain')
    || hasOwnRecordValue(record, 'microSupport')
    || hasOwnRecordValue(record, 'answers')
    || hasOwnRecordValue(record, 'stateLog')
  )
}

function shouldCreateMorningEvent(content: Record<string, unknown> | null) {
  const morning = asRecord(content?.morning)
  return hasMeaningfulContent(morning) || isLegacyDailyContent(content)
}

function shouldCreateEveningEvent(content: Record<string, unknown> | null) {
  const evening = asRecord(content?.evening)
  return hasMeaningfulContent(evening) || content?.finalizedSession === 'evening'
}

function createEvent(input: JournalEvent): JournalEvent {
  return input
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getDateKey(date: Date | string, timezone: string) {
  const parts = getFormatter(timezone).formatToParts(typeof date === 'string' ? new Date(date) : date)
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function getNoonIso(dateKey: string) {
  return `${dateKey}T12:00:00.000Z`
}

function isBeforeDateKey(left: string, right: string) {
  return left < right
}

function isSameOrBeforeDateKey(left: string, right: string) {
  return left <= right
}

function buildDateKeys(start: Date, end: Date, timezone: string) {
  const keys: string[] = []

  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    keys.push(getDateKey(cursor, timezone))
  }

  return keys
}

function buildEmptyJournalResponse(start: Date, end: Date, timezone: string): JournalResponse {
  const todayKey = getDateKey(new Date(), timezone)
  const days = buildDateKeys(start, end, timezone).map((dateKey) => createEmptyDayState(dateKey, todayKey))

  return { events: [], days }
}

async function hasNotificationColumns(): Promise<boolean> {
  if (notificationColumnsAvailable !== null) return notificationColumnsAvailable

  let rows: Array<{ column_name: string }> = []
  try {
    rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Notification'`,
    )
  } catch (error) {
    console.warn('[journal] failed to inspect Notification columns; reminder events disabled', error)
    notificationColumnsAvailable = false
    return notificationColumnsAvailable
  }

  const columns = new Set(rows.map((row) => row.column_name))
  notificationColumnsAvailable =
    columns.has('type') &&
    columns.has('title') &&
    columns.has('body') &&
    columns.has('data')

  if (!notificationColumnsAvailable) {
    console.warn('[journal] Notification columns missing; reminder events disabled until repair is applied')
  }

  return notificationColumnsAvailable
}

async function getUserTimezone(userId: string): Promise<string> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { timezone: true },
  })

  return preference?.timezone || DEFAULT_TIMEZONE
}

function createEmptyDayState(dateKey: string, todayKey: string): JournalDayState {
  const isPastOrToday = isSameOrBeforeDateKey(dateKey, todayKey)

  return {
    date: getNoonIso(dateKey),
    dateKey,
    finalizedAt: null,
    hasEntry: false,
    events: [],
    reflection: {
      morning: {
        status: isPastOrToday ? 'pending' : 'unavailable',
        event: null,
      },
      evening: {
        status: isPastOrToday ? 'pending' : 'unavailable',
        event: null,
      },
    },
    finalizedSession: null,
    microTasks: {
      status: isPastOrToday ? 'awaiting' : 'empty',
      items: [],
      activeCount: 0,
      completedCount: 0,
      missedCount: 0,
    },
    zoomSessions: {
      status: 'empty',
      items: [],
    },
    systemSignals: [],
    summary: {
      xp: 0,
      completed: 0,
      pending: isPastOrToday ? 2 : 0,
      missed: 0,
    },
  }
}

function pushEventToDay(day: JournalDayState | undefined, event: JournalEvent) {
  if (!day) return
  day.events.push(event)
}

function updateTaskBlockStatus(day: JournalDayState) {
  const { activeCount, completedCount, missedCount } = day.microTasks

  let status: TaskBlockStatus = 'empty'
  if (activeCount > 0) status = 'active'
  else if (missedCount > 0 && completedCount === 0) status = 'missed'
  else if (completedCount > 0) status = 'done'
  else if (day.reflection.morning.status === 'done') status = 'awaiting'

  day.microTasks.status = status
}

function updateZoomBlockStatus(day: JournalDayState, todayKey: string) {
  const zoomItems = day.zoomSessions.items
  if (!zoomItems.length) {
    day.zoomSessions.status = 'empty'
    return
  }

  const hasScheduled = zoomItems.some((event) => event.meta?.attended !== true && event.meta?.attended !== false)
  const hasDone = zoomItems.some((event) => event.meta?.attended === true)
  const hasMissed = zoomItems.some((event) => event.meta?.attended === false || isBeforeDateKey(day.dateKey, todayKey))

  let status: ZoomBlockStatus = 'empty'
  if (hasScheduled) status = 'scheduled'
  else if (hasDone) status = 'done'
  else if (hasMissed) status = 'missed'

  day.zoomSessions.status = status
}

function updateSummary(day: JournalDayState, todayKey: string) {
  const morningDone = day.reflection.morning.status === 'done'
  const eveningDone = day.reflection.evening.status === 'done'
  const morningPending = day.reflection.morning.status === 'pending'
  const eveningPending = day.reflection.evening.status === 'pending'

  let pending = day.microTasks.activeCount
  let completed = day.microTasks.completedCount
  let missed = day.microTasks.missedCount

  if (morningDone) completed += 1
  else if (morningPending) pending += 1

  if (eveningDone) completed += 1
  else if (eveningPending && isSameOrBeforeDateKey(day.dateKey, todayKey)) pending += 1

  if (day.zoomSessions.status === 'scheduled') pending += day.zoomSessions.items.length
  if (day.zoomSessions.status === 'done') completed += day.zoomSessions.items.length
  if (day.zoomSessions.status === 'missed') missed += day.zoomSessions.items.length

  day.summary = {
    xp: day.events.reduce((sum, event) => {
      const xp = event.meta?.xp
      return sum + (typeof xp === 'number' ? xp : 0)
    }, 0),
    completed,
    pending,
    missed,
  }
}

function finalizeDayStates(days: JournalDayState[], todayKey: string) {
  for (const day of days) {
    if (day.reflection.morning.status !== 'done' && day.hasEntry) {
      day.reflection.morning.status = 'pending'
    }

    if (day.reflection.evening.status !== 'done') {
      day.reflection.evening.status = isSameOrBeforeDateKey(day.dateKey, todayKey) ? 'pending' : 'unavailable'
    }

    if (day.reflection.morning.status !== 'done' && day.microTasks.items.length === 0) {
      day.microTasks.status = isSameOrBeforeDateKey(day.dateKey, todayKey) ? 'awaiting' : 'empty'
    } else {
      updateTaskBlockStatus(day)
    }

    updateZoomBlockStatus(day, todayKey)
    updateSummary(day, todayKey)
  }
}

async function getJournalResponseForWindow(userId: string, start: Date, end: Date): Promise<JournalResponse> {
  try {
    const timezone = await getUserTimezone(userId)
    const todayKey = getDateKey(new Date(), timezone)
    const includeNotificationEvents = await hasNotificationColumns()
    const dayKeys = buildDateKeys(start, end, timezone)
    const dayKeySet = new Set(dayKeys)
    const expandedStart = addDays(start, -1)
    const expandedEnd = addDays(end, 1)

    const [
      aiMessages,
      dailyEntries,
      voiceEntries,
      zoomAttendances,
      microTasks,
      streaks,
      subscriptions,
      notifications,
    ] = await Promise.all([
      prisma.aIMentorMessage.findMany({
        where: {
          createdAt: { gte: expandedStart, lt: expandedEnd },
          session: { userId },
        },
        select: {
          id: true,
          createdAt: true,
          role: true,
          sessionId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dailyEntry.findMany({
        where: {
          userId,
          date: { gte: expandedStart, lt: expandedEnd },
        },
        select: {
          id: true,
      date: true,
      content: true,
      state: true,
      updatedAt: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.voiceEntry.findMany({
        where: {
          userId,
          createdAt: { gte: expandedStart, lt: expandedEnd },
        },
        select: {
          id: true,
          createdAt: true,
          text: true,
          state: true,
          intensity: true,
          type: true,
          source: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.zoomSessionAttendee.findMany({
        where: {
          userId,
          session: {
            scheduledAt: { gte: expandedStart, lt: expandedEnd },
          },
        },
        select: {
          id: true,
          attended: true,
          createdAt: true,
          session: {
            select: {
              id: true,
              topic: true,
              status: true,
              scheduledAt: true,
            },
          },
        },
        orderBy: { session: { scheduledAt: 'desc' } },
      }),
      prisma.microTask.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gte: expandedStart, lt: expandedEnd } },
            { completedAt: { gte: expandedStart, lt: expandedEnd } },
            { dueAt: { gte: expandedStart, lt: expandedEnd } },
            {
              updatedAt: { gte: expandedStart, lt: expandedEnd },
              status: { in: ['skipped', 'expired'] },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          sphere: true,
          status: true,
          isCompleted: true,
          xpReward: true,
          createdAt: true,
          updatedAt: true,
          dueAt: true,
          completedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.streak.findMany({
        where: {
          userId,
          lastAt: { gte: expandedStart, lt: expandedEnd },
        },
        select: {
          id: true,
          ruleKey: true,
          current: true,
          longest: true,
          lastAt: true,
        },
        orderBy: { lastAt: 'desc' },
      }),
      prisma.subscription.findMany({
        where: {
          userId,
          OR: [
            { startsAt: { gte: expandedStart, lt: expandedEnd } },
            { createdAt: { gte: expandedStart, lt: expandedEnd } },
            { trialEndsAt: { gte: expandedStart, lt: expandedEnd } },
            { currentPeriodEnd: { gte: expandedStart, lt: expandedEnd } },
          ],
        },
        select: {
          id: true,
          status: true,
          planCode: true,
          startsAt: true,
          createdAt: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      includeNotificationEvents
        ? prisma.notification.findMany({
            where: {
              userId,
              channel: { in: [NotificationChannel.TELEGRAM, NotificationChannel.IN_APP] },
              status: NotificationStatus.SENT,
              OR: [
                { sentAt: { gte: expandedStart, lt: expandedEnd } },
                { createdAt: { gte: expandedStart, lt: expandedEnd } },
              ],
            },
            select: {
              id: true,
              type: true,
              title: true,
              body: true,
              templateKey: true,
              sentAt: true,
              createdAt: true,
              data: true,
              channel: true,
            },
            orderBy: { createdAt: 'desc' },
          }).catch((error) => {
            console.warn('[journal] failed to load Notification events; continuing without reminders', error)
            notificationColumnsAvailable = false
            return []
          })
        : Promise.resolve([]),
    ])

    const days = dayKeys.map((dateKey) => createEmptyDayState(dateKey, todayKey))
    const dayMap = new Map(days.map((day) => [day.dateKey, day]))

    for (const entry of dailyEntries) {
      const dateKey = getDateKey(entry.date, timezone)
      const day = dayMap.get(dateKey)
      if (!day) continue

      day.hasEntry = true
      const content = asRecord(entry.content)
      if (content && typeof content.finalizedAt === 'string') {
        day.finalizedAt = content.finalizedAt
      }
      if (content && typeof content.finalizedSession === 'string') {
        day.finalizedSession = content.finalizedSession === 'evening' ? 'evening' : 'morning'
      }

      if (shouldCreateMorningEvent(content)) {
        const event = createEvent({
          id: `reflection:${entry.id}:morning`,
          type: 'REFLECTION',
          date: entry.date.toISOString(),
          title: 'Ранкова рефлексія',
          meta: {
            period: 'morning',
            state: entry.state,
            xp: 10,
          },
        })
        day.reflection.morning = { status: 'done', event }
        pushEventToDay(day, event)
      }

      if (shouldCreateEveningEvent(content)) {
        const event = createEvent({
          id: `reflection:${entry.id}:evening`,
          type: 'REFLECTION',
          date: entry.date.toISOString(),
          title: 'Вечірній підсумок',
          meta: {
            period: 'evening',
            state: entry.state,
            xp: 10,
          },
        })
        day.reflection.evening = { status: 'done', event }
        pushEventToDay(day, event)
      }
    }

    for (const message of aiMessages) {
    const event = createEvent({
      id: `ai:${message.id}`,
      type: 'AI',
      date: message.createdAt.toISOString(),
      title: message.role === 'USER' ? 'Повідомлення до ABsystemу' : 'Відповідь ABsystemа',
      meta: {
        role: message.role,
        sessionId: message.sessionId,
        xp: message.role === 'USER' ? 5 : 0,
      },
    })
    const day = dayMap.get(getDateKey(message.createdAt, timezone))
    pushEventToDay(day, event)
  }

    for (const voiceEntry of voiceEntries) {
    const event = createEvent({
      id: `voice:${voiceEntry.id}`,
      type: 'VOICE',
      date: voiceEntry.createdAt.toISOString(),
      title: 'Голосовий check-in',
      meta: {
        source: voiceEntry.source,
        state: voiceEntry.state,
        intensity: voiceEntry.intensity,
        type: voiceEntry.type,
        preview: voiceEntry.text.slice(0, 140),
      },
    })
    const day = dayMap.get(getDateKey(voiceEntry.createdAt, timezone))
    pushEventToDay(day, event)
  }

    for (const attendance of zoomAttendances) {
    const event = createEvent({
      id: `zoom:${attendance.id}`,
      type: 'ZOOM',
      date: attendance.session.scheduledAt.toISOString(),
      title: attendance.session.topic || 'Zoom-сесія',
      meta: {
        sessionId: attendance.session.id,
        status: attendance.session.status,
        attended: attendance.attended,
      },
    })
    const day = dayMap.get(getDateKey(attendance.session.scheduledAt, timezone))
    if (!day) continue
    day.zoomSessions.items.push(event)
    pushEventToDay(day, event)
  }

    for (const task of microTasks) {
    const completed = task.isCompleted || task.status === 'done'
    const skipped = task.status === 'skipped'
    const expired = task.status === 'expired'
    const eventDate = completed
      ? task.completedAt ?? task.updatedAt ?? task.createdAt
      : skipped
        ? task.updatedAt
        : expired
          ? task.updatedAt ?? task.dueAt ?? task.createdAt
          : task.dueAt ?? task.createdAt

    const event = createEvent({
      id: `task:${task.id}:${completed ? 'done' : skipped ? 'skipped' : expired ? 'expired' : 'due'}`,
      type: 'TASK',
      date: eventDate.toISOString(),
      title: completed
        ? `Виконано: ${task.title}`
        : skipped
          ? `Перенесено: ${task.title}`
          : expired
            ? `Прострочено: ${task.title}`
            : `Дедлайн: ${task.title}`,
      meta: {
        completed,
        skipped,
        expired,
        sphere: task.sphere,
        xp: completed ? (task.xpReward ?? 0) : 0,
        bitMind: completed ? 5 : 0,
        dueAt: task.dueAt?.toISOString() ?? null,
      },
    })

    const day = dayMap.get(getDateKey(eventDate, timezone))
    if (!day) continue

    day.microTasks.items.push(event)
    if (completed) day.microTasks.completedCount += 1
    else if (skipped || expired) day.microTasks.missedCount += 1
    else day.microTasks.activeCount += 1

    pushEventToDay(day, event)
  }

    for (const streak of streaks) {
    const event = createEvent({
      id: `streak:${streak.id}`,
      type: 'STREAK',
      date: streak.lastAt.toISOString(),
      title: `Streak: ${streak.current} дн.`,
      meta: {
        ruleKey: streak.ruleKey,
        current: streak.current,
        longest: streak.longest,
      },
    })
    const day = dayMap.get(getDateKey(streak.lastAt, timezone))
    pushEventToDay(day, event)
  }

    for (const subscription of subscriptions) {
    const events: JournalEvent[] = []
    const baseMeta = {
      status: subscription.status,
      planCode: subscription.planCode,
    }
    const activationDate = subscription.startsAt ?? subscription.createdAt

    if (activationDate >= expandedStart && activationDate < expandedEnd) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:start`,
        type: 'SUBSCRIPTION',
        date: activationDate.toISOString(),
        title: `Підписка: ${subscription.planCode}`,
        meta: baseMeta,
      }))
    }

    if (subscription.trialEndsAt && subscription.trialEndsAt >= expandedStart && subscription.trialEndsAt < expandedEnd) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:trial-end`,
        type: 'SUBSCRIPTION',
        date: subscription.trialEndsAt.toISOString(),
        title: 'Завершення тріалу',
        meta: baseMeta,
      }))
    }

    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd >= expandedStart && subscription.currentPeriodEnd < expandedEnd) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:period-end`,
        type: 'SUBSCRIPTION',
        date: subscription.currentPeriodEnd.toISOString(),
        title: 'Завершення періоду підписки',
        meta: baseMeta,
      }))
    }

    for (const event of events) {
      const day = dayMap.get(getDateKey(event.date, timezone))
      pushEventToDay(day, event)
    }
  }

    for (const notification of notifications) {
    const data = asRecord(notification.data)
    const reminderType = notification.type ?? NotificationType.AI_REMINDER
    const date = notification.sentAt ?? notification.createdAt

    const title = (() => {
      switch (reminderType) {
        case NotificationType.DAILY_MORNING:
          return 'Нагадування: ранкова рефлексія'
        case NotificationType.DAILY_EVENING:
          return 'Нагадування: вечірня рефлексія'
        case NotificationType.STREAK_ALERT:
          return 'Нагадування про streak'
        case NotificationType.LEVEL_UP:
          return 'Повідомлення про рівень'
        case NotificationType.WEEKLY_SUMMARY:
          return 'Тижневий підсумок'
        case NotificationType.SUBSCRIPTION:
          return 'Нагадування про підписку'
        case NotificationType.AI_REMINDER:
        default:
          return 'Нагадування від AI'
      }
    })()

    const event = createEvent({
      id: `tg:${notification.id}`,
      type: 'TG_REMINDER',
      date: date.toISOString(),
      title,
      meta: {
        notificationType: reminderType,
        templateKey: notification.templateKey,
        preview: notification.title || notification.body,
        context: data?.event ?? null,
        channel: notification.channel,
      },
    })

    const day = dayMap.get(getDateKey(date, timezone))
    if (!day) continue
    day.systemSignals.push(event)
    pushEventToDay(day, event)
  }

    finalizeDayStates(days, todayKey)

    const filteredDays = days.map((day) => ({
    ...day,
    events: day.events.sort((left, right) => left.date.localeCompare(right.date)),
    microTasks: {
      ...day.microTasks,
      items: day.microTasks.items.sort((left, right) => left.date.localeCompare(right.date)),
    },
    zoomSessions: {
      ...day.zoomSessions,
      items: day.zoomSessions.items.sort((left, right) => left.date.localeCompare(right.date)),
    },
    systemSignals: day.systemSignals.sort((left, right) => left.date.localeCompare(right.date)),
  }))

    const events = filteredDays
    .flatMap((day) => day.events)
    .filter((event) => dayKeySet.has(getDateKey(event.date, timezone)))
    .sort((left, right) => right.date.localeCompare(left.date))

    return { events, days: filteredDays }
  } catch (error) {
    console.warn('[journal] returning empty fallback response', error)
    const timezone = DEFAULT_TIMEZONE
    return buildEmptyJournalResponse(start, end, timezone)
  }
}

export async function getEventsByMonth(userId: string, year: number, month: number): Promise<JournalResponse> {
  const { start, end } = getMonthRange(year, month)
  return getJournalResponseForWindow(userId, start, end)
}

export async function getEventsForRange(userId: string, startDate: string, endDate: string): Promise<JournalResponse> {
  const { start, end } = getDateRange(startDate, endDate)
  return getJournalResponseForWindow(userId, start, end)
}
