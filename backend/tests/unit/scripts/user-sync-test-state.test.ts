import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockAccessState = {
  state: 'FOCUS_ACTIVE' | 'NO_ACCESS'
  isActive: boolean
  hasFocus: boolean
  expiresAt: Date | null
}

type MockZoomView = {
  id: string
  scheduledAt: Date
  status: 'SCHEDULED'
  isMyBooking: boolean
} | null

const mockState = vi.hoisted(() => {
  const session = {
    id: 'zoom-1',
    status: 'SCHEDULED',
    scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
  }

  return {
    access: {
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    } as MockAccessState,
    zoom: null as MockZoomView,
    linkedUserId: 'user-1',
    activateCalls: vi.fn(),
    registerCalls: vi.fn(),
    unbookCalls: vi.fn(),
    reset() {
      this.access = {
        state: 'NO_ACCESS',
        isActive: false,
        hasFocus: false,
        expiresAt: null,
      }
      this.zoom = null
      this.linkedUserId = 'user-1'
      this.activateCalls.mockReset()
      this.registerCalls.mockReset()
      this.unbookCalls.mockReset()
    },
    session,
  }
})

vi.mock('../../db/client.ts', () => ({
  prisma: {
    zoomSession: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== mockState.session.id) return null
        return { ...mockState.session }
      }),
    },
    $disconnect: vi.fn(),
  },
}))

vi.mock('../../modules/telegram-mentor/services/identity/linking.ts', () => ({
  findLinkedUserId: vi.fn(async () => mockState.linkedUserId),
}))

vi.mock('../../modules/subscriptions/payments/activation.ts', () => ({
  activateProductSubscription: vi.fn(async (params: { expiresAtOverride?: Date | null }) => {
    mockState.activateCalls(params)
    mockState.access = {
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: params.expiresAtOverride ?? null,
    }
    return {
      success: true,
      message: 'activated',
      userId: 'user-1',
      source: 'admin_manual',
    }
  }),
}))

vi.mock('../../modules/subscriptions/payments/focus-access.ts', () => ({
  getUserAccessState: vi.fn(async () => mockState.access),
}))

vi.mock('../../modules/zoom/service.ts', () => ({
  getUpcomingZoomBookingView: vi.fn(async () => mockState.zoom),
  registerAttendee: vi.fn(async (_userId: string, sessionId: string) => {
    mockState.registerCalls({ sessionId })
    mockState.zoom = {
      id: sessionId,
      scheduledAt: mockState.session.scheduledAt,
      status: 'SCHEDULED',
      isMyBooking: true,
    }
    return { id: 'attendee-1' }
  }),
  unbookSlot: vi.fn(async (sessionId: string) => {
    mockState.unbookCalls({ sessionId })
    mockState.zoom = null
  }),
}))

import { syncUserTestState } from '../user-sync-test-state.ts'

describe('user-sync-test-state', () => {
  const baseSnapshot = {
    telegramFromId: '630111093',
    focus: {
      active: true,
      expiresAt: '2026-09-01T00:00:00.000Z',
    },
    zoom: {
      sessionId: 'zoom-1',
      startsAt: '2026-08-17T16:00:00.000Z',
      status: 'SCHEDULED' as const,
      booked: true,
    },
  }

  beforeEach(() => {
    mockState.reset()
    delete process.env.NODE_ENV
  })

  it('activates focus through canonical owner when local expiry diverges', async () => {
    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: {
        ...baseSnapshot,
        zoom: {
          ...baseSnapshot.zoom,
          booked: false,
        },
      },
    })

    expect(mockState.activateCalls).toHaveBeenCalledTimes(1)
    expect(report.after.access.state).toBe('FOCUS_ACTIVE')
    expect(report.after.access.expiresAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('books zoom through canonical owner when snapshot requires booking', async () => {
    mockState.access = {
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    }

    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: baseSnapshot,
    })

    expect(mockState.registerCalls).toHaveBeenCalledTimes(1)
    expect(report.after.zoom?.id).toBe('zoom-1')
    expect(report.after.zoom?.isMyBooking).toBe(true)
  })

  it('is idempotent on the second run', async () => {
    await syncUserTestState({
      telegramId: '630111093',
      snapshot: baseSnapshot,
    })

    mockState.activateCalls.mockClear()
    mockState.registerCalls.mockClear()
    mockState.unbookCalls.mockClear()

    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: baseSnapshot,
    })

    expect(mockState.activateCalls).not.toHaveBeenCalled()
    expect(mockState.registerCalls).not.toHaveBeenCalled()
    expect(mockState.unbookCalls).not.toHaveBeenCalled()
    expect(report.actions.focus).toBe('noop')
    expect(report.actions.zoom).toBe('noop')
  })

  it('refuses to run in production', async () => {
    process.env.NODE_ENV = 'production'

    await expect(syncUserTestState({
      telegramId: '630111093',
      snapshot: baseSnapshot,
    })).rejects.toThrow('disabled in production')
  })
})
