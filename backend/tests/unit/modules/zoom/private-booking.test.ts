import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserAccessState = vi.fn()

vi.mock('../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

import { isActiveFocusSubscriber } from '../../../../src/modules/zoom/private/zoom.private-booking.service.ts'

describe('isActiveFocusSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses canonical getUserAccessState focus flag for private zoom access', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:00:00.000Z'),
    })

    await expect(isActiveFocusSubscriber('user-1')).resolves.toBe(false)
    expect(mockGetUserAccessState).toHaveBeenCalledWith('user-1')

    mockGetUserAccessState.mockResolvedValueOnce({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-09-30T12:00:00.000Z'),
    })

    await expect(isActiveFocusSubscriber('user-1')).resolves.toBe(true)
  })
})
