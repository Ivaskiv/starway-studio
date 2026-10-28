import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUserAccessState, mockCreateRequestWithIdentityInTransaction, mockResolveZoomIndividualPaymentTerms, mockGetIndividualAvailabilityForScheduledAt, mockSendDedupedTelegramMessage, prisma } = vi.hoisted(() => ({
  mockGetUserAccessState: vi.fn(),
  mockCreateRequestWithIdentityInTransaction: vi.fn(),
  mockResolveZoomIndividualPaymentTerms: vi.fn(() => ({ amount: 1, currency: 'UAH' })),
  mockGetIndividualAvailabilityForScheduledAt: vi.fn(),
  mockSendDedupedTelegramMessage: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    zoomSession: { findUnique: vi.fn() },
    zoomCommerceRequest: { findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    checkoutSession: { findFirst: vi.fn() },
    event: { upsert: vi.fn() },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))
vi.mock('../../../../src/db/client.js', () => ({ prisma }))
vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  createRequestWithIdentityInTransaction: (...args: unknown[]) => mockCreateRequestWithIdentityInTransaction(...args),
  resolveZoomIndividualPaymentTerms: () => mockResolveZoomIndividualPaymentTerms(),
}))
vi.mock('../../../../src/modules/zoom/booking/zoom.availability.service.js', () => ({
  getIndividualAvailabilityForScheduledAt: (...args: unknown[]) => mockGetIndividualAvailabilityForScheduledAt(...args),
}))
vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {}, coachBot: {},
  sendUserTelegramMessage: vi.fn(),
  resolveOpsChatId: vi.fn(() => null),
  sendDedupedTelegramMessage: (...args: unknown[]) => mockSendDedupedTelegramMessage(...args),
}))
vi.mock('../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({ afterZoomOperation: vi.fn() }))

import {
  bookPrivateSlot,
  isActiveFocusSubscriber,
  notifyAssignedPrivateSession,
} from '../../../../src/modules/zoom/private/zoom.private-booking.service.ts'

describe('private booking commerce request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: 'expert-1', type: 'PRIVATE', requests: {},
      status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 86400000),
      capacity: 1, _count: { attendees: 0 },
    })
    prisma.zoomCommerceRequest.findFirst.mockResolvedValue(null)
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: true },
      alternatives: [],
    })
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma))
    mockCreateRequestWithIdentityInTransaction.mockResolvedValue({
      request: { id: 'request-1', status: 'REQUESTED', checkoutOrderReference: null },
      created: true,
    })
  })

  it('uses canonical getUserAccessState focus flag without changing access', async () => {
    mockGetUserAccessState.mockResolvedValue({ hasFocus: false })
    await expect(isActiveFocusSubscriber('user-1')).resolves.toBe(false)
    expect(mockGetUserAccessState).toHaveBeenCalledWith('user-1')
    mockGetUserAccessState.mockResolvedValueOnce({ hasFocus: true })
    await expect(isActiveFocusSubscriber('user-1')).resolves.toBe(true)
  })

  it('creates REQUESTED through the commerce owner without checkout or attendee', async () => {
    const result = await bookPrivateSlot('user-1', 'session-1')
    expect(result).toEqual({ success: true, request: expect.objectContaining({ status: 'REQUESTED' }) })
    expect(mockCreateRequestWithIdentityInTransaction).toHaveBeenCalledWith(prisma, expect.objectContaining({
      kind: 'INDIVIDUAL', requesterUserId: 'user-1', expertId: 'expert-1',
      zoomSessionId: 'session-1', amount: 1, currency: 'UAH',
    }))
  })

  it('reuses the existing active request for repeat clicks', async () => {
    prisma.zoomCommerceRequest.findFirst.mockResolvedValue({ id: 'request-1', status: 'REQUESTED' })
    await expect(bookPrivateSlot('user-1', 'session-1')).resolves.toEqual({
      success: true, request: { id: 'request-1', status: 'REQUESTED' },
    })
    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
  })

  it('does not create a request for an occupied slot', async () => {
    prisma.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: 'expert-1', type: 'PRIVATE', requests: {},
      status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 86400000),
      capacity: 1, _count: { attendees: 1 },
    })
    await expect(bookPrivateSlot('user-2', 'session-1')).rejects.toThrow('slot_full')
    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
  })

  it('does not repeat-book a past expired slot', async () => {
    prisma.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: 'expert-1', type: 'PRIVATE', requests: {},
      status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 60_000),
      capacity: 1, _count: { attendees: 0 },
    })

    await expect(bookPrivateSlot('user-1', 'session-1')).rejects.toThrow('slot_unavailable')
    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
  })

  it('rejects a stale pre-created slot after the coach turns that date off', async () => {
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: false, reason: 'Час недоступний у розкладі коуча' },
      alternatives: [],
    })

    await expect(bookPrivateSlot('user-1', 'session-1')).rejects.toThrow('slot_unavailable')
    expect(mockGetIndividualAvailabilityForScheduledAt).toHaveBeenCalledWith({
      expertId: 'expert-1',
      scheduledAt: expect.any(Date),
      db: prisma,
      excludeSessionId: 'session-1',
    })
    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
  })

  it('keeps an existing booked request unchanged when availability later changes', async () => {
    prisma.zoomCommerceRequest.findFirst.mockResolvedValue({ id: 'request-1', status: 'PAID' })
    mockGetIndividualAvailabilityForScheduledAt.mockResolvedValue({
      candidate: { available: false, reason: 'Час недоступний у розкладі коуча' },
      alternatives: [],
    })

    await expect(bookPrivateSlot('user-1', 'session-1')).resolves.toEqual({
      success: true,
      request: { id: 'request-1', status: 'PAID' },
    })
    expect(mockGetIndividualAvailabilityForScheduledAt).not.toHaveBeenCalled()
    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
  })

  it('creates one replacement REQUESTED request after an expired request without reviving its checkout', async () => {
    const result = await bookPrivateSlot('user-1', 'session-1', 'Потрібна консультація')

    expect(result.request).toMatchObject({ id: 'request-1', status: 'REQUESTED' })
    expect(prisma.$queryRaw).toHaveBeenCalledOnce()
    expect(prisma.$executeRaw).toHaveBeenCalledOnce()
    expect(mockCreateRequestWithIdentityInTransaction).toHaveBeenCalledOnce()
    expect(prisma.checkoutSession.findFirst).not.toHaveBeenCalled()
  })

  it('does not notify again when a concurrent repeat finds the canonical active request', async () => {
    prisma.zoomCommerceRequest.findFirst.mockResolvedValue({ id: 'request-1', status: 'REQUESTED' })
    const notify = vi.spyOn(await import('../../../../src/modules/zoom/private/zoom.private-booking.service.ts'), 'notifyPrivateSessionRequest')

    await bookPrivateSlot('user-1', 'session-1')

    expect(mockCreateRequestWithIdentityInTransaction).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
    notify.mockRestore()
  })

  it('does not notify when the locked commerce helper resolves a concurrent request', async () => {
    mockCreateRequestWithIdentityInTransaction.mockResolvedValueOnce({
      request: { id: 'request-1', status: 'REQUESTED' },
      created: false,
    })
    const notify = vi.spyOn(await import('../../../../src/modules/zoom/private/zoom.private-booking.service.ts'), 'notifyPrivateSessionRequest')

    await bookPrivateSlot('user-1', 'session-1', 'Потрібна консультація')

    expect(notify).not.toHaveBeenCalled()
    notify.mockRestore()
  })

  it('uses the persisted development payment terms in the Telegram payment CTA', async () => {
    prisma.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: null, topic: 'Індивідуальна сесія',
      scheduledAt: new Date(Date.now() + 86400000),
    })
    prisma.zoomCommerceRequest.findUnique.mockResolvedValue({
      id: 'request-1', kind: 'INDIVIDUAL', status: 'APPROVED_PENDING_PAYMENT',
      requesterUserId: 'user-1', zoomSessionId: 'session-1', amount: 1, currency: 'UAH',
      checkoutOrderReference: 'zoom_commerce_individual_request-1',
    })
    prisma.checkoutSession.findFirst.mockResolvedValue({ expiresAt: new Date('2026-09-21T10:30:00.000Z') })
    prisma.user.findUnique.mockResolvedValue({
      firstName: 'Користувач', lastName: null, telegramChatId: 'chat-1', telegramLinks: [],
    })

    await notifyAssignedPrivateSession({
      commerceRequestId: 'request-1', sessionId: 'session-1', userId: 'user-1',
      checkoutUrl: 'https://checkout.example/one-uah', origin: 'user_approved',
    })

    expect(mockSendDedupedTelegramMessage).toHaveBeenCalledWith(
      'chat-1',
      expect.stringContaining('Вартість: 1 ГРН'),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: expect.arrayContaining([
            [{ text: 'ОПЛАТИТИ 1 ГРН', url: 'https://checkout.example/one-uah' }],
          ]),
        },
      }),
      expect.anything(),
    )
    expect(mockSendDedupedTelegramMessage).toHaveBeenCalledWith(
      'chat-1',
      expect.stringContaining('Час заброньований за тобою до 13:30 (час за Києвом).'),
      expect.anything(),
      expect.anything(),
    )
  })
})
