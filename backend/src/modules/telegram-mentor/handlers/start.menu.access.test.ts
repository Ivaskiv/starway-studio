import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveLinkedUserIdFromContext = vi.fn()
const mockGetUserAccessState = vi.fn()

vi.mock('@/products/absystem/config/absystem.content.js', () => ({
  absystemContent: {
    START_FLOWS: {},
  },
}))

vi.mock('@/products/stankey/config/stankey.content.js', () => ({
  stankeyContent: {
    telegram: {
      product: {
        continueFromCurrentLesson: vi.fn(() => []),
      },
    },
  },
}))

vi.mock('@/content/telegram.product-context.js', () => ({
  getTelegramProductContext: vi.fn(() => ({ cta: {} })),
}))

vi.mock('../../../core/continuity/behavioralContinuity.js', () => ({
  resolveBehavioralContinuity: vi.fn(),
}))

vi.mock('../../../core/decision/decision.resolver.js', () => ({
  resolveDecision: vi.fn(),
}))

vi.mock('../../../core/flow-builder/flowBuilder.js', () => ({
  buildAbsystemStartFlow: vi.fn(),
}))

vi.mock('../../../core/memory/relationshipMemory.js', () => ({
  resolveRelationshipMemory: vi.fn(),
}))

vi.mock('../../../core/state-machine/conversationPresentation.js', () => ({
  buildRelationshipContinuityLead: vi.fn(() => []),
  resolveConversationProfile: vi.fn(() => 'focus'),
}))

vi.mock('../../../core/transport/telegramTransport.js', () => ({
  deliverTelegramFlow: vi.fn(),
}))

vi.mock('../../../db/client.js', () => ({
  prisma: {
    runtimeOutbox: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../../lib/telegram.js', () => ({
  bot: {
    telegram: {
      setChatMenuButton: vi.fn(),
      setMyCommands: vi.fn(),
    },
  },
}))

vi.mock('../../events/service.js', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../core/state.service.js', () => ({
  isExplicitWaitlistUser: vi.fn(() => false),
  resolveLinkedUserIdFromContext: (...args: unknown[]) =>
    mockResolveLinkedUserIdFromContext(...args),
  resolveUserState: vi.fn(),
}))

vi.mock('../flows/onboarding.flow.js', () => ({
  sendWaitlist: vi.fn(),
}))

vi.mock('../keyboards.js', () => ({
  getTelegramAppUrl: vi.fn(() => 'https://example.com/miniapp'),
  openAppKeyboard: vi.fn(() => ({
    reply_markup: {
      inline_keyboard: [[{ text: 'Starway', web_app: { url: 'https://example.com/miniapp?startapp=ai' } }]],
    },
  })),
  withDevTestPaymentButton: vi.fn((buttons) => buttons),
}))

vi.mock('../renderers/decisionTelegram.js', () => ({
  renderTelegramDecision: vi.fn(),
}))

vi.mock('../services/product-room.service.js', () => ({
  resolveTelegramAccessOrchestration: vi.fn(),
  resolveTelegramRoomLaunch: vi.fn(),
}))

vi.mock('../services/productSummary.service.js', () => ({
  resolveTelegramProductSummary: vi.fn(),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: vi.fn(),
}))

vi.mock('../conversation/delivery/planDelivery.js', () => ({
  planMessage: vi.fn(),
}))

vi.mock('./start.shared.js', () => ({
  resolveReferralButton: vi.fn(() => null),
}))

vi.mock('./start.recovery.js', () => ({
  resolveStartScenario: vi.fn(),
}))

import { getAccessAwareAppReplyMarkupForContext } from './start.menu.js'

describe('getAccessAwareAppReplyMarkupForContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveLinkedUserIdFromContext.mockResolvedValue('user-1')
  })

  it('does not expose platform entry when canonical access is NO_ACCESS', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    const result = await getAccessAwareAppReplyMarkupForContext({} as never)

    expect(result).toBeUndefined()
    expect(mockGetUserAccessState).toHaveBeenCalledWith('user-1')
  })

  it('exposes platform entry when canonical access is active', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-19T00:00:00Z'),
    })

    const result = await getAccessAwareAppReplyMarkupForContext({} as never)

    expect(result).toEqual({
      inline_keyboard: [[{ text: 'Starway', web_app: { url: 'https://example.com/miniapp?startapp=ai' } }]],
    })
  })
})
