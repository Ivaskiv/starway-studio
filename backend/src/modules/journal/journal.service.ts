import { prisma } from '../../db/client.js'
import type { JournalEvent } from './types.js'

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

function createEvent(input: JournalEvent): JournalEvent {
  return input
}

async function getEventsForWindow(userId: string, start: Date, end: Date): Promise<JournalEvent[]> {
  const [
    aiMessages,
    dailyEntries,
    zoomAttendances,
    microTasks,
    streaks,
    subscriptions,
  ] = await Promise.all([
    prisma.aIMentorMessage.findMany({
      where: {
        createdAt: { gte: start, lt: end },
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
        date: { gte: start, lt: end },
      },
      select: {
        id: true,
        date: true,
        content: true,
        state: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.zoomSessionAttendee.findMany({
      where: {
        userId,
        session: {
          scheduledAt: { gte: start, lt: end },
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
          { createdAt: { gte: start, lt: end } },
          { completedAt: { gte: start, lt: end } },
        ],
      },
      select: {
        id: true,
        title: true,
        sphere: true,
        isCompleted: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.streak.findMany({
      where: {
        userId,
        lastAt: { gte: start, lt: end },
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
          { startsAt: { gte: start, lt: end } },
          { createdAt: { gte: start, lt: end } },
          { trialEndsAt: { gte: start, lt: end } },
          { currentPeriodEnd: { gte: start, lt: end } },
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
  ])

  const aiEvents = aiMessages.map(message =>
    createEvent({
      id: `ai:${message.id}`,
      type: 'AI',
      date: message.createdAt.toISOString(),
      title: message.role === 'USER' ? 'Повідомлення до AI ментору' : 'Відповідь AI ментора',
      meta: {
        role: message.role,
        sessionId: message.sessionId,
        xp: message.role === 'USER' ? 5 : 0,
      },
    }),
  )

  const reflectionEvents = dailyEntries.flatMap(entry => {
    const content = asRecord(entry.content)
    if (!content) return []

    const events: JournalEvent[] = []
    if (content.morning) {
      events.push(createEvent({
        id: `reflection:${entry.id}:morning`,
        type: 'REFLECTION',
        date: entry.date.toISOString(),
        title: 'Ранкова рефлексія',
        meta: {
          period: 'morning',
          state: entry.state,
          xp: 10,
        },
      }))
    }

    if (content.evening) {
      events.push(createEvent({
        id: `reflection:${entry.id}:evening`,
        type: 'REFLECTION',
        date: entry.date.toISOString(),
        title: 'Вечірній підсумок',
        meta: {
          period: 'evening',
          state: entry.state,
          xp: 10,
        },
      }))
    }

    return events
  })

  const zoomEvents = zoomAttendances.map(attendance =>
    createEvent({
      id: `zoom:${attendance.id}`,
      type: 'ZOOM',
      date: attendance.session.scheduledAt.toISOString(),
      title: attendance.session.topic || 'Zoom-сесія',
      meta: {
        sessionId: attendance.session.id,
        status: attendance.session.status,
        attended: attendance.attended,
      },
    }),
  )

  const taskEvents = microTasks.map(task =>
    createEvent({
      id: `task:${task.id}`,
      type: 'TASK',
      date: (task.completedAt ?? task.createdAt).toISOString(),
      title: task.isCompleted ? `Завершено: ${task.title}` : task.title,
      meta: {
        completed: task.isCompleted,
        sphere: task.sphere,
        bitMind: task.isCompleted ? 5 : 0,
      },
    }),
  )

  const streakEvents = streaks.map(streak =>
    createEvent({
      id: `streak:${streak.id}`,
      type: 'STREAK',
      date: streak.lastAt.toISOString(),
      title: `Streak: ${streak.current} дн.`,
      meta: {
        ruleKey: streak.ruleKey,
        current: streak.current,
        longest: streak.longest,
      },
    }),
  )

  const subscriptionEvents = subscriptions.flatMap(subscription => {
    const events: JournalEvent[] = []
    const baseMeta = {
      status: subscription.status,
      planCode: subscription.planCode,
    }

    const activationDate = subscription.startsAt ?? subscription.createdAt
    if (activationDate >= start && activationDate < end) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:start`,
        type: 'SUBSCRIPTION',
        date: activationDate.toISOString(),
        title: `Підписка: ${subscription.planCode}`,
        meta: baseMeta,
      }))
    }

    if (subscription.trialEndsAt && subscription.trialEndsAt >= start && subscription.trialEndsAt < end) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:trial-end`,
        type: 'SUBSCRIPTION',
        date: subscription.trialEndsAt.toISOString(),
        title: 'Завершення тріалу',
        meta: baseMeta,
      }))
    }

    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd >= start && subscription.currentPeriodEnd < end) {
      events.push(createEvent({
        id: `subscription:${subscription.id}:period-end`,
        type: 'SUBSCRIPTION',
        date: subscription.currentPeriodEnd.toISOString(),
        title: 'Завершення періоду підписки',
        meta: baseMeta,
      }))
    }

    return events
  })

  return [
    ...aiEvents,
    ...reflectionEvents,
    ...zoomEvents,
    ...taskEvents,
    ...streakEvents,
    ...subscriptionEvents,
  ].sort((a, b) => b.date.localeCompare(a.date))
}

export async function getEventsByMonth(userId: string, year: number, month: number): Promise<JournalEvent[]> {
  const { start, end } = getMonthRange(year, month)
  return getEventsForWindow(userId, start, end)
}

export async function getEventsForRange(userId: string, startDate: string, endDate: string): Promise<JournalEvent[]> {
  const { start, end } = getDateRange(startDate, endDate)
  return getEventsForWindow(userId, start, end)
}
