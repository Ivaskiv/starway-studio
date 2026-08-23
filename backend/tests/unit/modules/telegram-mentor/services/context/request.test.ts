import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockGoalsSetFindFirst = vi.fn()
const mockWheelAssessmentFindFirst = vi.fn()
const mockMicroTaskFindMany = vi.fn()
const mockAiConversationFindFirst = vi.fn()
const mockZoomSessionFindFirst = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockResolveUserLifecycleFromRecord = vi.fn()
const mockResolveUserStateFromSnapshot = vi.fn()
const mockResolveWheelCooldownFromSnapshot = vi.fn()
const mockToSubscriptionInfo = vi.fn()
const mockGetPrimaryGoalTextFromGoals = vi.fn()
const mockMapTelegramConversationHistory = vi.fn()

vi.mock('../../../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    goalsSet: {
      findFirst: (...args: unknown[]) => mockGoalsSetFindFirst(...args),
    },
    wheelAssessment: {
      findFirst: (...args: unknown[]) => mockWheelAssessmentFindFirst(...args),
    },
    microTask: {
      findMany: (...args: unknown[]) => mockMicroTaskFindMany(...args),
    },
    aiConversation: {
      findFirst: (...args: unknown[]) => mockAiConversationFindFirst(...args),
    },
    zoomSession: {
      findFirst: (...args: unknown[]) => mockZoomSessionFindFirst(...args),
    },
  },
}))

vi.mock('../../../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../../../src/modules/flow-control/service.js', () => ({
  resolveUserLifecycleFromRecord: (...args: unknown[]) => mockResolveUserLifecycleFromRecord(...args),
}))

vi.mock('../../../../../../src/modules/telegram-mentor/core/state.service.js', () => ({
  resolveUserStateFromSnapshot: (...args: unknown[]) => mockResolveUserStateFromSnapshot(...args),
}))

vi.mock('../../../../../../src/modules/subscriptions/service.js', () => ({
  resolveWheelCooldownFromSnapshot: (...args: unknown[]) => mockResolveWheelCooldownFromSnapshot(...args),
  toSubscriptionInfo: (...args: unknown[]) => mockToSubscriptionInfo(...args),
}))

vi.mock('../../../../../../src/modules/goals/service.js', () => ({
  getPrimaryGoalTextFromGoals: (...args: unknown[]) => mockGetPrimaryGoalTextFromGoals(...args),
}))

vi.mock('../intelligence.ts', () => ({
  mapTelegramConversationHistory: (...args: unknown[]) => mockMapTelegramConversationHistory(...args),
}))

import { getTelegramAiRequestContextForUser } from '../../../../../../src/modules/telegram-mentor/services/context/request.ts'

describe('getTelegramAiRequestContextForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUserFindUnique.mockResolvedValue({
      firstName: 'Vira',
      telegramUserName: 'vira',
      lifecycleState: 'ACTIVE',
      currentState: 'S3_TEST_RESULT',
      currentStep: 'focus_step',
      focusPaid: true,
      onboardingStartedAt: null,
      trialStartsAt: null,
      trialEndsAt: null,
      subscriptions: [],
      fivePointsEnrollment: [],
      funnelLeads: [],
      balanceEntries: [],
    })
    mockGoalsSetFindFirst.mockResolvedValue(null)
    mockWheelAssessmentFindFirst.mockResolvedValue(null)
    mockMicroTaskFindMany.mockResolvedValue([])
    mockAiConversationFindFirst.mockResolvedValue(null)
    mockZoomSessionFindFirst.mockResolvedValue(null)
    mockResolveUserLifecycleFromRecord.mockReturnValue({ state: 'trial' })
    mockResolveUserStateFromSnapshot.mockReturnValue('ACTIVE')
    mockResolveWheelCooldownFromSnapshot.mockReturnValue({ canFill: false, daysLeft: null })
    mockToSubscriptionInfo.mockReturnValue({ status: 'inactive', endsAt: null, daysLeft: null })
    mockGetPrimaryGoalTextFromGoals.mockReturnValue(null)
    mockMapTelegramConversationHistory.mockReturnValue([])
  })

  it('builds focus participation strictly from canonical access without focusPaid fallback', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    const context = await getTelegramAiRequestContextForUser('user-1', 'chat-1')

    expect(context.focusParticipation).toEqual({
      isActive: false,
      status: 'inactive',
    })
  })

  it('maps FREE_WEEK1 to the canonical trial participation branch', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:00:00.000Z'),
    })

    const context = await getTelegramAiRequestContextForUser('user-1', 'chat-1')

    expect(context.focusParticipation).toEqual({
      isActive: true,
      status: 'trial',
    })
  })
})
