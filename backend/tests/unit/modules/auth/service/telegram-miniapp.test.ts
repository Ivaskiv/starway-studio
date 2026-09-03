import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyTelegramInitDataMock = vi.fn()
const findLinkedUserIdMock = vi.fn()
const createSessionForUserIdMock = vi.fn()

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

vi.mock('../../../../../src/modules/auth/telegram.ts', () => ({
  verifyTelegramInitData: verifyTelegramInitDataMock,
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/identity/linking.ts', () => ({
  findLinkedUserId: findLinkedUserIdMock,
}))

vi.mock('../../../../../src/modules/auth/service/credentials.ts', () => ({
  createSessionForUserId: createSessionForUserIdMock,
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
    createSessionForUserIdMock.mockResolvedValue({
      user: {
        id: 'canonical-user-id',
        email: 'vira@example.com',
        firstName: 'Vira',
        role: 'USER',
        activeRole: 'USER',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      needsProfile: false,
      expiresIn: 900,
    })
  })

  it('reuses canonical linked user session before telegram social fallback', async () => {
    verifyTelegramInitDataMock.mockReturnValue({
      id: '630111093',
      firstName: 'Vira',
      username: 'vira_333',
    })
    findLinkedUserIdMock.mockResolvedValue('canonical-user-id')

    const { telegramMiniAppLoginUser } = await import('../../../../../src/modules/auth/service/social.ts')
    const result = await telegramMiniAppLoginUser('signed-init-data', 'req-1')

    expect(findLinkedUserIdMock).toHaveBeenCalledWith({
      chatId: '630111093',
      telegramUserId: '630111093',
      telegramUserName: 'vira_333',
    })
    expect(createSessionForUserIdMock).toHaveBeenCalledWith('canonical-user-id')
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

  it('keeps the privileged canonical user id and role in session for linked telegram staff', async () => {
    verifyTelegramInitDataMock.mockReturnValue({
      id: '630111093',
      firstName: 'Vira',
      username: 'vira_333',
    })
    findLinkedUserIdMock.mockResolvedValue('canonical-admin-id')
    createSessionForUserIdMock.mockResolvedValue({
      user: {
        id: 'canonical-admin-id',
        email: 'vira.admin@example.com',
        firstName: 'Vira',
        role: 'ADMIN',
        activeRole: 'ADMIN',
      },
      accessToken: 'admin-access-token',
      refreshToken: 'admin-refresh-token',
      needsProfile: false,
      expiresIn: 900,
    })

    const { telegramMiniAppLoginUser } = await import('../../../../../src/modules/auth/service/social.ts')
    const result = await telegramMiniAppLoginUser('signed-init-data', 'req-2')

    expect(findLinkedUserIdMock).toHaveBeenCalledWith({
      chatId: '630111093',
      telegramUserId: '630111093',
      telegramUserName: 'vira_333',
    })
    expect(createSessionForUserIdMock).toHaveBeenCalledWith('canonical-admin-id')
    expect(result.user).toMatchObject({
      id: 'canonical-admin-id',
      role: 'ADMIN',
      activeRole: 'ADMIN',
    })
  })
})
