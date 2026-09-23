import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUserAccessState, mockCreateRequest, mockResolveZoomIndividualPaymentTerms, mockSendDedupedTelegramMessage, prisma } = vi.hoisted(() => ({
  mockGetUserAccessState: vi.fn(),
  mockCreateRequest: vi.fn(),
  mockResolveZoomIndividualPaymentTerms: vi.fn(() => ({ amount: 1, currency: 'UAH' })),
  mockSendDedupedTelegramMessage: vi.fn(),
  prisma: {
    zoomSession: { findUnique: vi.fn() },
    zoomCommerceRequest: { findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    checkoutSession: { findFirst: vi.fn() },
  },
}))

vi.mock('../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))
vi.mock('../../../../src/db/client.js', () => ({ prisma }))
vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  createRequest: (...args: unknown[]) => mockCreateRequest(...args),
  resolveZoomIndividualPaymentTerms: () => mockResolveZoomIndividualPaymentTerms(),
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
    mockCreateRequest.mockResolvedValue({
      id: 'request-1', status: 'REQUESTED', checkoutOrderReference: null,
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
    expect(mockCreateRequest).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'INDIVIDUAL', requesterUserId: 'user-1', expertId: 'expert-1',
      zoomSessionId: 'session-1', amount: 1, currency: 'UAH',
    }))
  })

  it('reuses the existing active request for repeat clicks', async () => {
    prisma.zoomCommerceRequest.findFirst.mockResolvedValue({ id: 'request-1', status: 'REQUESTED' })
    await expect(bookPrivateSlot('user-1', 'session-1')).resolves.toEqual({
      success: true, request: { id: 'request-1', status: 'REQUESTED' },
    })
    expect(mockCreateRequest).not.toHaveBeenCalled()
  })

  it('does not create a request for an occupied slot', async () => {
    prisma.zoomSession.findUnique.mockResolvedValue({
      id: 'session-1', expertId: 'expert-1', type: 'PRIVATE', requests: {},
      status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 86400000),
      capacity: 1, _count: { attendees: 1 },
    })
    await expect(bookPrivateSlot('user-2', 'session-1')).rejects.toThrow('slot_full')
    expect(mockCreateRequest).not.toHaveBeenCalled()
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
      expect.stringContaining('Час заброньований за тобою до 13:30.'),
      expect.anything(),
      expect.anything(),
    )
  })
})
