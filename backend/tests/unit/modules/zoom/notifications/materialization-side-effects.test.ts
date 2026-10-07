import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionCreate = vi.fn()
const mockAfterZoomOperation = vi.fn()
const mockNotifySubscribersNewSession = vi.fn()

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: {
      create: (...args: unknown[]) => mockZoomSessionCreate(...args),
    },
  },
}))

vi.mock('../../../../../src/lib/telegram.js', () => ({ bot: {} }))

vi.mock('../../../../../src/modules/zoom/private/zoom.private-booking.service.js', () => ({
  assertWeeklyPrivateLimit: vi.fn(),
}))

vi.mock('../../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({
  afterZoomOperation: (...args: unknown[]) => mockAfterZoomOperation(...args),
}))

vi.mock('../../../../../src/modules/zoom/notifications/zoom.subscriber-notifications.service.js', () => ({
  notifySubscribersNewSession: (...args: unknown[]) => mockNotifySubscribersNewSession(...args),
}))

import { createFullSession } from '../../../../../src/modules/zoom/core/zoom.session.service.js'

describe('future session materialization side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists future Group sessions without immediate USER or OPS delivery', async () => {
    mockZoomSessionCreate.mockImplementation(async ({ data }) => ({
      id: `future-${data.scheduledAt.toISOString()}`,
      ...data,
    }))

    await Promise.all([
      '2026-10-05T16:00:00.000Z',
      '2026-10-12T16:00:00.000Z',
      '2026-10-19T16:00:00.000Z',
    ].map((scheduledAt) => createFullSession({
      expertId: 'expert-1',
      scheduledAt: new Date(scheduledAt),
      topic: 'ФОКУС · Zoom-практика',
      requests: { type: 'group_practice' } as never,
    }, {
      suppressAutomation: true,
      suppressSessionNotification: true,
    })))

    expect(mockZoomSessionCreate).toHaveBeenCalledTimes(3)
    expect(mockAfterZoomOperation).not.toHaveBeenCalled()
    expect(mockNotifySubscribersNewSession).not.toHaveBeenCalled()
  })
})
