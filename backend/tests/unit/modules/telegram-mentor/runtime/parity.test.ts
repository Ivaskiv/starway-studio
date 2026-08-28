import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockCheckoutFindFirst = vi.fn()
const mockPaymentLogFindFirst = vi.fn()
const mockZoomAttendeeCount = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockResolveTelegramProductSummary = vi.fn()
const mockBuildPlainStartPreview = vi.fn()
const mockResolveEffectiveStartLifecycleState = vi.fn()
const mockLoadAbTestProgress = vi.fn()
const mockGetUpcomingZoomBookingView = vi.fn()
const mockSyncUserTestState = vi.fn()
const mockReadExpectedTelegramBotUsername = vi.fn(() => 'test_starway_bot')
const mockResolveTelegramDeliveryMode = vi.fn(() => 'polling')

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    productSubscription: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    checkoutSession: {
      findFirst: (...args: unknown[]) => mockCheckoutFindFirst(...args),
    },
    paymentLog: {
      findFirst: (...args: unknown[]) => mockPaymentLogFindFirst(...args),
    },
    zoomSessionAttendee: {
      count: (...args: unknown[]) => mockZoomAttendeeCount(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../../src/modules/zoom/service.js', () => ({
  getUpcomingZoomBookingView: (...args: unknown[]) => mockGetUpcomingZoomBookingView(...args),
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/product/summary.js', () => ({
  resolveTelegramProductSummary: (...args: unknown[]) =>
    mockResolveTelegramProductSummary(...args),
}))

vi.mock('../../../../../src/modules/telegram-mentor/handlers/start.js', () => ({
  buildPlainStartPreview: (...args: unknown[]) => mockBuildPlainStartPreview(...args),
  resolveEffectiveStartLifecycleState: (...args: unknown[]) =>
    mockResolveEffectiveStartLifecycleState(...args),
}))

vi.mock('../../../../../src/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
}))

vi.mock('../../../../../src/scripts/user-sync-test-state.js', () => ({
  syncUserTestState: (...args: unknown[]) => mockSyncUserTestState(...args),
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
    mockResolveEffectiveStartLifecycleState.mockReturnValue('PREMIUM')
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
    mockBuildPlainStartPreview.mockResolvedValue({
      branch: 'completed_result_replay',
      text: 'Тестовий parity payload',
      buttons: [[{
        text: 'ОБРАТИ ФОРМАТ У ФОКУСІ',
        callback_data: 'open_focus_payment',
      }]],
      parseMode: 'HTML',
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
          startPreview: {
            branch: 'completed_result_replay',
            text: 'Тестовий parity payload',
            buttons: [[{
              text: 'ОБРАТИ ФОРМАТ У ФОКУСІ',
              type: 'callback',
              value: 'open_focus_payment',
            }]],
          },
        },
      },
    })
  })

  it('builds a read-only debug snapshot from canonical access and booking owners without leaking secrets', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-123',
      email: 'debug@example.com',
      firstName: 'Віра',
      telegramChatId: '630111093',
      telegramUserId: '630111093',
      lifecycleState: 'FOCUS_PAID',
      testResultType: 'state',
      testCompletedAt: new Date('2026-08-20T10:00:00.000Z'),
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:09:53.041Z'),
    })
    mockBuildPlainStartPreview.mockResolvedValue({
      branch: 'home_screen',
      text: 'Віра\n\nТобі доступний один пробний Zoom за 1 грн.\n\n<b>Наступний крок:</b> відкрий запис.',
      buttons: [[{
        text: 'ПЕРЕГЛЯНУТИ ЗАПИС',
        web_app: {
          url: 'https://public.example.com/zoom-calendar',
        },
      }]],
      parseMode: 'HTML',
    })
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      stage: 'result',
      result_key: 'state',
      current_question_id: 'Q8',
      email_stage: 'captured',
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
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'session-1',
      scheduledAt: new Date('2026-08-24T12:02:00.000Z'),
      status: 'SCHEDULED',
      isMyBooking: true,
      attendeesCount: 7,
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
        status: 'expired',
        paidAt: null,
        expiresAt: new Date('2026-08-18T00:00:00.000Z'),
        trialEndsAt: null,
        createdAt: new Date('2026-08-03T16:36:19.737Z'),
      },
    ])
    mockZoomAttendeeCount
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
    mockCheckoutFindFirst.mockResolvedValue({
      status: 'OPENED',
      amount: 1,
      currency: 'UAH',
      productCode: 'trial_zoom',
      orderReference: 'trial_zoom_user-123_1',
      createdAt: new Date('2026-08-23T12:00:00.000Z'),
      completedAt: null,
    })
    mockPaymentLogFindFirst.mockResolvedValue({
      status: 'SUCCESS',
      orderReference: 'trial_zoom_user-123_1',
      amountCents: 100,
      processedAt: new Date('2026-08-23T12:05:00.000Z'),
      createdAt: new Date('2026-08-23T12:05:00.000Z'),
    })

    const { buildTelegramDebugStateMessages } = await import(
      '../../../../../src/modules/telegram-mentor/runtime/parity.js'
    )

    const chunks = await buildTelegramDebugStateMessages('user-123')

    expect(mockGetUserAccessState).toHaveBeenCalledWith('user-123')
    expect(mockGetUpcomingZoomBookingView).toHaveBeenCalledWith('user-123')
    expect(mockLoadAbTestProgress).toHaveBeenCalledWith('user-123')
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks.join('\n')).toContain('state: <code>PREMIUM</code>')
    expect(chunks.join('\n')).toContain('booked: <code>YES</code>')
    expect(chunks.join('\n')).toContain('branch: <code>home_screen</code>')
    expect(chunks.join('\n')).toContain('primaryCTA: <code>ПЕРЕГЛЯНУТИ ЗАПИС</code>')
    expect(chunks.join('\n')).toContain('product: <code>trial_zoom</code>')
    expect(chunks.join('\n')).not.toContain('postgresql://')
    expect(chunks.join('\n')).not.toContain('pooler.supabase.com')
    expect(chunks.join('\n')).not.toContain('signature:')
    expect(chunks.join('\n')).not.toContain('secret:')
    expect(chunks.join('\n')).not.toContain('AAG')
  })
})
