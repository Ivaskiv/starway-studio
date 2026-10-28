import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationJob } from '@starway/db/prisma-client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mockZoomSessionFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()
const mockNotificationFindFirst = vi.fn()
const mockNotificationCount = vi.fn()
const mockEventFindFirst = vi.fn()
const mockLoadDeliveryUser = vi.fn()
const mockSendTelegram = vi.fn()
const mockSendInApp = vi.fn()
const mockCreateNotification = vi.fn()
const mockSendFocusDojim = vi.fn()
const mockDeliverCommerceReminder = vi.fn()

vi.mock('../../../../src/db/client.ts', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    notification: {
      findFirst: (...args: unknown[]) => mockNotificationFindFirst(...args),
      count: (...args: unknown[]) => mockNotificationCount(...args),
    },
    event: {
      findFirst: (...args: unknown[]) => mockEventFindFirst(...args),
    },
  },
}))

vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  getCommerceCheckoutUrl: vi.fn(),
  hasPaidIndividualParticipation: vi.fn(),
  isLegacyIndividualSession: vi.fn(() => false),
}))

vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-telegram.js', () => ({
  deliverIndividualPaymentReminder: (...args: unknown[]) => mockDeliverCommerceReminder(...args),
}))

vi.mock('../../../../src/services/notifications/NotificationService.foundation.js', () => ({
  asNumber: (value: unknown) => typeof value === 'number' ? value : null,
  asString: (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null,
  DAILY_LIMIT: 2,
  endOfDay: () => new Date('2026-10-09T00:00:00.000Z'),
  isJsonObject: (value: unknown) => Boolean(value) && typeof value === 'object' && !Array.isArray(value),
  startOfDay: () => new Date('2026-10-08T00:00:00.000Z'),
  toJsonObject: (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value : {},
  toPersistedJobPayload: (value: unknown) => value,
}))

vi.mock('../../../../src/services/notifications/NotificationService.telegram.js', () => ({
  loadDeliveryUser: (...args: unknown[]) => mockLoadDeliveryUser(...args),
}))

vi.mock('../../../../src/services/notifications/NotificationService.base.js', () => ({
  NotificationServiceBase: class {},
}))

vi.mock('../../../../src/services/notifications/NotificationService.js', () => ({
  notificationService: {},
}))

vi.mock('../../../../src/modules/events/service.js', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../src/services/notifications/delivery/NotificationDeliveryLayer.js', () => ({
  notificationDeliveryLayer: {
    sendTelegram: (...args: unknown[]) => mockSendTelegram(...args),
    sendInApp: (...args: unknown[]) => mockSendInApp(...args),
  },
}))

vi.mock('../../../../src/services/notifications/domain/notificationPolicy.js', () => ({
  buildNotificationData: vi.fn(() => ({})),
  getNotificationDuplicateWindowStart: vi.fn(() => new Date('2026-10-08T00:00:00.000Z')),
  isCriticalNotificationTemplate: vi.fn(() => true),
  resolveNotificationTemplateKey: vi.fn((_event: unknown, payload: Record<string, unknown>) => String(payload.flow_timer_id ?? 'ai-reminder')),
  resolveNotificationType: vi.fn(() => 'AI_REMINDER'),
}))

vi.mock('../../../../src/services/notifications/repositories/NotificationPreferenceRepository.js', () => ({
  notificationPreferenceRepository: {
    ensureForUser: vi.fn().mockResolvedValue({ telegramEnabled: true }),
  },
}))

vi.mock('../../../../src/modules/flow-control/service.js', () => ({
  isNotificationAllowedForUser: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../../../src/modules/user-state/crossChannelState.service.js', () => ({
  canSendCrossChannelNotification: vi.fn().mockResolvedValue(true),
  markCrossChannelNotificationSent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../src/modules/telegram-mentor/handlers/start.js', () => ({
  resolveUserState: vi.fn().mockResolvedValue('S4_FOCUS_INVITE'),
}))

vi.mock('../../../../src/core/state-machine/flowTimingFoundation.js', () => ({
  buildFlowTimerAnalytics: vi.fn(() => ({})),
  resolveFlowTimerContext: vi.fn(({ timer_id, payload }: { timer_id?: string | null; payload?: Record<string, unknown> }) => ({
    timer: (timer_id ?? payload?.flow_timer_id) ? { id: timer_id ?? payload?.flow_timer_id } : null,
  })),
  shouldSkipFlowTimerDelivery: vi.fn(() => ({ ok: true })),
}))

import { NotificationServiceQueue } from '../../../../src/services/notifications/NotificationService.queue.ts'

class TestNotificationQueue extends NotificationServiceQueue {
  protected isEventEnabledByPreferences() {
    return true
  }

  protected async buildMessage() {
    return { title: 'Тест', body: 'Тестове повідомлення' }
  }

  protected async shouldSuppressMentorNotification() {
    return false
  }

  async createNotification(input: unknown) {
    mockCreateNotification(input)
    return input as never
  }

  protected async sendFocusDojimTelegramSequence(input: unknown) {
    mockSendFocusDojim(input)
    return true
  }
}

function dueReminderJob(windowId: 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'): NotificationJob {
  const now = new Date('2026-10-08T10:00:00.000Z')
  return {
    id: `job-${windowId}`,
    type: 'AI_REMINDER',
    payload: {
      event: 'AB_TEST_FOLLOWUP',
      userId: 'test-user',
      payload: {
        flow_timer_id: windowId,
        sessionId: 'test-session',
        scheduledAt: '2026-10-08T12:00:00.000Z',
      },
    },
    runAt: now,
    status: 'PROCESSING',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  } as NotificationJob
}

function dueBackgroundJob(payload: Record<string, unknown>): NotificationJob {
  const now = new Date('2026-10-08T10:00:00.000Z')
  return {
    id: 'background-job',
    type: 'AI_REMINDER',
    payload: {
      event: 'AB_TEST_FOLLOWUP',
      userId: 'test-user',
      payload,
    },
    runAt: now,
    status: 'PROCESSING',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  } as NotificationJob
}

describe('NotificationServiceQueue Zoom reminder delivery guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue({
      id: 'test-user',
      firstName: 'Vira',
      email: null,
      telegramChatId: '777',
      telegramUserId: null,
      telegramLinks: [],
      focusPaid: false,
      telegramEnabled: true,
    })
    mockLoadDeliveryUser.mockResolvedValue({
      id: 'test-user',
      firstName: 'Vira',
      email: null,
      telegramChatId: '777',
      telegramUserId: null,
      telegramLinks: [],
    })
    mockNotificationFindFirst.mockResolvedValue(null)
    mockNotificationCount.mockResolvedValue(0)
    mockEventFindFirst.mockResolvedValue(null)
    mockSendTelegram.mockResolvedValue(true)
    mockSendInApp.mockResolvedValue(true)
    mockSendFocusDojim.mockResolvedValue(true)
    mockDeliverCommerceReminder.mockResolvedValue('sent')
  })

  it.each([
    ['CANCELLED', 'ZOOM_REMINDER_2H'],
    ['COMPLETED', 'ZOOM_REMINDER_5M'],
  ] as const)('skips a queued %s session reminder before Telegram delivery', async (status, windowId) => {
    mockZoomSessionFindUnique.mockResolvedValue({ id: 'test-session', status })
    const queue = new TestNotificationQueue()

    await expect(queue.processJob(dueReminderJob(windowId))).resolves.toBeUndefined()

    expect(mockZoomSessionFindUnique).toHaveBeenCalledWith({ where: { id: 'test-session' } })
  })

  it('routes a due AI reminder through the shared Telegram delivery layer', async () => {
    const queue = new TestNotificationQueue()

    await queue.processJob(dueBackgroundJob({ flow_timer_id: 'PAYMENT_REMINDER_24H' }))

    expect(mockSendTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-user', telegramChatId: '777' }),
      { title: 'Тест', body: 'Тестове повідомлення' },
    )
    expect(mockCreateNotification).toHaveBeenCalled()
  })

  it('routes a due DOJIM job through the canonical renderer-based DOJIM sender', async () => {
    const queue = new TestNotificationQueue()

    await queue.processJob(dueBackgroundJob({ flow_timer_id: 'RESULT_DOJIM_24H' }))

    expect(mockSendFocusDojim).toHaveBeenCalledWith(expect.objectContaining({
      flowTimerId: 'RESULT_DOJIM_24H',
      user: expect.objectContaining({ id: 'test-user', telegramChatId: '777' }),
    }))
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('dispatches PAYMENT_REMINDER_10M only through the commerce revalidation owner', async () => {
    const queue = new TestNotificationQueue()

    await queue.processJob(dueBackgroundJob({
      zoomCommerceEvent: 'PAYMENT_REMINDER_10M',
      zoomCommerceRequestId: 'commerce-request-1',
      paymentDeadline: '2026-10-08T10:30:00.000Z',
    }))

    expect(mockDeliverCommerceReminder).toHaveBeenCalledWith({
      requestId: 'commerce-request-1', expectedDeadline: '2026-10-08T10:30:00.000Z',
    })
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('lets a commerce reminder delivery failure reach the worker retry policy', async () => {
    mockDeliverCommerceReminder.mockRejectedValueOnce(new Error('telegram unavailable'))
    const queue = new TestNotificationQueue()

    await expect(queue.processJob(dueBackgroundJob({
      zoomCommerceEvent: 'PAYMENT_REMINDER_10M',
      zoomCommerceRequestId: 'commerce-request-1',
      paymentDeadline: '2026-10-08T10:30:00.000Z',
    }))).rejects.toThrow('telegram unavailable')
  })

  it('keeps fixed background paths free of raw user-facing Telegram sends', () => {
    const fixedPaths = [
      'backend/src/services/notifications/NotificationService.queue.ts',
      'backend/src/services/notifications/worker.ts',
      'backend/src/modules/zoom/notifications/zoom.reminders.service.ts',
    ]

    for (const path of fixedPaths) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8')
      expect(source).not.toMatch(/(?:bot\.telegram|telegram)\.sendMessage\s*\(/)
      expect(source).not.toMatch(/ctx\.reply\s*\(/)
    }
  })
})
