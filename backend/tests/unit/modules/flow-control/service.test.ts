import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockGetUserAccessState = vi.fn()

vi.mock('../../../db/client.ts', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

vi.mock('../../../lib/cache/index.ts', () => ({
  cacheDel: vi.fn(),
}))

vi.mock('../../subscriptions/payments/focus-access.ts', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../lib/funnel/stage.ts', () => ({
  mapLifecycleToFunnelStage: vi.fn(() => 'paid'),
}))

vi.mock('../../integrations/sendpulse/sendpulse.service.ts', () => ({
  stopLeadMagnet: vi.fn(),
}))

vi.mock('../../../services/notifications/domain/notificationRoleRules.ts', () => ({
  isNotificationRoleAllowed: vi.fn(() => true),
}))

import { resolveUserLifecycle } from '../service.ts'

describe('resolveUserLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue({
      focusPaid: false,
      onboardingStartedAt: null,
      currentStep: 'START_FLOW',
      trialStartsAt: null,
      trialEndsAt: null,
      fivePointsEnrollment: [],
      subscriptions: [],
      funnelLeads: [],
    })
  })

  it('does not grant paid lifecycle from legacy ACTIVE when canonical access is NO_ACCESS', async () => {
    mockUserFindUnique.mockResolvedValue({
      focusPaid: false,
      onboardingStartedAt: null,
      currentStep: 'START_FLOW',
      trialStartsAt: null,
      trialEndsAt: null,
      fivePointsEnrollment: [],
      subscriptions: [{
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: new Date('2026-11-15T00:00:00Z'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
      }],
      funnelLeads: [],
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    const result = await resolveUserLifecycle('user-1')

    expect(result.state).toBe('expired')
    expect(result.subscriptionActive).toBe(false)
    expect(result.hasMentorAccess).toBe(false)
  })

  it('grants trial lifecycle from canonical FREE_WEEK1 without legacy trial fields', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-19T00:00:00Z'),
    })

    const result = await resolveUserLifecycle('user-2')

    expect(result.state).toBe('trial')
    expect(result.subscriptionStatus).toBe('trial')
    expect(result.subscriptionActive).toBe(true)
    expect(result.hasMentorAccess).toBe(true)
  })
})
