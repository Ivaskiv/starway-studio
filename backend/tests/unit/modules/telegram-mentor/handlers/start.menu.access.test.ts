import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveLinkedUserIdFromContext = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockSetChatMenuButton = vi.fn()
const mockSetMyCommands = vi.fn()

vi.mock('@/products/absystem/config/content.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/products/absystem/config/content.js')>()
  return {
    ...actual,
    absystemContent: {
      ...actual.absystemContent,
      START_FLOWS: {},
    },
  }
})

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

vi.mock('../../../../../src/core/continuity/behavioralContinuity.ts', () => ({
  resolveBehavioralContinuity: vi.fn(),
}))

vi.mock('../../../../../src/core/decision/decision.resolver.ts', () => ({
  resolveDecision: vi.fn(),
}))

vi.mock('../../../../../src/core/flow-builder/flowBuilder.ts', () => ({
  buildAbsystemStartFlow: vi.fn(),
}))

vi.mock('../../../../../src/core/memory/relationshipMemory.ts', () => ({
  resolveRelationshipMemory: vi.fn(),
}))

vi.mock('../../../../../src/core/state-machine/conversationPresentation.ts', () => ({
  buildRelationshipContinuityLead: vi.fn(() => []),
  resolveConversationProfile: vi.fn(() => 'focus'),
}))

vi.mock('../../../../../src/core/transport/telegramTransport.ts', () => ({
  deliverTelegramFlow: vi.fn(),
}))

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    runtimeOutbox: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../../../../src/lib/telegram.ts', () => ({
  bot: {
    telegram: {
      setChatMenuButton: (...args: unknown[]) => mockSetChatMenuButton(...args),
      setMyCommands: (...args: unknown[]) => mockSetMyCommands(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar'),
}))

vi.mock('../../../../../src/modules/events/service.ts', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../../../../src/modules/subscriptions/payments/focus-access.ts', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('../../../../../src/modules/telegram-mentor/core/state.service.ts', () => ({
  isExplicitWaitlistUser: vi.fn(() => false),
  resolveLinkedUserIdFromContext: (...args: unknown[]) =>
    mockResolveLinkedUserIdFromContext(...args),
  resolveUserState: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/flows/onboarding.flow.ts', () => ({
  sendWaitlist: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/keyboards.ts', () => ({
  getTelegramAppUrl: vi.fn(() => 'https://example.com/miniapp'),
  openAppKeyboard: vi.fn(() => ({
    reply_markup: {
      inline_keyboard: [[{ text: 'Starway', web_app: { url: 'https://example.com/miniapp?startapp=ai' } }]],
    },
  })),
  withDevTestPaymentButton: vi.fn((buttons) => buttons),
}))

vi.mock('../../../../../src/modules/telegram-mentor/renderers/decisionTelegram.ts', () => ({
  renderTelegramDecision: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/product/room.ts', () => ({
  resolveTelegramAccessOrchestration: vi.fn(),
  resolveTelegramRoomLaunch: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/services/product/summary.ts', () => ({
  resolveTelegramProductSummary: vi.fn(),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/conversation/delivery/planDelivery.ts', () => ({
  planMessage: vi.fn(),
}))

vi.mock('../../../../../src/modules/telegram-mentor/handlers/start.shared.ts', () => ({
  resolveReferralButton: vi.fn(() => null),
}))

vi.mock('../../../../../src/modules/telegram-mentor/handlers/start.recovery.ts', () => ({
  resolveStartScenario: vi.fn(),
}))

import {
  getAccessAwareAppReplyMarkupForContext,
  syncAccessAwareChatEntryPoints,
} from '../../../../../src/modules/telegram-mentor/handlers/start.menu.ts'

describe('getAccessAwareAppReplyMarkupForContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveLinkedUserIdFromContext.mockResolvedValue('user-1')
    mockSetChatMenuButton.mockResolvedValue(undefined)
    mockSetMyCommands.mockResolvedValue(undefined)
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

describe('syncAccessAwareChatEntryPoints', () => {
  it('does not override the bot-level Zoom Calendar menu for any USER state', async () => {
    await syncAccessAwareChatEntryPoints('12345', 'user-requested')
    await syncAccessAwareChatEntryPoints('12345', 'user-paid')

    expect(mockSetChatMenuButton).not.toHaveBeenCalled()
    expect(mockSetMyCommands).toHaveBeenCalledTimes(2)
  })
})
