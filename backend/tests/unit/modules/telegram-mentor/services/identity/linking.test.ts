import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTelegramLinkFindFirst = vi.fn()
const mockUserFindMany = vi.fn()

vi.mock('../../../../../db/client.ts', () => ({
  prisma: {
    telegramLink: {
      findFirst: (...args: unknown[]) => mockTelegramLinkFindFirst(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}))

vi.mock('../../../../user/identity/service.js', () => ({
  reconcileTelegramIdentityUsers: vi.fn(),
}))

import { findLinkedUserId } from '../linking.ts'

describe('findLinkedUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTelegramLinkFindFirst.mockResolvedValue(null)
    mockUserFindMany.mockResolvedValue([])
  })

  it('returns null without creating a placeholder user when no link or identity exists', async () => {
    const result = await findLinkedUserId({
      chatId: '10029999',
      telegramUserId: '10029999',
      telegramUserName: 'qa_brand_new_start',
    })

    expect(result).toBeNull()
    expect(mockTelegramLinkFindFirst).toHaveBeenCalledTimes(1)
    expect(mockUserFindMany).toHaveBeenCalledTimes(1)
  })

  it('prefers the candidate with active Focus access when duplicate telegram identities exist', async () => {
    mockUserFindMany.mockResolvedValue([
      {
        id: 'stale-no-access-user',
        telegramUserId: null,
        telegramUserName: null,
        telegramChatId: '10029999',
        telegramLinkedAt: new Date('2026-07-01T09:00:00.000Z'),
        createdAt: new Date('2026-07-01T09:00:00.000Z'),
        productSubscriptions: [],
      },
      {
        id: 'canonical-focus-user',
        telegramUserId: '10029999',
        telegramUserName: 'qa_brand_new_start',
        telegramChatId: '10029999',
        telegramLinkedAt: new Date('2026-07-15T09:00:00.000Z'),
        createdAt: new Date('2026-07-15T09:00:00.000Z'),
        productSubscriptions: [
          {
            status: 'active',
            paidAt: new Date('2026-07-15T10:00:00.000Z'),
            expiresAt: new Date('2026-08-15T10:00:00.000Z'),
            trialEndsAt: null,
            createdAt: new Date('2026-07-15T10:00:00.000Z'),
          },
        ],
      },
    ])

    const result = await findLinkedUserId({
      chatId: '10029999',
      telegramUserId: '10029999',
      telegramUserName: 'qa_brand_new_start',
    })

    expect(result).toBe('canonical-focus-user')
  })
})
