import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUniqueOrThrow = vi.fn()
const mockUserUpdate = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}))

const mockResolveLinkedUserId = vi.fn()
const mockGetStartPayload = vi.fn()
const mockParseFirstTouchPayload = vi.fn()
const mockSyncAccessAwareChatEntryPoints = vi.fn()

vi.mock('./start.shared.js', () => ({
  getStartPayload: (...args: unknown[]) => mockGetStartPayload(...args),
  parseFirstTouchPayload: (...args: unknown[]) => mockParseFirstTouchPayload(...args),
  resolveLinkedUserIdFromContext: (...args: unknown[]) => mockResolveLinkedUserId(...args),
  syncAccessAwareChatEntryPoints: (...args: unknown[]) => mockSyncAccessAwareChatEntryPoints(...args),
}))

vi.mock('../services/productSummary.service.js', () => ({
  resolveTelegramProductSummary: vi.fn().mockResolvedValue(null),
}))

const mockSetPendingName = vi.fn()
vi.mock('../services/pendingIdentity.service.js', () => ({
  clearPendingTelegramIdentity: vi.fn(),
  getPendingTelegramIdentity: vi.fn(),
  isValidEmail: vi.fn(),
  setPendingTelegramIdentity: vi.fn(),
  setPendingName: (...args: unknown[]) => mockSetPendingName(...args),
  hasPendingName: vi.fn().mockResolvedValue(false),
  clearPendingName: vi.fn(),
}))

vi.mock('../../deeplinks/service.js', () => ({
  generateMagicLink: vi.fn().mockResolvedValue('https://example.com/magic'),
}))

vi.mock('../conversation/delivery/planDelivery.js', () => ({
  planMessage: vi.fn(),
}))

vi.mock('../../user/resolveOrCreateUser.js', () => ({
  resolveOrCreateUser: vi.fn(),
}))

vi.mock('../services/linking.service.js', () => ({
  upsertTelegramBinding: vi.fn(),
}))

vi.mock('@/products/ab-system/telegram/abTest.service.js', () => ({
  handleAbTestEmailCaptureText: vi.fn(),
}))

import { resolveTelegramProductSummary } from '../services/productSummary.service.js'
import { handleStart } from './start.js'

function makeFakeCtx(overrides: Partial<{
  chatId: number
  fromId: number
  username: string
  firstName: string | undefined
  updateId: number
}> = {}) {
  const reply = vi.fn().mockResolvedValue({ message_id: 1 })
  const sendMessage = vi.fn().mockResolvedValue({ message_id: 2 })

  const ctx = {
    chat: { id: overrides.chatId ?? 111 },
    from: {
      id: overrides.fromId ?? 111,
      username: overrides.username ?? 'test_user',
      first_name: overrides.firstName ?? 'Тестова',
    },
    update: { update_id: overrides.updateId ?? Math.floor(Math.random() * 1_000_000) + 1 },
    state: {},
    reply,
    telegram: { sendMessage },
  }

  return { ctx: ctx as never, reply, sendMessage }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStartPayload.mockReturnValue('')
  mockParseFirstTouchPayload.mockReturnValue({ product: null, source: null, campaign: null })
  mockSyncAccessAwareChatEntryPoints.mockResolvedValue(undefined)
  vi.mocked(resolveTelegramProductSummary).mockReset()
  vi.mocked(resolveTelegramProductSummary).mockResolvedValue(null)
})

describe('handleStart — Layer 2 integration', () => {
  it('existing user, TEST_DONE with result: replies via ctx.reply with correct buttons', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-1')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      lifecycleState: 'TEST_DONE',
      testStartedAt: null,
      testCompletedAt: new Date(),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date(),
      firstName: 'Тестова',
    })

    const { ctx, reply } = makeFakeCtx()
    await handleStart(ctx)

    expect(reply).toHaveBeenCalledTimes(1)
    const [text, options] = reply.mock.calls[0]
    expect(text).toContain('Ти вже пройшла тест')
    expect(options.parse_mode).toBe('HTML')
    const flat = JSON.stringify(options.reply_markup)
    expect(flat).toMatch(/ab_test:show_result/)
    expect(flat).toMatch(/ab_test:restart/)
  })

  it('existing user, ZOOM_MEMBER: replies with composed summary+Zoom content in one message', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-2')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-2',
      lifecycleState: 'ZOOM_MEMBER',
      testStartedAt: new Date(),
      testCompletedAt: new Date(),
      offerShownAt: new Date(),
      testResultType: 'action',
      updatedAt: new Date(),
      firstName: null,
    })
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)

    const { ctx, reply } = makeFakeCtx({ chatId: 222, fromId: 222 })
    await handleStart(ctx)

    expect(reply).toHaveBeenCalledTimes(1)
    const [text, options] = reply.mock.calls[0]
    expect(text).toContain('Підписка активна')
    expect(text).toContain('Ти в Zoom-групі')
    const flat = JSON.stringify(options.reply_markup)
    expect(flat).toMatch(/focus:next_zoom/)
    expect(flat).toMatch(/focus:progress/)
  })

  it('new user without first_name: asks for name via ctx.telegram.sendMessage, does NOT call buildHomeScreen path', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-3')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-3',
      lifecycleState: 'NEW_USER',
      testStartedAt: null,
      testCompletedAt: null,
      offerShownAt: null,
      testResultType: null,
      updatedAt: new Date(),
      firstName: null,
    })

    const { ctx, reply, sendMessage } = makeFakeCtx({ firstName: undefined })
    ctx.from.first_name = undefined as never

    await handleStart(ctx)

    expect(sendMessage).toHaveBeenCalledWith(String(ctx.chat.id), 'Як тебе звати?')
    expect(reply).not.toHaveBeenCalled()
    expect(mockSetPendingName).toHaveBeenCalledWith(String(ctx.chat.id))
  })

  it('duplicate update_id: second call with the same update_id is silently ignored (dedup guard)', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-4')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-4',
      lifecycleState: 'TEST_DONE',
      testStartedAt: null,
      testCompletedAt: new Date(),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date(),
      firstName: 'Тестова',
    })

    const { ctx, reply } = makeFakeCtx({ chatId: 444, fromId: 444, updateId: 999999 })
    await handleStart(ctx)
    await handleStart(ctx)

    expect(reply).toHaveBeenCalledTimes(1)
  })

  it('NEW_USER transitions lifecycleState to TEST_NOT_STARTED after showing welcome', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-5')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-5',
      lifecycleState: 'NEW_USER',
      testStartedAt: null,
      testCompletedAt: null,
      offerShownAt: null,
      testResultType: null,
      updatedAt: new Date(),
      firstName: 'Тестова',
    })

    const { ctx } = makeFakeCtx({ chatId: 555, fromId: 555 })
    await handleStart(ctx)

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-5' },
        data: expect.objectContaining({ lifecycleState: 'TEST_NOT_STARTED' }),
      }),
    )
  })
})
