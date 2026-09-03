import { NotificationType } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { buildZoomCalendarUrl } from '../urls.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'

type ZoomReminderWindowId = 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'
type ZoomReminderSession = {
  id: string
  scheduledAt: Date
  topic: string
  requests: unknown
}

function asSessionRequests(requests: unknown): Record<string, unknown> {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') {
    return {}
  }

  return requests as Record<string, unknown>
}

function resolveReminderCtaUrl(windowId: ZoomReminderWindowId, session: ZoomReminderSession): string {
  const calendarUrl = buildZoomCalendarUrl({
    intent: 'booking',
    sessionId: session.id,
  })
  const zoomLink = String(asSessionRequests(session.requests).zoomLink ?? '').trim()

  if (windowId === 'ZOOM_REMINDER_5M' && zoomLink) {
    return zoomLink
  }

  return calendarUrl
}

async function hasActiveReminderJob(userId: string, sessionId: string, windowId: ZoomReminderWindowId): Promise<boolean> {
  const existingJob = await prisma.notificationJob.findFirst({
    where: {
      type: NotificationType.AI_REMINDER,
      status: { in: ['PENDING', 'PROCESSING', 'DONE'] },
      payload: { path: ['userId'], equals: userId },
      AND: [
        {
          payload: {
            path: ['payload', 'flow_timer_id'],
            equals: windowId,
          },
        },
        { payload: { path: ['payload', 'sessionId'], equals: sessionId } },
      ],
    },
    select: { id: true },
  })

  return Boolean(existingJob)
}

async function wasReminderDelivered(userId: string, sessionId: string, windowId: ZoomReminderWindowId): Promise<boolean> {
  const delivery = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: windowId,
      status: 'SENT',
      OR: [
        { data: { path: ['sessionId'], equals: sessionId } },
        { data: { path: ['session_id'], equals: sessionId } },
      ],
    },
    select: { id: true },
  })

  return Boolean(delivery)
}

async function enqueueReminderWindow(
  userId: string,
  session: ZoomReminderSession,
  windowId: ZoomReminderWindowId,
  runAt: Date,
): Promise<void> {
  if (await hasActiveReminderJob(userId, session.id, windowId)) {
    return
  }

  if (await wasReminderDelivered(userId, session.id, windowId)) {
    return
  }

  await notificationService.schedule(
    NotificationEvent.AB_TEST_FOLLOWUP,
    userId,
    runAt,
    {
      flow_timer_id: windowId,
      sessionId: session.id,
      topic: session.topic,
      scheduledAt: session.scheduledAt.toISOString(),
      cta_url: resolveReminderCtaUrl(windowId, session),
      request_fingerprint: `zoom-reminder:${windowId}:${session.id}:${userId}`,
    },
  )
}

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
  session: ZoomReminderSession
): Promise<void> {
  const scheduledAt = new Date(session.scheduledAt)
  const remind2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
  const remind5m = new Date(scheduledAt.getTime() - 5 * 60 * 1000)
  const now = new Date()
  const jobs: Array<{
    flowTimerId: ZoomReminderWindowId
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
    await enqueueReminderWindow(userId, session, job.flowTimerId, job.runAt)
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
  session: ZoomReminderSession
): Promise<void> {
  await cancelExistingReminders(userId, session.id)
  await scheduleReminders(userId, session)
}

export async function enqueueDueReminderWindow(
  userId: string,
  session: ZoomReminderSession,
  windowId: ZoomReminderWindowId,
): Promise<void> {
  await enqueueReminderWindow(userId, session, windowId, new Date())
}
