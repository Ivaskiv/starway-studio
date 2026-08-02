import { beforeEach, describe, expect, it, vi } from 'vitest'

const onTestCompletedMock = vi.fn()
const userUpdateMock = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    user: {
      update: userUpdateMock,
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {
    onTestCompleted: onTestCompletedMock,
  },
}))

describe('persistTestOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_ACCESS_SECRET = 'test-access-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    onTestCompletedMock.mockResolvedValue(undefined)
    userUpdateMock.mockResolvedValue({})
  })

  it('persists canonical test completion before resetting the onboarding step', async () => {
    const { persistTestOutcome } = await import('./routes.js')

    await persistTestOutcome('user-1', {
      type: 'DECISION',
      dominantScore: 12,
      categoryBreakdown: {
        state: 1,
        goal: 2,
        choice: 3,
        decision: 4,
        action: 2,
      },
    })

    expect(onTestCompletedMock).toHaveBeenCalledWith('user-1', 'DECISION')
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        currentStep: 'START_FLOW',
      },
    })
  })
})
