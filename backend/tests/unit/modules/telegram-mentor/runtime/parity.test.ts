import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockResolveTelegramProductSummary = vi.fn()
const mockReadExpectedTelegramBotUsername = vi.fn(() => 'test_starway_bot')
const mockResolveTelegramDeliveryMode = vi.fn(() => 'polling')

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    productSubscription: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/product/summary.js', () => ({
  resolveTelegramProductSummary: (...args: unknown[]) =>
    mockResolveTelegramProductSummary(...args),
}))

vi.mock('../../../../../src/modules/telegram-mentor/runtime/botConfig.js', () => ({
  readExpectedTelegramBotUsername: () => mockReadExpectedTelegramBotUsername(),
  resolveTelegramDeliveryMode: () => mockResolveTelegramDeliveryMode(),
}))

describe('telegram runtime parity snapshot', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalCommitSha = process.env.COMMIT_SHA
  const originalDatabaseUrl = process.env.DATABASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'development'
    process.env.COMMIT_SHA = 'commit-local-123'
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/starway_prod'
  })

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv

    if (originalCommitSha === undefined) delete process.env.COMMIT_SHA
    else process.env.COMMIT_SHA = originalCommitSha

    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalDatabaseUrl
  })

  it('reads runtime identity, canonical access, and final CTA from existing owners', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:09:53.041Z'),
    })
    mockResolveTelegramProductSummary.mockResolvedValue({
      primary: {
        key: 'FOCUS',
        state: 'trial',
        buttons: [[{
          text: '💬 Продовжити практику',
          web_app: {
            url: 'https://public.example.com/focus',
          },
        }]],
      },
    })
    mockFindMany.mockResolvedValue([
      {
        product: { code: 'trial_zoom' },
        status: 'trial',
        paidAt: new Date('2026-08-23T12:09:53.041Z'),
        expiresAt: null,
        trialEndsAt: new Date('2026-08-30T12:09:53.041Z'),
        createdAt: new Date('2026-08-23T12:09:53.041Z'),
      },
      {
        product: { code: 'focus' },
        status: 'active',
        paidAt: new Date('2026-08-03T16:36:19.737Z'),
        expiresAt: new Date('2026-08-18T00:00:00.000Z'),
        trialEndsAt: null,
        createdAt: new Date('2026-08-03T16:36:19.737Z'),
      },
    ])

    const { buildTelegramRuntimeParitySnapshot } = await import(
      '../../../../../src/modules/telegram-mentor/runtime/parity.js'
    )

    const snapshot = await buildTelegramRuntimeParitySnapshot('user-123')

    expect(mockGetUserAccessState).toHaveBeenCalledWith('user-123')
    expect(mockResolveTelegramProductSummary).toHaveBeenCalledWith('user-123')
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-123',
        }),
      }),
    )
    expect(snapshot).toEqual({
      bot: {
        username: 'test_starway_bot',
        deliveryMode: 'polling',
      },
      runtime: {
        nodeEnv: 'development',
        commitSha: 'commit-local-123',
        db: {
          configured: true,
          host: 'db.example.com',
          name: 'starway_prod',
        },
      },
      user: {
        userId: 'user-123',
        productSubscriptions: [
          {
            productCode: 'trial_zoom',
            status: 'trial',
            paidAt: '2026-08-23T12:09:53.041Z',
            expiresAt: null,
            trialEndsAt: '2026-08-30T12:09:53.041Z',
            createdAt: '2026-08-23T12:09:53.041Z',
          },
          {
            productCode: 'focus',
            status: 'active',
            paidAt: '2026-08-03T16:36:19.737Z',
            expiresAt: '2026-08-18T00:00:00.000Z',
            trialEndsAt: null,
            createdAt: '2026-08-03T16:36:19.737Z',
          },
        ],
        canonicalAccess: {
          state: 'PREMIUM',
          isActive: false,
          hasFocus: false,
          expiresAt: '2026-08-30T12:09:53.041Z',
        },
        finalTelegram: {
          primaryProduct: 'FOCUS',
          primaryState: 'trial',
          cta: {
            text: '💬 Продовжити практику',
            type: 'web_app',
            url: 'https://public.example.com/focus',
          },
        },
      },
    })
  })
})
