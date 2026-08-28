import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockAccessState = {
  state: 'FOCUS_ACTIVE' | 'NO_ACCESS' | 'PREMIUM'
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
    trialProductIds: ['trial-product-1'],
    trialSubscriptionCount: 1,
    trialPaymentLogCount: 1,
    trialCheckoutSessionCount: 1,
    activateCalls: vi.fn(),
    registerCalls: vi.fn(),
    unbookCalls: vi.fn(),
    deletedTrialSubscriptions: vi.fn(),
    deletedTrialPaymentLogs: vi.fn(),
    deletedTrialCheckoutSessions: vi.fn(),
    reset() {
      this.access = {
        state: 'NO_ACCESS',
        isActive: false,
        hasFocus: false,
        expiresAt: null,
      }
      this.zoom = null
      this.linkedUserId = 'user-1'
      this.trialProductIds = ['trial-product-1']
      this.trialSubscriptionCount = 1
      this.trialPaymentLogCount = 1
      this.trialCheckoutSessionCount = 1
      this.activateCalls.mockReset()
      this.registerCalls.mockReset()
      this.unbookCalls.mockReset()
      this.deletedTrialSubscriptions.mockReset()
      this.deletedTrialPaymentLogs.mockReset()
      this.deletedTrialCheckoutSessions.mockReset()
    },
    session,
  }
})

vi.mock('../../../src/db/client.js', () => ({
  prisma: {
    product: {
      findFirst: vi.fn(async ({ where }: { where: { code: { equals: string } } }) => ({
        id: where.code.equals === 'focus' ? 'focus-product-1' : 'trial-product-1',
      })),
      findMany: vi.fn(async () => mockState.trialProductIds.map((id) => ({ id }))),
    },
    productSubscription: {
      count: vi.fn(async () => mockState.trialSubscriptionCount),
      findUnique: vi.fn(async () => (
        mockState.trialSubscriptionCount > 0
          ? {
              status: 'trial',
              trialEndsAt: new Date('2026-08-30T12:00:00.000Z'),
            }
          : null
      )),
      findFirst: vi.fn(async () => (
        mockState.trialSubscriptionCount > 0 ? { id: 'trial-sub-1' } : null
      )),
      deleteMany: vi.fn(async () => {
        const count = mockState.trialSubscriptionCount
        mockState.deletedTrialSubscriptions({ count })
        mockState.trialSubscriptionCount = 0
        return { count }
      }),
    },
    paymentLog: {
      count: vi.fn(async () => mockState.trialPaymentLogCount),
      deleteMany: vi.fn(async () => {
        const count = mockState.trialPaymentLogCount
        mockState.deletedTrialPaymentLogs({ count })
        mockState.trialPaymentLogCount = 0
        return { count }
      }),
    },
    checkoutSession: {
      count: vi.fn(async () => mockState.trialCheckoutSessionCount),
      deleteMany: vi.fn(async () => {
        const count = mockState.trialCheckoutSessionCount
        mockState.deletedTrialCheckoutSessions({ count })
        mockState.trialCheckoutSessionCount = 0
        return { count }
      }),
    },
    zoomSession: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== mockState.session.id) return null
        return { ...mockState.session }
      }),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback({
      productSubscription: {
        upsert: async ({ create }: { create: { productId: string; trialEndsAt?: Date | null } }) => {
          if (create.productId === 'trial-product-1' && create.trialEndsAt) {
            mockState.access = {
              state: 'PREMIUM' as never,
              isActive: false,
              hasFocus: false,
              expiresAt: create.trialEndsAt,
            }
          }
          return { id: 'sub-1' }
        },
        deleteMany: async () => {
          const count = mockState.trialSubscriptionCount
          mockState.deletedTrialSubscriptions({ count })
          mockState.trialSubscriptionCount = 0
          mockState.access = {
            state: 'NO_ACCESS',
            isActive: false,
            hasFocus: false,
            expiresAt: null,
          }
          return { count }
        },
      },
      paymentLog: {
        deleteMany: async () => {
          const count = mockState.trialPaymentLogCount
          mockState.deletedTrialPaymentLogs({ count })
          mockState.trialPaymentLogCount = 0
          return { count }
        },
      },
      checkoutSession: {
        deleteMany: async () => {
          const count = mockState.trialCheckoutSessionCount
          mockState.deletedTrialCheckoutSessions({ count })
          mockState.trialCheckoutSessionCount = 0
          return { count }
        },
      },
      subscription: {
        findFirst: async () => null,
        deleteMany: async () => ({ count: 1 }),
        update: async () => ({ id: 'canonical-sub-1' }),
        create: async () => ({ id: 'canonical-sub-1' }),
      },
      user: {
        update: async () => ({ id: 'user-1' }),
      },
    })),
    $disconnect: vi.fn(),
  },
}))

vi.mock('../../../src/modules/telegram-mentor/services/identity/linking.js', () => ({
  findLinkedUserId: vi.fn(async () => mockState.linkedUserId),
}))

vi.mock('../../../src/modules/subscriptions/payments/activation.js', () => ({
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

vi.mock('../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: vi.fn(async () => mockState.access),
}))

vi.mock('../../../src/modules/flow-control/service.js', () => ({
  syncLifecycleForUser: vi.fn(async () => ({ state: 'paid' })),
}))

vi.mock('../../../src/modules/zoom/service.js', () => ({
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

import { syncUserTestState } from '../../../src/scripts/user-sync-test-state.ts'

describe('user-sync-test-state', () => {
  const baseSnapshot = {
    telegramFromId: '630111093',
    focus: {
      state: 'FOCUS_ACTIVE' as const,
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

  it('resets only trial zoom artifacts for a clean local eligibility state', async () => {
    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: {
        telegramFromId: '630111093',
        trialZoom: {
          state: 'ELIGIBLE' as const,
        },
      },
    })

    expect(report.actions.trialZoom).toBe('reset')
    expect(mockState.deletedTrialSubscriptions).toHaveBeenCalledTimes(1)
    expect(mockState.deletedTrialPaymentLogs).toHaveBeenCalledTimes(1)
    expect(mockState.deletedTrialCheckoutSessions).toHaveBeenCalledTimes(1)
    expect(mockState.activateCalls).not.toHaveBeenCalled()
    expect(mockState.registerCalls).not.toHaveBeenCalled()
    expect(mockState.unbookCalls).not.toHaveBeenCalled()
    expect(report.after.access.state).toBe('NO_ACCESS')
    expect(report.after.zoom).toBeNull()
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
    expect(report.actions.trialZoom).toBe('noop')
    expect(report.actions.zoom).toBe('noop')
  })

  it('refuses to run in production', async () => {
    process.env.NODE_ENV = 'production'

    await expect(syncUserTestState({
      telegramId: '630111093',
      snapshot: baseSnapshot,
    })).rejects.toThrow('disabled in production')
  })

  it('supports a trial-active snapshot through the canonical state owner', async () => {
    mockState.trialSubscriptionCount = 0
    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: {
        telegramFromId: '630111093',
        trialZoom: {
          state: 'TRIAL_ACTIVE',
          trialEndsAt: '2026-08-30T12:00:00.000Z',
        },
      },
      options: {
        mode: 'apply',
      },
    })

    expect(report.actions.trialZoom).toBe('activated')
  })

  it('clears an active trial zoom entitlement when snapshot state is NONE', async () => {
    mockState.access = {
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:00:00.000Z'),
    }

    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: {
        telegramFromId: '630111093',
        trialZoom: {
          state: 'NONE',
        },
      },
      options: {
        mode: 'apply',
      },
    })

    expect(report.actions.trialZoom).toBe('activated')
    expect(mockState.deletedTrialSubscriptions).toHaveBeenCalledTimes(1)
    expect(report.after.access.state).toBe('NO_ACCESS')
  })

  it('reports planned mutations in dry-run mode without enforcing post-apply verification', async () => {
    mockState.access = {
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    }

    const report = await syncUserTestState({
      telegramId: '630111093',
      snapshot: {
        telegramFromId: '630111093',
        focus: {
          state: 'FOCUS_ACTIVE',
          expiresAt: '2026-09-01T00:00:00.000Z',
        },
      },
      options: {
        mode: 'dry-run',
      },
    })

    expect(report.actions.focus).toBe('activated')
    expect(mockState.activateCalls).not.toHaveBeenCalled()
    expect(report.before.access.state).toBe('NO_ACCESS')
    expect(report.after.access.state).toBe('NO_ACCESS')
  })
})
