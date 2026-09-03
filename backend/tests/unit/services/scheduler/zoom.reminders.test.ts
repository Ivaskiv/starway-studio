import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindMany = vi.fn()
const mockNotificationJobFindFirst = vi.fn()
const mockNotificationFindFirst = vi.fn()
const mockNotificationSchedule = vi.fn()
const mockSendTelegramMessage = vi.fn()

const queuedKeys = new Set<string>()
const deliveredKeys = new Set<string>()

vi.mock('../../../../src/db/client.ts', () => ({
  prisma: {
    zoomSession: {
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    notificationJob: {
      findFirst: (...args: unknown[]) => mockNotificationJobFindFirst(...args),
    },
    notification: {
      findFirst: (...args: unknown[]) => mockNotificationFindFirst(...args),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../../../src/services/notifications/NotificationService.ts', () => ({
  notificationService: {
    schedule: (...args: unknown[]) => mockNotificationSchedule(...args),
  },
}))

vi.mock('../../../../src/lib/telegram.ts', () => ({
  bot: {},
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../../../../src/lib/telegram/messageFormatter.ts', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

vi.mock('../../../../src/modules/ai-operator/operator.service.ts', () => ({
  sendCoachZoomSummary: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/urls.ts', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar'),
}))

vi.mock('../../../../src/products/ab-system/content/abTest.followups.ts', () => ({
  AB_TEST_LIFECYCLE_REMINDERS: {},
}))

import { scanZoomSessionReminders } from '../../../../src/services/scheduler/zoom.ts'

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

describe('scanZoomSessionReminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:00:00.000Z'))
    vi.clearAllMocks()
    queuedKeys.clear()
    deliveredKeys.clear()

    mockNotificationJobFindFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (
      queuedKeys.has(extractQueueKey(where)) ? { id: 'existing-job' } : null
    ))
    mockNotificationFindFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (
      deliveredKeys.has(extractDeliveryKey(where)) ? { id: 'sent-notification' } : null
    ))
    mockNotificationSchedule.mockImplementation(async (_event: string, userId: string, _runAt: Date, payload: Record<string, unknown>) => {
      queuedKeys.add(`${userId}:${String(payload.flow_timer_id)}:${String(payload.sessionId)}`)
      return { id: `job-${queuedKeys.size}` }
    })
    mockSendTelegramMessage.mockResolvedValue(undefined)
  })

  it('routes 2h reminders into the canonical queue and dedupes repeated scans', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-2h',
        topic: 'Групова практика',
        scheduledAt: new Date('2026-09-03T11:55:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/2h' },
        attendees: [
          {
            userId: 'user-1',
            user: { telegramChatId: '12345' },
          },
        ],
      },
    ])

    await scanZoomSessionReminders({ telegram: { sendMessage: vi.fn() } } as never)
    await scanZoomSessionReminders({ telegram: { sendMessage: vi.fn() } } as never)

    expect(mockNotificationSchedule).toHaveBeenCalledTimes(1)
    expect(mockNotificationSchedule).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.any(Date),
      expect.objectContaining({
        flow_timer_id: 'ZOOM_REMINDER_2H',
        sessionId: 'session-2h',
      }),
    )
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
  })

  it('routes 5m reminders into the canonical queue without direct Telegram send', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-5m',
        topic: 'Групова практика',
        scheduledAt: new Date('2026-09-03T10:04:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/5m' },
        attendees: [
          {
            userId: 'user-2',
            user: { telegramChatId: '67890' },
          },
        ],
      },
    ])

    await scanZoomSessionReminders({ telegram: { sendMessage: vi.fn() } } as never)

    expect(mockNotificationSchedule).toHaveBeenCalledTimes(1)
    expect(mockNotificationSchedule).toHaveBeenCalledWith(
      expect.anything(),
      'user-2',
      expect.any(Date),
      expect.objectContaining({
        flow_timer_id: 'ZOOM_REMINDER_5M',
        sessionId: 'session-5m',
      }),
    )
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
  })

  it('does not enqueue when the canonical delivery state already exists', async () => {
    deliveredKeys.add('user-1:ZOOM_REMINDER_2H:session-2h')
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-2h',
        topic: 'Групова практика',
        scheduledAt: new Date('2026-09-03T11:55:00.000Z'),
        expertId: 'expert-1',
        requests: { zoomLink: 'https://zoom.example/2h' },
        attendees: [
          {
            userId: 'user-1',
            user: { telegramChatId: '12345' },
          },
        ],
      },
    ])

    await scanZoomSessionReminders({ telegram: { sendMessage: vi.fn() } } as never)

    expect(mockNotificationSchedule).not.toHaveBeenCalled()
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
  })
})
