import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyTelegramInitDataMock = vi.fn()
const findLinkedUserIdMock = vi.fn()
const createSessionForUserIdMock = vi.fn()
const resolveTelegramSocialUserMock = vi.fn()

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

vi.mock('../../../../../src/modules/auth/service/shared.ts', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../../src/modules/auth/service/shared.ts')>(),
  resolveTelegramSocialUser: resolveTelegramSocialUserMock,
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
      botContext: null,
    })
    findLinkedUserIdMock.mockResolvedValue('canonical-user-id')

    const { telegramMiniAppLoginUser } = await import('../../../../../src/modules/auth/service/social.ts')
    const result = await telegramMiniAppLoginUser('signed-init-data', 'req-1')

    expect(findLinkedUserIdMock).toHaveBeenCalledWith({
      chatId: '630111093',
      telegramUserId: '630111093',
      telegramUserName: 'vira_333',
    })
    expect(createSessionForUserIdMock).toHaveBeenCalledWith('canonical-user-id', null)
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

  it.each(['USER', 'COACH'] as const)('passes verified %s context to the canonical session owner', async (botContext) => {
    verifyTelegramInitDataMock.mockReturnValue({ id: '630111093', username: 'vira_333', botContext })
    findLinkedUserIdMock.mockResolvedValue('canonical-user-id')
    const { telegramMiniAppLoginUser } = await import('../../../../../src/modules/auth/service/social.ts')

    await telegramMiniAppLoginUser('signed-init-data')

    expect(createSessionForUserIdMock).toHaveBeenCalledExactlyOnceWith('canonical-user-id', botContext)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it.each(['USER', 'COACH'] as const)('preserves verified %s context through the existing identity fallback', async (botContext) => {
    verifyTelegramInitDataMock.mockReturnValue({ id: '630111093', username: 'vira_333', botContext })
    findLinkedUserIdMock.mockResolvedValue(null)
    resolveTelegramSocialUserMock.mockResolvedValue({ id: 'canonical-user-id', created: false, expertId: null })
    const { telegramMiniAppLoginUser } = await import('../../../../../src/modules/auth/service/social.ts')

    const result = await telegramMiniAppLoginUser('signed-init-data')

    expect(resolveTelegramSocialUserMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      provider: 'telegram', externalId: '630111093',
    }))
    expect(createSessionForUserIdMock).toHaveBeenCalledExactlyOnceWith('canonical-user-id', botContext)
    expect(result.isNewUser).toBe(false)
  })

  it('keeps the privileged canonical user id and role in session for linked telegram staff', async () => {
    verifyTelegramInitDataMock.mockReturnValue({
      id: '630111093',
      firstName: 'Vira',
      username: 'vira_333',
      botContext: null,
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
    expect(createSessionForUserIdMock).toHaveBeenCalledWith('canonical-admin-id', null)
    expect(result.user).toMatchObject({
      id: 'canonical-admin-id',
      role: 'ADMIN',
      activeRole: 'ADMIN',
    })
  })
})
