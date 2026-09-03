import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    productSubscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    checkoutSession: {
      updateMany: vi.fn(),
    },
    notificationJob: {
      updateMany: vi.fn(),
    },
    runtimeOutbox: {
      updateMany: vi.fn(),
    },
    zoomSession: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../../../../src/modules/zoom/service.js', () => ({
  autoBookAllUpcomingGroupSessions: vi.fn(async () => undefined),
}))

vi.mock('../../../../../src/services/notifications/NotificationService.js', () => ({
  notificationService: {
    sendZoomBookingOpenedNotification: vi.fn(async () => true),
  },
}))

import { activateProductSubscription } from '../../../../../src/modules/subscriptions/payments/activation.ts'
import { autoBookAllUpcomingGroupSessions } from '../../../../../src/modules/zoom/service.js'
import { notificationService } from '../../../../../src/services/notifications/NotificationService.js'

describe('activateProductSubscription late Zoom invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma as never))

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      focusPaid: false,
    })
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-focus',
      code: 'focus',
    })
    mockPrisma.productSubscription.findUnique.mockResolvedValue(null)
    mockPrisma.productSubscription.upsert.mockResolvedValue(undefined)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPrisma.subscription.create.mockResolvedValue(undefined)
    mockPrisma.user.update.mockResolvedValue(undefined)
    mockPrisma.notificationJob.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.runtimeOutbox.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.checkoutSession.updateMany.mockResolvedValue({ count: 0 })
  })

  it('sends the existing booking-open notification once for still-open upcoming Zoom sessions after Focus activation', async () => {
    mockPrisma.zoomSession.findMany.mockResolvedValue([
      {
        id: 'session-open',
        topic: 'ФОКУС · Zoom-практика',
        scheduledAt: new Date('2026-09-10T16:00:00.000Z'),
        requests: {
          type: 'group_practice',
          bookingSource: 'coach',
          coachConfirmedAt: '2026-09-03T10:00:00.000Z',
          bookingClosesAt: '2026-09-10T15:00:00.000Z',
        },
      },
      {
        id: 'session-expired',
        topic: 'Expired Zoom',
        scheduledAt: new Date('2026-09-09T16:00:00.000Z'),
        requests: {
          type: 'group_practice',
          bookingSource: 'coach',
          coachConfirmedAt: '2026-09-03T10:00:00.000Z',
          bookingClosesAt: '2026-09-01T15:00:00.000Z',
        },
      },
      {
        id: 'session-draft',
        topic: 'Draft Zoom',
        scheduledAt: new Date('2026-09-11T16:00:00.000Z'),
        requests: {
          type: 'group_practice',
        },
      },
    ])

    const result = await activateProductSubscription({
      userId: 'user-1',
      productCode: 'focus',
      source: 'webhook_approved',
    })

    expect(result).toEqual({
      success: true,
      message: 'activated',
      userId: 'user-1',
      source: 'webhook_approved',
    })
    expect(autoBookAllUpcomingGroupSessions).toHaveBeenCalledWith('user-1')
    expect(notificationService.sendZoomBookingOpenedNotification).toHaveBeenCalledTimes(1)
    expect(notificationService.sendZoomBookingOpenedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sessionId: 'session-open',
        ctaUrl: expect.stringContaining('intent=booking'),
      }),
    )
  })
})
