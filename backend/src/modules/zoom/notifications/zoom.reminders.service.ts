import { getCommerceCheckoutUrl, hasPaidIndividualParticipation, isLegacyIndividualSession } from '../commerce/zoom.commerce-request.service.js'
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

function resolveReminderMessageBody(
  windowId: ZoomReminderWindowId,
  session: ZoomReminderSession,
): string {
  const requests = asSessionRequests(session.requests)
  const zoomLink = String(requests.zoomLink ?? '').trim()
  const topic = session.topic?.trim() || 'Індивідуальна Zoom-сесія'

  if (windowId === 'ZOOM_REMINDER_2H') {
    return [
      '🔔 НАГАДУВАННЯ',
      '',
      'Твоя Zoom-сесія розпочнеться через 2 години.',
      '',
      '🟣 Індивідуальна сесія',
      `💬 ${topic}`,
      '',
      zoomLink
        ? 'Zoom-посилання вже доступне в деталях сесії.'
        : 'Zoom-посилання ще не додано. Відкрий деталі сесії.',
    ].join('\n')
  }

  return [
    '🔔 ZOOM ЧЕРЕЗ 5 ХВИЛИН',
    '',
    'Твоя Zoom-сесія починається зовсім скоро.',
    '',
    '🟣 Індивідуальна сесія',
    `💬 ${topic}`,
    '',
    zoomLink
      ? 'Переходь у Zoom за кнопкою нижче.'
      : 'Zoom-посилання ще не додано. Відкрий деталі сесії.',
  ].join('\n')
}

function resolveReminderCtaText(
  windowId: ZoomReminderWindowId,
  session: ZoomReminderSession,
): string {
  const zoomLink =
    String(asSessionRequests(session.requests).zoomLink ?? '').trim()

  if (zoomLink) {
    return 'ПРИЄДНАТИСЯ ДО ZOOM'
  }

  return 'ДЕТАЛІ СЕСІЇ'
}

function resolveCanonicalReminderCtaUrl(
  windowId: ZoomReminderWindowId,
  session: ZoomReminderSession,
): string {
  const zoomLink =
    String(asSessionRequests(session.requests).zoomLink ?? '').trim()

  if (zoomLink) {
    return zoomLink
  }

  return resolveReminderCtaUrl(windowId, session)
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
  paymentRequestId?: string,
): Promise<void> {
  const storedSession = await prisma.zoomSession.findUnique({ where: { id: session.id } })
  if (!storedSession || storedSession.status === 'CANCELLED') return
  const individual = isLegacyIndividualSession(storedSession)
  const paymentUrl = paymentRequestId ? await getCommerceCheckoutUrl(paymentRequestId, userId) : null
  if (paymentRequestId && !paymentUrl) return
  if (individual && !paymentRequestId && !await hasPaidIndividualParticipation(userId, session.id)) {
    const coaches = await getCoachReminderUserIds(storedSession.expertId)
    if (!coaches.includes(userId)) return
  }
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
      ...(paymentRequestId ? {
        individual_payment_request_id: paymentRequestId,
        message_body: 'Індивідуальна сесія наближається. ОЧІКУЄ ОПЛАТУ. Оплати сесію для підтвердження участі.',
        cta_text: 'ОПЛАТИТИ',
        payment_url: paymentUrl,
      } : {
        message_body: resolveReminderMessageBody(windowId, session),
        cta_text: resolveReminderCtaText(windowId, session),
      }),
      sessionId: session.id,
      topic: session.topic,
      scheduledAt: session.scheduledAt.toISOString(),
      cta_url: paymentRequestId
        ? resolveReminderCtaUrl(windowId, session)
        : resolveCanonicalReminderCtaUrl(windowId, session),
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
  paymentRequestId?: string,
): Promise<void> {
  if (paymentRequestId) {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`individual-payment-reminder:${session.id}:${userId}`})::bigint)`
      await enqueueReminderWindow(userId, session, windowId, new Date(), paymentRequestId)
    })
    return
  }
  await enqueueReminderWindow(userId, session, windowId, new Date())
}
