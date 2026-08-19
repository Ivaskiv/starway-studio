import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckoutSessionUpsert = vi.fn()
const mockCheckoutSessionUpdate = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    checkoutSession: {
      upsert: (...args: unknown[]) => mockCheckoutSessionUpsert(...args),
      update: (...args: unknown[]) => mockCheckoutSessionUpdate(...args),
    },
  },
}))

import { refreshCheckoutSessionPayload, saveCheckoutSession } from '../wayforpay/checkout.ts'

describe('saveCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckoutSessionUpsert.mockResolvedValue(undefined)
    mockCheckoutSessionUpdate.mockResolvedValue(undefined)
  })

  it('stores trial_zoom checkout as CREATED with trusted user binding before webhook confirmation', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
        amount: 1,
        currency: 'UAH',
        clientAccountId: '11111111-1111-4111-8111-111111111111',
        productName: ['Пробний Zoom'],
        productPrice: [1],
        productCount: [1],
      }),
      'utf8',
    ).toString('base64url')

    await saveCheckoutSession('token-1', payload)

    expect(mockCheckoutSessionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'token-1' },
        update: expect.objectContaining({
          orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
          amount: 1,
          currency: 'UAH',
          productCode: 'trial_zoom',
          userId: '11111111-1111-4111-8111-111111111111',
          status: 'CREATED',
          invalidatedAt: null,
          expiresAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          token: 'token-1',
          orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
          amount: 1,
          currency: 'UAH',
          productCode: 'trial_zoom',
          userId: '11111111-1111-4111-8111-111111111111',
          status: 'CREATED',
          expiresAt: expect.any(Date),
        }),
      }),
    )
  })

  it('persists the regenerated retry orderReference back to the same checkout session token', async () => {
    await refreshCheckoutSessionPayload('token-1', {
      orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123_r456',
      amount: 1,
      currency: 'UAH',
      clientAccountId: '11111111-1111-4111-8111-111111111111',
      productName: ['Пробний Zoom'],
      productPrice: [1],
      productCount: [1],
    })

    expect(mockCheckoutSessionUpdate).toHaveBeenCalledWith({
      where: { token: 'token-1' },
      data: {
        payload: expect.objectContaining({
          orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123_r456',
        }),
        orderReference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123_r456',
        amount: 1,
        currency: 'UAH',
        productCode: 'trial_zoom',
        userId: '11111111-1111-4111-8111-111111111111',
      },
    })
  })
})
