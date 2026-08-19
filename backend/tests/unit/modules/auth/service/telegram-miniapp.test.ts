import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyTelegramInitDataMock = vi.fn()
const findLinkedUserIdMock = vi.fn()

const prismaMock = {
  user: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
  },
  userProgress: {
    findUnique: vi.fn(),
  },
  mentorConfig: {
    findUnique: vi.fn(),
  },
  notificationPreference: {
    findUnique: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
}

vi.mock('../../../../../db/client.ts', () => ({
  prisma: prismaMock,
}))

vi.mock('../../../../../lib/cache/index.ts', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../telegram.ts', () => ({
  verifyTelegramInitData: verifyTelegramInitDataMock,
}))

vi.mock('../../../../telegram-mentor/services/linking.service.ts', () => ({
  findLinkedUserId: findLinkedUserIdMock,
}))

describe('telegramMiniAppLoginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_ACCESS_SECRET = 'test-access-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    process.env.JWT_EXPIRES_IN = '15m'
    process.env.JWT_REFRESH_EXPIRES_IN = '30d'

    prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }])
    prismaMock.user.update.mockResolvedValue({ id: 'canonical-user-id' })
    prismaMock.subscription.findFirst.mockResolvedValue(null)
    prismaMock.userProgress.findUnique.mockResolvedValue(null)
    prismaMock.mentorConfig.findUnique.mockResolvedValue(null)
    prismaMock.notificationPreference.findUnique.mockResolvedValue(null)
    prismaMock.refreshToken.create.mockImplementation(async ({ data }) => data)
  })

  it('reuses canonical linked user session before telegram social fallback', async () => {
    verifyTelegramInitDataMock.mockReturnValue({
      id: '630111093',
      firstName: 'Vira',
      username: 'vira_333',
    })
    findLinkedUserIdMock.mockResolvedValue('canonical-user-id')

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'canonical-user-id',
        email: 'vira@example.com',
        phone: null,
        firstName: 'Vira',
        lastName: null,
        expertId: null,
        role: 'USER',
        activeRole: 'USER',
        passwordHash: null,
        telegramUserId: '630111093',
        telegramUserName: 'vira_333',
        telegramChatId: '630111093',
        telegramEnabled: true,
        lastLoginAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        settings: null,
      })
      .mockResolvedValueOnce({
        id: 'canonical-user-id',
        email: 'vira@example.com',
        phone: null,
        firstName: 'Vira',
        lastName: null,
        expertId: null,
        role: 'USER',
        activeRole: 'USER',
        passwordHash: null,
        telegramUserId: '630111093',
        telegramUserName: 'vira_333',
        telegramChatId: '630111093',
        telegramEnabled: true,
        lastLoginAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        settings: null,
      })

    const { telegramMiniAppLoginUser } = await import('../index.ts')
    const result = await telegramMiniAppLoginUser('signed-init-data', 'req-1')

    expect(findLinkedUserIdMock).toHaveBeenCalledWith({
      chatId: '630111093',
      telegramUserId: '630111093',
      telegramUserName: 'vira_333',
    })
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      user: {
        id: 'canonical-user-id',
        email: 'vira@example.com',
        firstName: 'Vira',
      },
      needsCompletion: false,
      isNewUser: false,
      needsProfile: false,
    })
  })
})
