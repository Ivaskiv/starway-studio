import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTelegramLinkFindFirst = vi.fn()
const mockUserFindFirst = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    telegramLink: {
      findFirst: (...args: unknown[]) => mockTelegramLinkFindFirst(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
  },
}))

vi.mock('../../user/identity.service.js', () => ({
  reconcileTelegramIdentityUsers: vi.fn(),
}))

import { findLinkedUserId } from './linking.service.js'

describe('findLinkedUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTelegramLinkFindFirst.mockResolvedValue(null)
    mockUserFindFirst.mockResolvedValue(null)
  })

  it('returns null without creating a placeholder user when no link or identity exists', async () => {
    const result = await findLinkedUserId({
      chatId: '10029999',
      telegramUserId: '10029999',
      telegramUserName: 'qa_brand_new_start',
    })

    expect(result).toBeNull()
    expect(mockTelegramLinkFindFirst).toHaveBeenCalledTimes(1)
    expect(mockUserFindFirst).toHaveBeenCalledTimes(1)
  })
})
