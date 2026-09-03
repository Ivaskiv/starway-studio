import { beforeEach, describe, expect, it, vi } from 'vitest'

const scheduledCalls: Array<{
  event: string
  userId: string
  runAt: Date
  payload: Record<string, unknown>
}> = []
const claimedJobs: Array<{ id: string; payload: Record<string, unknown>; runAt: Date }> = []
const queuedKeys = new Set<string>()
const deliveredKeys = new Set<string>()

const mockNotificationJobFindFirst = vi.fn()
const mockNotificationFindFirst = vi.fn()
const mockNotificationJobUpdateMany = vi.fn()
const mockClaimDuePending = vi.fn()
const mockMarkDone = vi.fn()
const mockMarkFailed = vi.fn()
const mockProcessJob = vi.fn()
const mockSchedule = vi.fn(async (event: string, userId: string, runAt: Date, payload: Record<string, unknown>) => {
  scheduledCalls.push({ event, userId, runAt, payload })
  const key = `${userId}:${String(payload.flow_timer_id)}:${String(payload.sessionId)}`
  queuedKeys.add(key)
  return { id: `job-${scheduledCalls.length}` }
})

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    notificationJob: {
      findFirst: (...args: unknown[]) => mockNotificationJobFindFirst(...args),
      updateMany: (...args: unknown[]) => mockNotificationJobUpdateMany(...args),
    },
    notification: {
      findFirst: (...args: unknown[]) => mockNotificationFindFirst(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/zoom/urls.ts', () => ({
  buildZoomCalendarUrl: vi.fn(({ intent, sessionId }: { intent?: string; sessionId?: string } = {}) => {
    const search = new URLSearchParams()
    if (intent) search.set('intent', intent)
    if (sessionId) search.set('sessionId', sessionId)
    const query = search.toString()
    return query
      ? `https://miniapp.example/miniapp/zoom-calendar?${query}`
      : 'https://miniapp.example/miniapp/zoom-calendar'
  }),
}))

vi.mock('../../../../../src/services/notifications/NotificationService.ts', () => ({
  notificationService: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
    processJob: (...args: unknown[]) => mockProcessJob(...args),
  },
}))

vi.mock('../../../../../src/services/notifications/services/NotificationJobService.ts', () => ({
  notificationJobService: {
    claimDuePending: (...args: unknown[]) => mockClaimDuePending(...args),
    markDone: (...args: unknown[]) => mockMarkDone(...args),
    markFailed: (...args: unknown[]) => mockMarkFailed(...args),
  },
}))

import {
  cancelExistingReminders,
  scheduleReminders,
} from '../../../../../src/modules/zoom/notifications/zoom.reminders.service.ts'
import { processDueNotificationJobs } from '../../../../../src/services/notifications/worker.ts'

function extractQueueKey(where: Record<string, unknown>) {
  const userId = String((where.payload as { equals?: string })?.equals ?? '')
  const conditions = Array.isArray(where.AND) ? where.AND as Array<Record<string, unknown>> : []
  const windowId = String(((conditions[0]?.payload as { equals?: string })?.equals) ?? '')
  const sessionId = String(((conditions[1]?.payload as { equals?: string })?.equals) ?? '')
  return `${userId}:${windowId}:${sessionId}`
}

function extractDeliveryKey(where: Record<string, unknown>) {
  const userId = String(where.userId ?? '')
  const windowId = String(where.templateKey ?? '')
  const sessionId = String((((where.OR as Array<Record<string, unknown>> | undefined)?.[0]?.data as { equals?: string })?.equals) ?? '')
  return `${userId}:${windowId}:${sessionId}`
}

describe('zoom.reminders.service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:00:00.000Z'))
    vi.clearAllMocks()
    scheduledCalls.length = 0
    claimedJobs.length = 0
    queuedKeys.clear()
    deliveredKeys.clear()

    mockNotificationJobFindFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (
      queuedKeys.has(extractQueueKey(where)) ? { id: 'existing-job' } : null
    ))
    mockNotificationFindFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (
      deliveredKeys.has(extractDeliveryKey(where)) ? { id: 'sent-notification' } : null
    ))
    mockNotificationJobUpdateMany.mockResolvedValue({ count: 1 })
    mockClaimDuePending.mockResolvedValue(claimedJobs)
    mockProcessJob.mockResolvedValue(undefined)
    mockMarkDone.mockResolvedValue(undefined)
    mockMarkFailed.mockResolvedValue(undefined)
  })

  it('schedules 2h and 5m reminders through the canonical notification queue', async () => {
    await scheduleReminders('user-1', {
      id: 'session-1',
      topic: 'Фокус',
      scheduledAt: new Date('2026-09-03T13:00:00.000Z'),
      requests: { zoomLink: 'https://zoom.example/live' },
    })

    expect(mockSchedule).toHaveBeenCalledTimes(2)
    expect(scheduledCalls).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        payload: expect.objectContaining({
          flow_timer_id: 'ZOOM_REMINDER_2H',
          sessionId: 'session-1',
          cta_url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking&sessionId=session-1',
          request_fingerprint: 'zoom-reminder:ZOOM_REMINDER_2H:session-1:user-1',
        }),
      }),
      expect.objectContaining({
        userId: 'user-1',
        payload: expect.objectContaining({
          flow_timer_id: 'ZOOM_REMINDER_5M',
          sessionId: 'session-1',
          cta_url: 'https://zoom.example/live',
          request_fingerprint: 'zoom-reminder:ZOOM_REMINDER_5M:session-1:user-1',
        }),
      }),
    ])
  })

  it('does not enqueue the same session recipient and window twice across queue state and sent state', async () => {
    queuedKeys.add('user-1:ZOOM_REMINDER_2H:session-1')
    deliveredKeys.add('user-1:ZOOM_REMINDER_5M:session-1')

    await scheduleReminders('user-1', {
      id: 'session-1',
      topic: 'Фокус',
      scheduledAt: new Date('2026-09-03T13:00:00.000Z'),
      requests: { zoomLink: 'https://zoom.example/live' },
    })

    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('marks only pending reminder jobs as cancelled during reschedule cleanup', async () => {
    await cancelExistingReminders('user-1', 'session-1')

    expect(mockNotificationJobUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: 'AI_REMINDER',
        status: 'PENDING',
      }),
      data: {
        status: 'FAILED',
        lastError: 'cancelled_by_zoom_reschedule',
      },
    })
  })

  it('keeps the notification worker path functional for canonical reminder jobs', async () => {
    claimedJobs.push({
      id: 'job-1',
      runAt: new Date('2026-09-03T11:00:00.000Z'),
      payload: {
        event: 'AB_TEST_FOLLOWUP',
        userId: 'user-1',
        payload: {
          flow_timer_id: 'ZOOM_REMINDER_5M',
          sessionId: 'session-1',
        },
      },
    })

    await processDueNotificationJobs(10)

    expect(mockProcessJob).toHaveBeenCalledTimes(1)
    expect(mockMarkDone).toHaveBeenCalledWith('job-1')
    expect(mockMarkFailed).not.toHaveBeenCalled()
  })
})
