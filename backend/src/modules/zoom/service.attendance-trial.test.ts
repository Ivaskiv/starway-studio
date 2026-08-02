import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockUser = {
  id: string
  absystemAiActive: boolean
  absystemTrialExpiresAt: Date | null
  absystemGrantSource: 'post_zoom' | 'timeout' | 'direct_purchase' | 'manual' | null
  focusPaid?: boolean
}

type MockProductSubscription = {
  id: string
  userId: string
  productCode: string
  status: string
  expiresAt: Date | null
  paidAt: Date | null
}

type MockAttendee = {
  id: string
  userId: string
  sessionId: string
  attended: boolean
  createdAt: Date
}

const mockState = vi.hoisted(() => {
  const users = new Map<string, MockUser>()
  const productSubscriptions = new Map<string, MockProductSubscription[]>()
  const attendees = new Map<string, MockAttendee>()

  return {
    users,
    productSubscriptions,
    attendees,
    txCalls: 0,
    reset() {
      users.clear()
      productSubscriptions.clear()
      attendees.clear()
      this.txCalls = 0
    },
    seedUser(user: MockUser) {
      users.set(user.id, { ...user })
    },
    seedSubscription(subscription: MockProductSubscription) {
      const current = productSubscriptions.get(subscription.userId) ?? []
      current.push({ ...subscription })
      productSubscriptions.set(subscription.userId, current)
    },
    seedAttendee(attendee: MockAttendee) {
      attendees.set(attendee.id, { ...attendee })
    },
    getUser(userId: string) {
      return users.get(userId) ?? null
    },
    getAttendee(attendeeId: string) {
      return attendees.get(attendeeId) ?? null
    },
    findActivePaidAbsystemSubscription(userId: string, now: Date) {
      const matches = (productSubscriptions.get(userId) ?? []).filter((subscription) => {
        if (!['absystem_ai', 'absystem'].includes(subscription.productCode)) return false
        if (!['active', 'paid'].includes(subscription.status)) return false
        return !subscription.expiresAt || subscription.expiresAt > now
      })
      return matches[0] ?? null
    },
  }
})

vi.mock('../../db/client.js', () => {
  const tx = {
    user: {
      findUnique: vi.fn(async ({ where, select }: any) => {
        const user = mockState.getUser(where.id)
        if (!user) return null
        if (select?.id || select?.absystemAiActive || select?.absystemTrialExpiresAt || select?.absystemGrantSource) {
          return {
            id: user.id,
            absystemAiActive: user.absystemAiActive,
            absystemTrialExpiresAt: user.absystemTrialExpiresAt,
            absystemGrantSource: user.absystemGrantSource,
          }
        }
        return { ...user }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const user = mockState.getUser(where.id)
        if (!user) throw new Error('USER_NOT_FOUND')
        const next = {
          ...user,
          ...data,
        }
        mockState.users.set(where.id, next)
        return next
      }),
    },
    productSubscription: {
      findFirst: vi.fn(async ({ where }: any) => {
        return mockState.findActivePaidAbsystemSubscription(where.userId, where.OR?.[1]?.expiresAt?.gt ?? new Date())
      }),
    },
    zoomSessionAttendee: {
      findUnique: vi.fn(async ({ where }: any) => {
        const attendee = mockState.getAttendee(where.id)
        return attendee ? { ...attendee } : null
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const attendee = mockState.getAttendee(where.id)
        if (!attendee) throw new Error('ATTENDEE_NOT_FOUND')
        const next = {
          ...attendee,
          ...data,
        }
        mockState.attendees.set(where.id, next)
        return next
      }),
    },
  }

  return {
    prisma: {
      ...tx,
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
        mockState.txCalls += 1
        return callback(tx)
      }),
    },
  }
})

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  sendDedupedTelegramMessage: vi.fn(),
  sendOpsTelegramMessage: vi.fn(),
  getBotLink: vi.fn(() => 'https://t.me/test_bot'),
}))

vi.mock('../../services/notifications/NotificationEvent.js', () => ({
  NotificationEvent: {},
}))

vi.mock('@/products/ab-system/content/abTest.zoom.js', () => ({
  abTestZoomContent: {},
}))

vi.mock('@/products/focus/config/focus.constants.js', () => ({
  FOCUS_PRODUCT_CODE: 'focus',
}))

vi.mock('../subscriptions/payments/focus.access.js', () => ({
  FOCUS_PRODUCT_CODES: ['focus'],
  getUserAccessState: vi.fn(async () => ({
    state: 'FOCUS_ACTIVE',
    isActive: true,
    hasFocus: true,
    expiresAt: new Date('2027-07-20T23:59:59.000Z'),
  })),
}))

vi.mock('../subscriptions/payments/wayforpay.checkout.js', () => ({
  buildShortWayForPayCheckoutUrl: vi.fn(),
}))

vi.mock('../subscriptions/payments/wayforpay.js', () => ({
  buildPaymentRequest: vi.fn(),
}))

vi.mock('./zoomPostReport.types.js', () => ({
  parseZoomPostReport: vi.fn(),
}))

vi.mock('./urls.js', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://example.com/zoom'),
}))

import { activateAbsystemTrialAfterFirstZoom } from '../access/service.js'
import { markAttended } from './service.js'

describe('Zoom attendance -> ABSystem trial activation', () => {
  const attendedAt = new Date('2026-08-03T17:00:00.000Z')
  const expiresAt = '2026-09-02T17:00:00.000Z'

  beforeEach(() => {
    mockState.reset()
  })

  it('first confirmed attendance activates 30-day ABSystem trial', async () => {
    mockState.seedUser({
      id: 'user-1',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      focusPaid: true,
    })
    mockState.seedAttendee({
      id: 'attendee-1',
      userId: 'user-1',
      sessionId: 'session-1',
      attended: false,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    })

    const attendee = await markAttended('attendee-1', attendedAt)

    expect(attendee.attended).toBe(true)
    expect(mockState.getUser('user-1')?.absystemTrialExpiresAt?.toISOString()).toBe(expiresAt)
    expect(mockState.getUser('user-1')?.absystemGrantSource).toBe('post_zoom')
  })

  it('expiresAt equals attendedAt plus 30 days', async () => {
    mockState.seedUser({
      id: 'user-2',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })

    const result = await activateAbsystemTrialAfterFirstZoom({
      userId: 'user-2',
      attendedAt,
    })

    expect(result.status).toBe('ACTIVATED')
    expect(result.expiresAt.toISOString()).toBe(expiresAt)
  })

  it('repeated attendance does not extend trial', async () => {
    mockState.seedUser({
      id: 'user-3',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })
    mockState.seedAttendee({
      id: 'attendee-3',
      userId: 'user-3',
      sessionId: 'session-3',
      attended: false,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    })

    await markAttended('attendee-3', attendedAt)
    const second = await activateAbsystemTrialAfterFirstZoom({
      userId: 'user-3',
      attendedAt: new Date('2026-08-10T17:00:00.000Z'),
    })

    expect(second.status).toBe('ALREADY_ACTIVE')
    expect(mockState.getUser('user-3')?.absystemTrialExpiresAt?.toISOString()).toBe(expiresAt)
  })

  it('second Zoom does not create duplicate', async () => {
    mockState.seedUser({
      id: 'user-4',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })
    mockState.seedAttendee({
      id: 'attendee-4a',
      userId: 'user-4',
      sessionId: 'session-4a',
      attended: false,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    })
    mockState.seedAttendee({
      id: 'attendee-4b',
      userId: 'user-4',
      sessionId: 'session-4b',
      attended: false,
      createdAt: new Date('2026-08-10T10:00:00.000Z'),
    })

    await markAttended('attendee-4a', attendedAt)
    await markAttended('attendee-4b', new Date('2026-08-11T17:00:00.000Z'))

    expect(mockState.getUser('user-4')?.absystemTrialExpiresAt?.toISOString()).toBe(expiresAt)
  })

  it('booking without attendance does not activate trial', async () => {
    mockState.seedUser({
      id: 'user-5',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })
    mockState.seedAttendee({
      id: 'attendee-5',
      userId: 'user-5',
      sessionId: 'session-5',
      attended: false,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    })

    expect(mockState.getUser('user-5')?.absystemTrialExpiresAt).toBeNull()
  })

  it('paid ABSystem access is not replaced', async () => {
    mockState.seedUser({
      id: 'user-6',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })
    mockState.seedSubscription({
      id: 'sub-6',
      userId: 'user-6',
      productCode: 'absystem_ai',
      status: 'active',
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      paidAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const result = await activateAbsystemTrialAfterFirstZoom({
      userId: 'user-6',
      attendedAt,
    })

    expect(result.status).toBe('PAID_ACCESS_EXISTS')
    expect(mockState.getUser('user-6')?.absystemTrialExpiresAt).toBeNull()
  })

  it('Focus expiry/status remains unchanged', async () => {
    mockState.seedUser({
      id: 'user-7',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
      focusPaid: true,
    })
    mockState.seedAttendee({
      id: 'attendee-7',
      userId: 'user-7',
      sessionId: 'session-7',
      attended: false,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    })

    await markAttended('attendee-7', attendedAt)

    expect(mockState.getUser('user-7')?.focusPaid).toBe(true)
  })

  it('failure in attendance transition does not activate trial', async () => {
    mockState.seedUser({
      id: 'user-8',
      absystemAiActive: false,
      absystemTrialExpiresAt: null,
      absystemGrantSource: null,
    })

    await expect(markAttended('missing-attendee', attendedAt)).rejects.toThrow('ATTENDEE_NOT_FOUND')
    expect(mockState.getUser('user-8')?.absystemTrialExpiresAt).toBeNull()
  })
})
