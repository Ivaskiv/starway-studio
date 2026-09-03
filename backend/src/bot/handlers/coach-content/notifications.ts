import { NotificationStatus, type NotificationJobStatus, ZoomStatus } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { showCoachMenu } from '../coach/menu.js'
import {
  buildExpertScopeWhere,
  coachPanelContent,
  formatKyivDateTime,
  replyOrEditPanelMessage,
  resolveCoachAccess,
  splitPayload,
} from './shared.js'

type ReminderWindowId = 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'

const REMINDER_WINDOWS: ReadonlyArray<{ id: ReminderWindowId; label: string }> = [
  { id: 'ZOOM_REMINDER_2H', label: '2 години' },
  { id: 'ZOOM_REMINDER_5M', label: '5 хвилин' },
]

function buildReminderKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(coachPanelContent.notify.actions.zoom, 'coach:notifications:zoom')],
    [Markup.button.callback(coachPanelContent.notify.actions.queue, 'coach:notifications:queue')],
    [Markup.button.callback(coachPanelContent.notify.actions.back, 'coach:notifications:back')],
  ])
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function parseNotificationJobSessionId(payload: unknown): string | null {
  const root = asObject(payload)
  const nested = asObject(root?.payload)
  const value = nested?.sessionId ?? nested?.session_id
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function parseNotificationJobTimerId(payload: unknown): ReminderWindowId | null {
  const root = asObject(payload)
  const nested = asObject(root?.payload)
  const value = nested?.flow_timer_id ?? nested?.flowTimerId
  return value === 'ZOOM_REMINDER_2H' || value === 'ZOOM_REMINDER_5M' ? value : null
}

function parseNotificationSessionId(data: unknown): string | null {
  const payload = asObject(data)
  const value = payload?.sessionId ?? payload?.session_id
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function mapReminderStatus(input: {
  jobStatuses: NotificationJobStatus[]
  deliveryStatuses: NotificationStatus[]
  lastErrors: string[]
}): string {
  if (input.deliveryStatuses.includes(NotificationStatus.SENT) || input.jobStatuses.includes('DONE')) {
    return 'надіслано'
  }

  if (input.jobStatuses.includes('PROCESSING')) {
    return 'очікується'
  }

  if (input.jobStatuses.includes('PENDING')) {
    return 'заплановано'
  }

  if (
    input.lastErrors.some((item) => item === 'cancelled_by_zoom_reschedule')
  ) {
    return 'скасовано'
  }

  if (
    input.deliveryStatuses.includes(NotificationStatus.FAILED) ||
    input.jobStatuses.includes('FAILED')
  ) {
    return 'помилка доставки'
  }

  return 'не заплановано'
}

async function loadUpcomingZoomSessions(coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>, limit = 5) {
  return prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      ...buildExpertScopeWhere(coach),
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
    select: {
      id: true,
      topic: true,
      scheduledAt: true,
    },
  })
}

async function loadReminderWindowStatuses(sessionId: string): Promise<Array<{ label: string; status: string; queued: number }>> {
  const [jobs, deliveries] = await Promise.all([
    prisma.notificationJob.findMany({
      where: {
        type: 'AI_REMINDER',
        OR: [
          { payload: { path: ['payload', 'sessionId'], equals: sessionId } },
          { payload: { path: ['payload', 'session_id'], equals: sessionId } },
        ],
      },
      select: {
        status: true,
        lastError: true,
        payload: true,
      },
    }).catch(() => []),
    prisma.notification.findMany({
      where: {
        type: 'AI_REMINDER',
        OR: [
          { data: { path: ['sessionId'], equals: sessionId } },
          { data: { path: ['session_id'], equals: sessionId } },
        ],
      },
      select: {
        templateKey: true,
        status: true,
        data: true,
      },
    }).catch(() => []),
  ])

  return REMINDER_WINDOWS.map((window) => {
    const windowJobs = jobs.filter((job) => parseNotificationJobSessionId(job.payload) === sessionId
      && parseNotificationJobTimerId(job.payload) === window.id)
    const windowDeliveries = deliveries.filter((item) => item.templateKey === window.id
      && parseNotificationSessionId(item.data) === sessionId)

    return {
      label: window.label,
      status: mapReminderStatus({
        jobStatuses: windowJobs.map((job) => job.status),
        deliveryStatuses: windowDeliveries.map((item) => item.status),
        lastErrors: windowJobs.map((job) => String(job.lastError ?? '').trim()).filter(Boolean),
      }),
      queued: windowJobs.filter((job) => job.status === 'PENDING' || job.status === 'PROCESSING').length,
    }
  })
}

function formatReminderScreen(input: {
  sessionLabel: string
  statuses: Array<{ label: string; status: string }>
}): string {
  return [
    coachPanelContent.notify.title,
    '',
    coachPanelContent.notify.upcomingZoom,
    input.sessionLabel,
    '',
    ...input.statuses.map((item) => `${item.label}: ${item.status}`),
  ].join('\n')
}

async function showReminderOverview(
  ctx: Context,
  coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>,
): Promise<void> {
  const [session] = await loadUpcomingZoomSessions(coach, 1)
  if (!session) {
    await replyOrEditPanelMessage(
      ctx,
      formatReminderScreen({
        sessionLabel: coachPanelContent.notify.notScheduled,
        statuses: REMINDER_WINDOWS.map((item) => ({ label: item.label, status: 'не заплановано' })),
      }),
      buildReminderKeyboard(),
    )
    return
  }

  const statuses = await loadReminderWindowStatuses(session.id)
  await replyOrEditPanelMessage(
    ctx,
    formatReminderScreen({
      sessionLabel: formatKyivDateTime(session.scheduledAt),
      statuses,
    }),
    buildReminderKeyboard(),
  )
}

async function showReminderQueue(
  ctx: Context,
  coach: NonNullable<Awaited<ReturnType<typeof resolveCoachAccess>>>,
): Promise<void> {
  const sessions = await loadUpcomingZoomSessions(coach, 5)
  if (sessions.length === 0) {
    await replyOrEditPanelMessage(
      ctx,
      [coachPanelContent.notify.queueTitle, '', coachPanelContent.notify.queueEmpty].join('\n'),
      buildReminderKeyboard(),
    )
    return
  }

  const sessionBlocks = await Promise.all(
    sessions.map(async (session) => {
      const statuses = await loadReminderWindowStatuses(session.id)
      const queued = statuses.reduce((sum, item) => sum + item.queued, 0)
      return {
        text: [
          `${formatKyivDateTime(session.scheduledAt)}${session.topic ? ` · ${session.topic}` : ''}`,
          ...statuses.map((item) => `${item.label}: ${item.status}`),
        ].join('\n'),
        queued,
      }
    }),
  )

  const queuedJobs = sessionBlocks.reduce((sum, item) => sum + item.queued, 0)
  await replyOrEditPanelMessage(
    ctx,
    [
      coachPanelContent.notify.queueTitle,
      '',
      `У черзі: ${queuedJobs}`,
      '',
      ...sessionBlocks.map((item) => item.text),
    ].join('\n\n'),
    buildReminderKeyboard(),
  )
}

export async function handleCoachNotifyCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  if (!coach) return false

  const [mode] = splitPayload(payload)
  if (mode === 'back') {
    await showCoachMenu(ctx)
    return true
  }

  if (mode === 'queue') {
    await showReminderQueue(ctx, coach)
    return true
  }

  await showReminderOverview(ctx, coach)
  return true
}
