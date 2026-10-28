import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getIndividualAvailabilityForScheduledAt: vi.fn(),
  buildShortWayForPayCheckoutUrl: vi.fn(),
}))

vi.mock('../../../../src/modules/zoom/booking/zoom.availability.service.js', () => ({
  getIndividualAvailabilityForScheduledAt: mocks.getIndividualAvailabilityForScheduledAt,
  resolveIndividualPaymentDeadline: ({ scheduledAt }: { scheduledAt: Date }) =>
    new Date(scheduledAt.getTime() - 30 * 60_000),
}))

vi.mock('../../../../src/modules/subscriptions/payments/wayforpay/checkout.js', () => ({
  buildShortWayForPayCheckoutUrl: mocks.buildShortWayForPayCheckoutUrl,
  refreshCheckoutSessionPayload: vi.fn(),
}))

import { approveRequest } from '../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts'

function createApprovalDb() {
  const scheduledAt = new Date('2030-10-14T13:00:00.000Z')
  const request = {
    id: 'request-1',
    kind: 'INDIVIDUAL',
    status: 'REQUESTED',
    requesterUserId: 'user-1',
    expertId: 'expert-1',
    zoomSessionId: 'session-1',
    scheduledAt,
    amount: 60,
    currency: 'EUR',
    approvedAt: null as Date | null,
    checkoutOrderReference: null as string | null,
  }
  const checkout = {
    token: 'checkout-1',
    status: 'CREATED',
    expiresAt: new Date('2030-10-14T12:30:00.000Z'),
    invalidatedAt: null,
    payload: { wayForPayInvoiceUrl: 'https://pay.example/invoice-1' },
  }
  const tx = {
    $queryRaw: vi.fn(),
    zoomCommerceRequest: {
      findUniqueOrThrow: vi.fn(async () => request),
      findUnique: vi.fn(async () => request),
      findMany: vi.fn(async () => []),
      update: vi.fn(async ({ data }: { data: Partial<typeof request> }) => {
        Object.assign(request, data)
        return request
      }),
    },
    zoomSession: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: request.zoomSessionId,
        expertId: request.expertId,
        scheduledAt: request.scheduledAt,
        status: 'SCHEDULED',
        type: 'PRIVATE',
        requests: { type: 'individual' },
      })),
    },
    checkoutSession: {
      findMany: vi.fn(async () => request.checkoutOrderReference ? [checkout] : []),
    },
  }
  const db = {
    $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>) => operation(tx),
  }

  return { db, request, tx }
}

describe('approveRequest availability boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.buildShortWayForPayCheckoutUrl.mockResolvedValue('https://checkout.example/request-1')
  })

  it('preserves a REQUESTED Individual commitment after a later schedule change', async () => {
    const { db, request } = createApprovalDb()
    mocks.getIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: false, reason: 'Час недоступний у розкладі коуча' },
      alternatives: [],
    })

    await expect(approveRequest(request.id, request.expertId, db as never)).resolves.toMatchObject({
      request: { id: request.id, status: 'APPROVED_PENDING_PAYMENT' },
      checkoutUrl: 'https://pay.example/invoice-1',
    })
    expect(request.status).toBe('APPROVED_PENDING_PAYMENT')
    expect(request.checkoutOrderReference).toBe('zoom_commerce_individual_request-1')
  })

  it('continues to reject a competing Individual commitment', async () => {
    const { db, request } = createApprovalDb()
    mocks.getIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: false, reason: 'Зайнято' },
      alternatives: [],
    })

    await expect(approveRequest(request.id, request.expertId, db as never))
      .rejects.toThrow('COMMERCE_SLOT_OCCUPIED')
    expect(request.status).toBe('REQUESTED')
  })
})
