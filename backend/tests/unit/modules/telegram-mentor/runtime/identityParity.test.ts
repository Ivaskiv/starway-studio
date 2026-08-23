import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindLinkedUserId = vi.fn()
const mockReconcileTelegramIdentityUsers = vi.fn()
const mockTelegramLinkFindFirst = vi.fn()
const mockUserFindMany = vi.fn()

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    telegramLink: {
      findFirst: (...args: unknown[]) => mockTelegramLinkFindFirst(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/identity/linking.js', () => ({
  findLinkedUserId: (...args: unknown[]) => mockFindLinkedUserId(...args),
}))

vi.mock('../../../../../src/modules/user/identity/service.js', () => ({
  reconcileTelegramIdentityUsers: (...args: unknown[]) =>
    mockReconcileTelegramIdentityUsers(...args),
}))

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response
}

describe('telegram identity parity runtime owner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns aligned single-user snapshot in dry-run mode', async () => {
    mockTelegramLinkFindFirst.mockResolvedValue({
      id: 'link-1',
      userId: 'user-1',
      isActive: true,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    })
    mockUserFindMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        telegramUserId: '630111093',
        telegramChatId: '630111093',
        telegramUserName: 'vira_333',
        telegramLinkedAt: new Date('2026-08-20T09:59:00.000Z'),
        createdAt: new Date('2026-08-20T09:58:00.000Z'),
        deletedAt: null,
        productSubscriptions: [],
        telegramLinks: [
          {
            id: 'link-1',
            chatId: '630111093',
            userId: 'user-1',
            isActive: true,
            createdAt: new Date('2026-08-20T10:00:00.000Z'),
          },
        ],
      },
    ])
    mockFindLinkedUserId.mockResolvedValue('user-1')

    const { getTelegramIdentityParityHandler } = await import(
      '../../../../../src/modules/telegram-mentor/runtime/identityParity.js'
    )

    const response = createResponseMock()
    await getTelegramIdentityParityHandler(
      {
        query: {},
        headers: { 'x-telegram-chat-id': '630111093' },
      } as any,
      response as any,
    )

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: '630111093',
        resolvedUserId: 'user-1',
        type: 'aligned_single_user',
        repair: expect.objectContaining({
          supported: false,
          action: 'none',
          dryRun: true,
        }),
      }),
    )
  })

  it('requires exact confirmation before apply repair and uses canonical reconcile owner', async () => {
    mockTelegramLinkFindFirst.mockResolvedValue({
      id: 'link-1',
      userId: 'linked-user',
      isActive: true,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    })
    mockUserFindMany
      .mockResolvedValueOnce([
        {
          id: 'identity-user',
          email: 'identity@example.com',
          telegramUserId: '630111093',
          telegramChatId: null,
          telegramUserName: null,
          telegramLinkedAt: new Date('2026-08-20T09:59:00.000Z'),
          createdAt: new Date('2026-08-20T09:58:00.000Z'),
          deletedAt: null,
          productSubscriptions: [],
          telegramLinks: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'identity-user',
          email: 'identity@example.com',
          telegramUserId: '630111093',
          telegramChatId: null,
          telegramUserName: null,
          telegramLinkedAt: new Date('2026-08-20T09:59:00.000Z'),
          createdAt: new Date('2026-08-20T09:58:00.000Z'),
          deletedAt: null,
          productSubscriptions: [],
          telegramLinks: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'linked-user',
          email: 'linked@example.com',
          telegramUserId: '630111093',
          telegramChatId: '630111093',
          telegramUserName: null,
          telegramLinkedAt: new Date('2026-08-20T09:59:00.000Z'),
          createdAt: new Date('2026-08-20T09:58:00.000Z'),
          deletedAt: null,
          productSubscriptions: [],
          telegramLinks: [
            {
              id: 'link-1',
              chatId: '630111093',
              userId: 'linked-user',
              isActive: true,
              createdAt: new Date('2026-08-20T10:00:00.000Z'),
            },
          ],
        },
      ])
    mockFindLinkedUserId
      .mockResolvedValueOnce('linked-user')
      .mockResolvedValueOnce('linked-user')
      .mockResolvedValueOnce('linked-user')
    mockReconcileTelegramIdentityUsers.mockResolvedValue({
      userId: 'linked-user',
      merged: true,
    })

    const { postTelegramIdentityRepairHandler } = await import(
      '../../../../../src/modules/telegram-mentor/runtime/identityParity.js'
    )

    const mismatchResponse = createResponseMock()
    await postTelegramIdentityRepairHandler(
      {
        query: {},
        headers: { 'x-telegram-chat-id': '630111093' },
        body: {
          apply: true,
          confirmReason: 'telegram_identity_repair',
          confirmChatId: '630111093',
          confirmLinkedUserId: 'wrong-linked-user',
          confirmIdentityUserId: 'identity-user',
        },
      } as any,
      mismatchResponse as any,
    )

    expect(mismatchResponse.status).toHaveBeenCalledWith(400)
    expect(mockReconcileTelegramIdentityUsers).not.toHaveBeenCalled()

    const applyResponse = createResponseMock()
    await postTelegramIdentityRepairHandler(
      {
        query: {},
        headers: { 'x-telegram-chat-id': '630111093' },
        body: {
          apply: true,
          confirmReason: 'telegram_identity_repair',
          confirmChatId: '630111093',
          confirmLinkedUserId: 'linked-user',
          confirmIdentityUserId: 'identity-user',
        },
      } as any,
      applyResponse as any,
    )

    expect(mockReconcileTelegramIdentityUsers).toHaveBeenCalledWith({
      linkedUserId: 'linked-user',
      identityUserId: 'identity-user',
      reason: 'start_reconcile',
    })
    expect(applyResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: true,
        repairResult: {
          userId: 'linked-user',
          merged: true,
        },
      }),
    )
  })
})
