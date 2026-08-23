import { NotificationType, Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'

export async function cancelExistingReminders(
  userId: string,
  sessionId: string
): Promise<void> {
  await prisma.notificationJob.updateMany({
    where: {
      type: NotificationType.AI_REMINDER,
      status: 'PENDING',
      payload: { path: ['userId'], equals: userId },
      OR: [
        { payload: { path: ['payload', 'sessionId'], equals: sessionId } },
        { payload: { path: ['payload', 'session_id'], equals: sessionId } },
      ],
    },
    data: { status: 'FAILED', lastError: 'cancelled_by_zoom_reschedule' },
  })

  console.log(`[cancelReminders] userId=${userId} sessionId=${sessionId}`)
}

export async function scheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown }
): Promise<void> {
  const scheduledAt = new Date(session.scheduledAt)
  const remind2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
  const remind5m = new Date(scheduledAt.getTime() - 5 * 60 * 1000)
  const now = new Date()
  const req =
    !session.requests ||
    Array.isArray(session.requests) ||
    typeof session.requests !== 'object'
      ? {}
      : (session.requests as Record<string, unknown>)

  const jobs: Array<{
    flowTimerId: 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'
    runAt: Date
  }> = []
  if (remind2h > now)
    jobs.push({ flowTimerId: 'ZOOM_REMINDER_2H', runAt: remind2h })
  if (remind5m > now)
    jobs.push({ flowTimerId: 'ZOOM_REMINDER_5M', runAt: remind5m })

  if (jobs.length === 0) {
    console.log('[scheduleReminders] всі часи в минулому, jobs не створено')
    return
  }

  for (const job of jobs) {
    const exists = await prisma.notificationJob.findFirst({
      where: {
        type: NotificationType.AI_REMINDER,
        status: 'PENDING',
        payload: { path: ['userId'], equals: userId },
        AND: [
          {
            payload: {
              path: ['payload', 'flow_timer_id'],
              equals: job.flowTimerId,
            },
          },
          { payload: { path: ['payload', 'sessionId'], equals: session.id } },
        ],
      },
      select: { id: true },
    })
    if (exists) continue

    await prisma.notificationJob.create({
      data: {
        type: NotificationType.AI_REMINDER,
        runAt: job.runAt,
        status: 'PENDING',
        payload: {
          event: NotificationEvent.AB_TEST_FOLLOWUP,
          userId,
          payload: {
            flow_timer_id: job.flowTimerId,
            sessionId: session.id,
            topic: session.topic,
            scheduledAt: session.scheduledAt.toISOString(),
            zoomLink: typeof req.zoomLink === 'string' ? req.zoomLink : '',
          },
        } as Prisma.InputJsonValue,
      },
    })
  }

  console.log(
    `[scheduleReminders] userId=${userId} sessionId=${session.id} jobs=${jobs.length}`
  )
}

export async function getCoachReminderUserIds(
  expertId: string | null | undefined
): Promise<string[]> {
  if (!expertId) return []

  const coaches = await prisma.user.findMany({
    where: {
      expertId,
      deletedAt: null,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
    },
    select: { id: true },
  })

  return coaches.map((coach) => coach.id)
}

export async function rescheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown }
): Promise<void> {
  await cancelExistingReminders(userId, session.id)
  await scheduleReminders(userId, session)
}
