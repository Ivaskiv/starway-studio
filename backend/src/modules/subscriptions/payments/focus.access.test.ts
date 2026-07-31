import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockProductSubscriptionFindFirst = vi.fn()
const mockProductSubscriptionFindMany = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    productSubscription: {
      findFirst: (...args: unknown[]) => mockProductSubscriptionFindFirst(...args),
      findMany: (...args: unknown[]) => mockProductSubscriptionFindMany(...args),
    },
  },
}))

import { getUserAccessState } from './focus.access.js'

describe('getUserAccessState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      telegramUserId: '100',
      telegramChatId: '100',
    })
    mockProductSubscriptionFindMany.mockResolvedValue([])
  })

  it('prefers an older active subscription over a newer cancelled one', async () => {
    const activeRow = {
      status: 'active',
      paidAt: new Date('2026-07-01T00:00:00.000Z'),
      expiresAt: new Date('2026-08-20T00:00:00.000Z'),
      trialEndsAt: null,
      product: { code: 'focus' },
    }

    mockProductSubscriptionFindFirst
      .mockResolvedValueOnce(activeRow)
    mockProductSubscriptionFindMany.mockResolvedValue([
      {
        status: 'cancelled',
        paidAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-07-15T00:00:00.000Z'),
        trialEndsAt: null,
        product: { code: 'focus' },
      },
      activeRow,
    ])

    const result = await getUserAccessState('user-1')

    expect(result).toMatchObject({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-20T00:00:00.000Z'),
    })
    expect(mockProductSubscriptionFindFirst).toHaveBeenCalledTimes(2)
  })

  it('falls back to the latest subscription when no active row exists', async () => {
    mockProductSubscriptionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: 'cancelled',
        paidAt: null,
        expiresAt: new Date('2026-07-15T00:00:00.000Z'),
        trialEndsAt: null,
        product: { code: 'focus' },
      })

    const result = await getUserAccessState('user-1')

    expect(result).toMatchObject({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-07-15T00:00:00.000Z'),
    })
    expect(mockProductSubscriptionFindFirst).toHaveBeenCalledTimes(2)
  })

  it('returns NO_ACCESS when there are no subscriptions', async () => {
    mockProductSubscriptionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const result = await getUserAccessState('user-1')

    expect(result).toEqual({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
  })

  it('treats an active trial as Focus access', async () => {
    mockProductSubscriptionFindFirst.mockResolvedValueOnce({
      status: 'trial',
      paidAt: null,
      expiresAt: null,
      trialEndsAt: new Date('2026-08-05T00:00:00.000Z'),
      product: { code: 'focus' },
    })

    const result = await getUserAccessState('user-1')

    expect(result).toMatchObject({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-05T00:00:00.000Z'),
    })
  })

  it('treats an active trial_zoom entitlement as limited premium Zoom access without full focus', async () => {
    mockProductSubscriptionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: 'trial',
        paidAt: new Date('2026-07-31T12:00:00.000Z'),
        expiresAt: null,
        trialEndsAt: new Date('2026-08-03T20:59:59.999Z'),
        product: { code: 'trial_zoom' },
      })
    mockProductSubscriptionFindMany.mockResolvedValue([
      {
        status: 'trial',
        paidAt: new Date('2026-07-31T12:00:00.000Z'),
        expiresAt: null,
        trialEndsAt: new Date('2026-08-03T20:59:59.999Z'),
        product: { code: 'trial_zoom' },
      },
    ])

    const result = await getUserAccessState('user-1')

    expect(result).toEqual({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })
  })
})
