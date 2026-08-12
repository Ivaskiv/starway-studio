import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockGetUserAccessState = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

vi.mock('../subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

import { getPlatformAccess } from './platform.access.js'

describe('getPlatformAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue({
      currentState: 'ACTIVE',
      onboardingDone: true,
      trialEndsAt: null,
    })
  })

  it('blocks platform access when legacy ACTIVE disagrees with canonical NO_ACCESS', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    const result = await getPlatformAccess('user-1')

    expect(result).toMatchObject({
      status: 'BLOCKED',
      focusPaid: false,
      aiUpgraded: false,
      canAccessPlatform: false,
      canAccessPaidModules: false,
    })
  })

  it('allows platform access from canonical FREE_WEEK1 without legacy ACTIVE state', async () => {
    mockUserFindUnique.mockResolvedValue({
      currentState: 'TEST_DONE',
      onboardingDone: false,
      trialEndsAt: new Date('2026-08-19T00:00:00Z'),
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-19T00:00:00Z'),
    })

    const result = await getPlatformAccess('user-2')

    expect(result).toMatchObject({
      status: 'TRIAL_ACTIVE',
      focusPaid: false,
      aiUpgraded: false,
      canAccessPlatform: true,
      canAccessPaidModules: false,
    })
    expect(result.daysLeft).toBeGreaterThanOrEqual(0)
  })
})
