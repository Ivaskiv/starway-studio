import { beforeEach, describe, expect, it, vi } from 'vitest'

const scheduledCalls: Array<{
  event: string
  userId: string
  runAt: Date
  payload: Record<string, unknown>
}> = []
const claimedJobs: Array<{ id: string; type: string; attempts: number; payload: Record<string, unknown>; runAt: Date }> = []
const queuedKeys = new Set<string>()
const deliveredKeys = new Set<string>()

const mockNotificationJobFindFirst = vi.fn()
const mockNotificationFindFirst = vi.fn()
const mockNotificationJobUpdateMany = vi.fn()
const mockZoomSessionFindUnique = vi.fn()
const mockClaimDuePending = vi.fn()
const mockMarkDone = vi.fn()
const mockMarkFailed = vi.fn()
const mockRescheduleRetry = vi.fn()
const mockProcessJob = vi.fn()
const mockExecuteClaimed = vi.fn()
const mockSchedule = vi.fn(async (event: string, userId: string, runAt: Date, payload: Record<string, unknown>) => {
  scheduledCalls.push({ event, userId, runAt, payload })
  const key = `${userId}:${String(payload.flow_timer_id)}:${String(payload.sessionId)}`
  queuedKeys.add(key)
  return { id: `job-${scheduledCalls.length}` }
})

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
    },
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

vi.mock('../../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts')>()
  return { ...actual, hasPaidIndividualParticipation: vi.fn(async () => true) }
})

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
    rescheduleRetry: (...args: unknown[]) => mockRescheduleRetry(...args),
  },
}))

vi.mock('../../../../../src/services/notifications/repositories/NotificationJobRepository.ts', () => ({
  notificationJobRepository: { executeClaimed: (...args: unknown[]) => mockExecuteClaimed(...args) },
}))

import {
  cancelExistingReminders,
  rescheduleGroupPracticeNotifications,
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
    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      status: 'SCHEDULED',
      type: 'GROUP',
      expertId: 'expert-1',
      requests: {},
    })
    mockClaimDuePending.mockResolvedValue(claimedJobs)
    mockProcessJob.mockResolvedValue(undefined)
    mockMarkDone.mockResolvedValue(undefined)
    mockMarkFailed.mockResolvedValue(undefined)
    mockRescheduleRetry.mockResolvedValue(undefined)
    mockExecuteClaimed.mockImplementation(async (_id: string, execute: { (job: unknown): Promise<unknown>; claim: unknown }) => execute(execute.claim))
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
          cta_url: 'https://zoom.example/live',
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

  it('uses the canonical Group Practice type in both queued reminders without changing their identity', async () => {
    mockZoomSessionFindUnique.mockResolvedValue({ id: 'session-1', status: 'SCHEDULED', type: 'GROUP', expertId: 'expert-1', requests: { type: 'group_practice' } })
    await scheduleReminders('user-1', {
      id: 'session-1', topic: 'Практика', scheduledAt: new Date('2026-09-03T13:00:00.000Z'),
      requests: { zoomLink: 'https://zoom.example/live' },
    })
    expect(scheduledCalls).toHaveLength(2)
    for (const call of scheduledCalls) {
      expect(call.payload.message_body).toContain('ГРУПОВА ПРАКТИКА')
      expect(call.payload.message_body).not.toContain('Індивідуальна сесія')
      expect(call.payload).toMatchObject({ sessionId: 'session-1', scheduledAt: '2026-09-03T13:00:00.000Z', cta_url: 'https://zoom.example/live' })
      expect(call.userId).toBe('user-1')
    }
    await scheduleReminders('user-1', { id: 'session-1', topic: 'Практика', scheduledAt: new Date('2026-09-03T13:00:00.000Z'), requests: { zoomLink: 'https://zoom.example/live' } })
    expect(scheduledCalls).toHaveLength(2)
  })

  it('preserves the individual reminder copy for an individual session', async () => {
    mockZoomSessionFindUnique.mockResolvedValue({ id: 'session-1', status: 'SCHEDULED', type: 'INDIVIDUAL', expertId: 'expert-1', requests: { type: 'individual' } })
    mockNotificationJobFindFirst.mockResolvedValue(null)
    await scheduleReminders('user-1', { id: 'session-1', topic: 'Консультація', scheduledAt: new Date('2026-09-03T13:00:00.000Z'), requests: {} })
    expect(scheduledCalls).toHaveLength(2)
    expect(scheduledCalls.every(({ payload }) => String(payload.message_body).includes('Індивідуальна сесія'))).toBe(true)
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

  it('replaces prior pending reminders and queues one durable reschedule notice per Group Practice attendee', async () => {
    await rescheduleGroupPracticeNotifications({
      session: {
        id: 'session-1',
        topic: 'ФОКУС · Zoom-практика',
        scheduledAt: new Date('2026-09-03T16:00:00.000Z'),
        requests: { zoomLink: 'https://zoom.example/live' },
      },
      attendeeUserIds: ['user-1', 'user-2', 'user-1'],
      oldScheduledAt: new Date('2026-09-03T13:00:00.000Z'),
    })

    expect(mockNotificationJobUpdateMany).toHaveBeenCalledTimes(2)
    expect(scheduledCalls.filter(({ payload }) => payload.flow_timer_id === 'ZOOM_GROUP_PRACTICE_RESCHEDULED')).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        payload: expect.objectContaining({
          message_title: 'ПРАКТИКУ ПЕРЕНЕСЕНО',
          cta_text: 'ВІДКРИТИ МОЇ СЕСІЇ',
          sessionId: 'session-1',
          request_fingerprint: 'zoom-group-practice-rescheduled:session-1:1788440400000:1788451200000:user-1',
        }),
      }),
      expect.objectContaining({
        userId: 'user-2',
        payload: expect.objectContaining({
          message_title: 'ПРАКТИКУ ПЕРЕНЕСЕНО',
          cta_text: 'ВІДКРИТИ МОЇ СЕСІЇ',
          sessionId: 'session-1',
          request_fingerprint: 'zoom-group-practice-rescheduled:session-1:1788440400000:1788451200000:user-2',
        }),
      }),
    ])
    expect(scheduledCalls.filter(({ payload }) => payload.flow_timer_id === 'ZOOM_REMINDER_2H')).toHaveLength(2)
    expect(scheduledCalls.filter(({ payload }) => payload.flow_timer_id === 'ZOOM_REMINDER_5M')).toHaveLength(2)
  })

  it('keeps the notification worker path functional for canonical reminder jobs', async () => {
    claimedJobs.push({
      id: 'job-1',
      type: 'AI_REMINDER',
      attempts: 0,
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
    expect(mockExecuteClaimed).toHaveReturnedWith(expect.any(Promise))
    await expect(mockExecuteClaimed.mock.results[0].value).resolves.toEqual({ status: 'DONE' })
  })

  it('requeues a failed due job instead of falsely marking it done', async () => {
    claimedJobs.push({
      id: 'job-retry',
      type: 'AI_REMINDER',
      attempts: 0,
      runAt: new Date('2026-09-03T11:00:00.000Z'),
      payload: {
        event: 'AB_TEST_FOLLOWUP',
        userId: 'user-1',
        payload: {
          flow_timer_id: 'ZOOM_REMINDER_2H',
          sessionId: 'session-1',
        },
      },
    })
    mockProcessJob.mockRejectedValueOnce(new Error('telegram_transport_unavailable'))

    await processDueNotificationJobs(10)

    await expect(mockExecuteClaimed.mock.results[0].value).resolves.toEqual({
      status: 'PENDING', attempts: 1, runAt: expect.any(Date), lastError: 'telegram_transport_unavailable',
    })
  })
})
