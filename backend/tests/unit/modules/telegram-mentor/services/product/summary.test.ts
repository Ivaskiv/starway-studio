import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockSubscriptionFindMany = vi.fn()
const mockPurchaseHistoryFindMany = vi.fn()
const mockResolveStankeyProgressSnapshot = vi.fn()
const mockResolveUserLifecycle = vi.fn()
const mockResolveCentralLifecycleSnapshot = vi.fn()
const mockResolveTelegramProductRoom = vi.fn()
const mockGetMediaById = vi.fn()
const mockGetNextLesson = vi.fn()
const mockGetUserAccessState = vi.fn()
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

vi.mock('../../../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    subscription: {
      findMany: (...args: unknown[]) => mockSubscriptionFindMany(...args),
    },
    purchaseHistory: {
      findMany: (...args: unknown[]) => mockPurchaseHistoryFindMany(...args),
    },
  },
}))

vi.mock('../../../../../../src/products/stankey/media/catalog.js', () => ({
  getMediaById: (...args: unknown[]) => mockGetMediaById(...args),
  getNextLesson: (...args: unknown[]) => mockGetNextLesson(...args),
}))

vi.mock('../../../../../../src/products/stankey/progress.service.js', () => ({
  resolveStankeyProgressSnapshot: (...args: unknown[]) => mockResolveStankeyProgressSnapshot(...args),
}))

vi.mock('../../../../../../src/modules/flow-control/service.js', () => ({
  resolveUserLifecycle: (...args: unknown[]) => mockResolveUserLifecycle(...args),
}))

vi.mock('../../../../../../src/modules/lifecycle/service.js', () => ({
  resolveCentralLifecycleSnapshot: (...args: unknown[]) => mockResolveCentralLifecycleSnapshot(...args),
}))

vi.mock('../../../../../../src/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../../../src/modules/telegram-mentor/services/product/room.ts', () => ({
  resolveTelegramProductRoom: (...args: unknown[]) => mockResolveTelegramProductRoom(...args),
}))

vi.mock('../../../keyboards.ts', () => ({
  getTelegramAppUrl: vi.fn((path: string) => `https://app.starway.test${path}`),
  withDevTestPaymentButton: vi.fn((rows: unknown) => rows),
}))

vi.mock('@starway/shared/platform.registry', () => ({
  getPlatformProductManifest: vi.fn((productId: string) => ({
    slug: productId,
    productId,
    name: productId === 'focus' ? 'FOCUS' : productId === 'stankey' ? 'Практикум' : productId,
  })),
  getPlatformProductConfig: vi.fn((productId: string) => ({
    paymentUrl: `https://pay.starway.test/${productId}`,
  })),
}))

import { resolveTelegramProductSummary } from '../../../../../../src/modules/telegram-mentor/services/product/summary.ts'

describe('productSummary.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUserFindUnique.mockResolvedValue({
      currentStep: null,
      onboardingStartedAt: null,
      productAccesses: [],
    })
    mockSubscriptionFindMany.mockResolvedValue([
      {
        productId: 'product-uuid-focus',
        product: { code: 'focus' },
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: new Date('2026-11-15T15:26:04.539Z'),
        planCode: '1month',
        createdAt: new Date('2026-07-26T06:13:35.458Z'),
      },
    ])
    mockPurchaseHistoryFindMany.mockResolvedValue([])
    mockResolveStankeyProgressSnapshot.mockResolvedValue({
      streak: 0,
      completedLessons: 0,
      currentLesson: 'lesson-1',
      currentStep: null,
      lastActivityAt: null,
      paymentStatus: 'paid',
    })
    mockResolveUserLifecycle.mockResolvedValue({})
    mockResolveCentralLifecycleSnapshot.mockResolvedValue({
      roomState: 'active',
      state: 'paid',
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })
    mockResolveTelegramProductRoom.mockImplementation((input: Record<string, unknown>) => ({
      state: input.canonicalState ?? input.state,
      selectedFlow: 'default',
      roomId: `room:${String(input.title)}`,
      accessSource: 'payment',
      mentorMode: 'standard',
      activationState: 'active',
      progressState: { currentLesson: null },
      reminderState: { eligible: false, streak: false },
      gamificationState: {},
      behaviorPolicy: { primaryCta: 'continue' },
      behaviorState: 'active',
      upsellState: {},
      retentionState: {},
      paymentUrl: input.paymentUrl ?? null,
      openUrl: input.openUrl ?? null,
      progressUrl: input.progressUrl ?? null,
      buttons: [],
    }))
    mockGetMediaById.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    mockGetNextLesson.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
  })

  it('does not crash for a Focus user when Stankey catalog is missing and still resolves Focus subscription by product code', async () => {
    const result = await resolveTelegramProductSummary('user-focus')

    expect(result.allProducts.some((product) => product.key === 'FOCUS')).toBe(true)
    expect(result.inactiveProducts).toContain('FOCUS')
    expect(warnSpy).toHaveBeenCalledWith(
      '[TELEGRAM_PRODUCT_SUMMARY] stankey_catalog_unavailable',
      expect.objectContaining({
        operation: 'getMediaById',
        mediaId: 'lesson-1',
      }),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[TELEGRAM_PRODUCT_SUMMARY] stankey_catalog_unavailable',
      expect.objectContaining({
        operation: 'getNextLesson',
        mediaId: 'lesson-1',
      }),
    )
  })

  it('passes canonical focus room state from getUserAccessState instead of legacy subscription rows', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockResolveCentralLifecycleSnapshot.mockResolvedValue({
      roomState: 'inactive',
      state: 'guest',
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:00:00.000Z'),
    })

    const result = await resolveTelegramProductSummary('user-focus')

    expect(result.allProducts.some((product) => product.key === 'FOCUS' && product.state === 'trial')).toBe(true)
    expect(mockResolveTelegramProductRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'focus',
        canonicalState: 'trial',
      }),
    )
  })
})
