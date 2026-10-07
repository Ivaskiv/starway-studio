import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAttendeeFindMany = vi.fn()
const mockCommerceRequestFindMany = vi.fn()
const mockUserFindMany = vi.fn()
const mockSessionFindUnique = vi.fn()
const mockSendTelegramMessage = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findMany: (...args: unknown[]) => mockAttendeeFindMany(...args),
    },
    zoomCommerceRequest: {
      findMany: (...args: unknown[]) => mockCommerceRequestFindMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    zoomSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOpsTelegramMessage(...args),
}))

vi.mock('../../../../src/lib/telegram/messageFormatter.js', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

vi.mock('../../../../src/modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: vi.fn((params: { zoomRole?: string } = {}) =>
    `https://app.starway.test/miniapp/zoom-calendar?zoomRole=${params.zoomRole ?? 'user'}`,
  ),
}))

vi.mock('../../../../src/modules/zoom/notifications/zoom.channel.service.js', () => ({
  syncChannelPost: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../src/config/webapp.js', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://app.starway.test'),
}))

import {
  afterZoomOperation,
  collectCancellationAffectedUserIds,
} from '../../../../src/modules/zoom/core/zoom.operations.service.js'

const session = {
  id: 'session-1',
  topic: 'Індивідуальна стратегічна сесія',
  scheduledAt: new Date('2030-01-07T12:00:00.000Z'),
  expertId: 'expert-1',
  requests: { type: 'individual' },
  _count: { attendees: 0 },
}

function user(id: string) {
  return { id, firstName: 'Vira', telegramChatId: `chat-${id}`, telegramLinks: [] }
}

async function expectCancelDelivery(userIds: string[]) {
  await afterZoomOperation({} as never, {
    operation: 'cancel',
    sessionId: session.id,
    affectedUserIds: userIds,
  })

  await vi.waitFor(() => expect(mockSendTelegramMessage).toHaveBeenCalledTimes(userIds.length))
  expect(mockSendTelegramMessage).toHaveBeenCalledWith(
    expect.anything(),
    expect.any(String),
    expect.stringContaining('СЕСІЮ СКАСОВАНО'),
    expect.objectContaining({
      replyMarkup: {
        inline_keyboard: [[expect.objectContaining({ text: 'ВІДКРИТИ КАЛЕНДАР' })]],
      },
    }),
  )
}

describe('Zoom cancel notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAttendeeFindMany.mockResolvedValue([])
    mockCommerceRequestFindMany.mockResolvedValue([])
    mockUserFindMany.mockResolvedValue([])
    mockSessionFindUnique.mockResolvedValue(session)
    mockSendTelegramMessage.mockResolvedValue(undefined)
    mockSendOpsTelegramMessage.mockResolvedValue(undefined)
  })

  it('notifies every group attendee exactly once when a coach cancels the session', async () => {
    mockAttendeeFindMany.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }])
    mockUserFindMany.mockResolvedValue([user('user-1'), user('user-2')])
    mockSessionFindUnique.mockResolvedValue({
      ...session,
      requests: { type: 'group_practice' },
      _count: { attendees: 2 },
    })

    const affectedUserIds = await collectCancellationAffectedUserIds(session.id)

    expect(affectedUserIds).toEqual(['user-1', 'user-2'])
    await expectCancelDelivery(affectedUserIds)
  })

  it('notifies an Individual requester with an active commerce request', async () => {
    mockCommerceRequestFindMany.mockResolvedValue([{ requesterUserId: 'user-1' }])
    mockUserFindMany.mockResolvedValue([user('user-1')])

    const affectedUserIds = await collectCancellationAffectedUserIds(session.id)

    expect(affectedUserIds).toEqual(['user-1'])
    expect(mockCommerceRequestFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        zoomSessionId: session.id,
        status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] },
      }),
    }))
    await expectCancelDelivery(affectedUserIds)
  })

  it('deduplicates an attendee who is also the active commerce requester', async () => {
    mockAttendeeFindMany.mockResolvedValue([{ userId: 'user-1' }])
    mockCommerceRequestFindMany.mockResolvedValue([{ requesterUserId: 'user-1' }])
    mockUserFindMany.mockResolvedValue([user('user-1')])

    const affectedUserIds = await collectCancellationAffectedUserIds(session.id)

    expect(affectedUserIds).toEqual(['user-1'])
    await expectCancelDelivery(affectedUserIds)
  })

  it('uses the OPS Mini App calendar URL for the cancel report while retaining one USER notification', async () => {
    mockUserFindMany.mockResolvedValue([user('user-1')])

    await afterZoomOperation({} as never, {
      operation: 'cancel',
      sessionId: session.id,
      affectedUserIds: ['user-1'],
    })

    await vi.waitFor(() => expect(mockSendOpsTelegramMessage).toHaveBeenCalledTimes(1))

    const [, options] = mockSendOpsTelegramMessage.mock.calls[0]
    const opsButton = options.reply_markup.inline_keyboard[0][0]
    expect(opsButton).toEqual({
      text: 'ПАНЕЛЬ ZOOM',
      url: expect.stringContaining('/miniapp/zoom-calendar'),
    })
    expect(opsButton.url).toContain('zoomRole=ops')
    expect(opsButton.url).not.toContain('/app/dashboard/zoom')

    await vi.waitFor(() => expect(mockSendTelegramMessage).toHaveBeenCalledTimes(1))
    const userButton = mockSendTelegramMessage.mock.calls[0][3].replyMarkup.inline_keyboard[0][0]
    expect(userButton).toEqual({
      text: 'ВІДКРИТИ КАЛЕНДАР',
      web_app: { url: expect.stringContaining('/miniapp/zoom-calendar') },
    })
    expect(userButton.web_app.url).toContain('zoomRole=user')
  })

  it('does not throw or send a notification when there are no affected users', async () => {
    await expect(afterZoomOperation({} as never, {
      operation: 'cancel',
      sessionId: session.id,
      affectedUserIds: [],
    })).resolves.toBeUndefined()

    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
  })
})
