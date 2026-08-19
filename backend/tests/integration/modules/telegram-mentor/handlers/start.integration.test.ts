import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUniqueOrThrow = vi.fn()
const mockUserUpdate = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockHasActiveFocusSubscription = vi.fn()
const mockGetUpcomingZoom = vi.fn()
const mockGetUpcomingZoomBookingView = vi.fn()
const mockGetOrCreateFocusInviteLink = vi.fn()
const mockLoadAbTestProgress = vi.fn()
const mockPlanMessage = vi.fn()
const mockRenderCurrentView = vi.fn()
const mockSendResultSnapshot = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}))

const mockResolveLinkedUserId = vi.fn()
const mockGetStartPayload = vi.fn()
const mockParseFirstTouchPayload = vi.fn()
const mockSyncAccessAwareChatEntryPoints = vi.fn()

vi.mock('../start.shared.ts', () => ({
  getStartPayload: (...args: unknown[]) => mockGetStartPayload(...args),
  parseFirstTouchPayload: (...args: unknown[]) => mockParseFirstTouchPayload(...args),
  resolveLinkedUserIdFromContext: (...args: unknown[]) => mockResolveLinkedUserId(...args),
  syncAccessAwareChatEntryPoints: (...args: unknown[]) => mockSyncAccessAwareChatEntryPoints(...args),
}))

vi.mock('../../services/product/summary.ts', () => ({
  resolveTelegramProductSummary: vi.fn().mockResolvedValue(null),
}))

const mockSetPendingName = vi.fn()
vi.mock('../../services/identity/pending.ts', () => ({
  clearPendingTelegramIdentity: vi.fn(),
  getPendingTelegramIdentity: vi.fn(),
  isValidEmail: vi.fn(),
  setPendingTelegramIdentity: vi.fn(),
  setPendingName: (...args: unknown[]) => mockSetPendingName(...args),
  hasPendingName: vi.fn().mockResolvedValue(false),
  clearPendingName: vi.fn(),
}))

vi.mock('../../../deeplinks/service.ts', () => ({
  generateMagicLink: vi.fn().mockResolvedValue('https://example.com/magic'),
}))

vi.mock('../../conversation/delivery/planDelivery.ts', () => ({
  planMessage: (...args: unknown[]) => mockPlanMessage(...args),
}))

vi.mock('../../../user/resolveOrCreateUser.ts', () => ({
  resolveOrCreateUser: vi.fn(),
}))

vi.mock('../../services/identity/linking.ts', () => ({
  upsertTelegramBinding: vi.fn(),
}))

vi.mock('@/products/ab-system/telegram/service.js', () => ({
  handleAbTestEmailCaptureText: vi.fn(),
}))

vi.mock('../../../subscriptions/payments/focus-access.ts', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
  hasActiveFocusSubscription: (...args: unknown[]) => mockHasActiveFocusSubscription(...args),
}))

vi.mock('../../../zoom/service.ts', () => ({
  getUpcomingZoom: (...args: unknown[]) => mockGetUpcomingZoom(...args),
  getUpcomingZoomBookingView: (...args: unknown[]) => mockGetUpcomingZoomBookingView(...args),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: (...args: unknown[]) => mockGetOrCreateFocusInviteLink(...args),
}))

vi.mock('@/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
}))

vi.mock('@/products/ab-system/telegram/views/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/products/ab-system/telegram/views/index.js')>()
  return {
    ...actual,
    renderCurrentView: (...args: unknown[]) => mockRenderCurrentView(...args),
    sendResultSnapshot: async (...args: Parameters<typeof actual.sendResultSnapshot>) => {
      mockSendResultSnapshot(...args)
      return actual.sendResultSnapshot(...args)
    },
  }
})

import { handleStart } from '../start.ts'
import { resolveOrCreateUser } from '../../../user/resolveOrCreateUser.ts'
import { generateMagicLink } from '../../../deeplinks/service.ts'

function makeFakeCtx(overrides: Partial<{
  chatId: number
  fromId: number
  firstName: string | undefined
  updateId: number
}> = {}) {
  const reply = vi.fn().mockResolvedValue({ message_id: 1 })
  const sendMessage = vi.fn().mockResolvedValue({ message_id: 2 })

  const ctx = {
    chat: { id: overrides.chatId ?? 111 },
    from: {
      id: overrides.fromId ?? 111,
      username: 'test_user',
      first_name: overrides.firstName ?? 'Тестова',
    },
    update: { update_id: overrides.updateId ?? 1000 },
    state: {},
    reply,
    telegram: { sendMessage },
  }

  return { ctx: ctx as any, reply, sendMessage }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPlanMessage.mockResolvedValue({ message_id: 1 })
  mockRenderCurrentView.mockResolvedValue(undefined)
  mockSendResultSnapshot.mockResolvedValue(undefined)
  mockUserUpdate.mockResolvedValue(undefined)
  mockGetStartPayload.mockReturnValue('')
  mockParseFirstTouchPayload.mockReturnValue({ product: null, source: null, campaign: null })
  mockSyncAccessAwareChatEntryPoints.mockResolvedValue(undefined)
  mockGetUserAccessState.mockResolvedValue({
    state: 'NO_ACCESS',
    isActive: false,
    hasFocus: false,
    expiresAt: null,
  })
  mockHasActiveFocusSubscription.mockResolvedValue(false)
  mockGetUpcomingZoom.mockResolvedValue(null)
  mockGetUpcomingZoomBookingView.mockResolvedValue(null)
  mockGetOrCreateFocusInviteLink.mockResolvedValue('https://t.me/focus-channel')
  mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)
  mockLoadAbTestProgress.mockResolvedValue({
    status: 'idle',
    result_key: null,
  })
})

describe('handleStart — targeted home screen routing', () => {
  it('TEST_DONE state replay sends the canonical STAN keyboard exactly once', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-state')
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'state',
      email_stage: 'captured',
    })
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-state',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'TEST_DONE',
      testStartedAt: null,
      testCompletedAt: new Date('2026-08-13T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'state',
      updatedAt: new Date('2026-08-13T10:00:00Z'),
      firstName: 'Тестова',
    })

    const { ctx, sendMessage } = makeFakeCtx({ chatId: 113, fromId: 113, updateId: 1013 })
    await handleStart(ctx)

    expect(mockSendResultSnapshot).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledTimes(1)
    const replyMarkup = sendMessage.mock.calls[0]?.[2]?.reply_markup
    expect(replyMarkup).toEqual({
      inline_keyboard: [
        [{ text: 'ОБРАТИ ФОРМАТ У ФОКУСІ', callback_data: 'open_focus_payment' }],
        [{ text: 'ПРО ПРОГРАМУ', callback_data: 'show_inside_STATE' }],
      ],
    })
    expect(JSON.stringify(replyMarkup)).not.toContain('ЗАГЛЯНУТИ')
    expect(JSON.stringify(replyMarkup)).not.toContain('ЗАПИСАТИСЯ НА ZOOM')
    expect(JSON.stringify(replyMarkup)).not.toContain('zoom-calendar')
  })

  it('TEST_DONE + NO_ACCESS delegates to canonical repeated-result renderer', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-1')
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'action',
      email_stage: 'captured',
    })
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'TEST_DONE',
      testStartedAt: null,
      testCompletedAt: new Date('2026-07-20T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date('2026-07-20T10:00:00Z'),
      firstName: 'Тестова',
    })

    const { ctx, reply } = makeFakeCtx()
    await handleStart(ctx)

    expect(reply).not.toHaveBeenCalled()
    expect(mockPlanMessage).not.toHaveBeenCalled()
    expect(mockRenderCurrentView).not.toHaveBeenCalled()
    expect(mockSendResultSnapshot).toHaveBeenCalledTimes(1)
    expect(mockSendResultSnapshot).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        chatId: '111',
        userId: 'user-1',
        resultKey: 'action',
        firstName: 'Тестова',
      }),
    )
  })

  it('FOCUS_PAID + completed progress + plain start keeps paid home as winner', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-focus-1')
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
    })
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-focus-1',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'FOCUS_PAID',
      testStartedAt: null,
      testCompletedAt: new Date('2026-07-20T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'decision',
      updatedAt: new Date('2026-07-20T10:00:00Z'),
      firstName: 'Фокус',
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-focus-1',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/focus-1' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })

    const { ctx, reply } = makeFakeCtx({ chatId: 120, fromId: 120, updateId: 1007 })
    await handleStart(ctx)

    expect(reply).not.toHaveBeenCalled()
    expect(mockRenderCurrentView).not.toHaveBeenCalled()
    expect(mockPlanMessage).toHaveBeenCalledTimes(1)
    const [, , transition, text, options] = mockPlanMessage.mock.calls[0]
    expect(transition).toBe('start_home_screen')
    expect(text).toContain('Твій доступ до ФОКУСУ активний до <b>15 листопада 2026')
    expect(text).toContain('Ти ще не записана.')
    expect(JSON.stringify(options)).toMatch(/ЗАПИСАТИСЯ/)
  })

  it('completed test without access does not fall back to intro', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-1b')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1b',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'TEST_NOT_STARTED',
      testStartedAt: new Date('2026-07-20T10:00:00Z'),
      testCompletedAt: new Date('2026-07-20T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date('2026-07-20T10:00:00Z'),
      firstName: 'Тестова',
    })
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'action',
    })

    const { ctx, reply } = makeFakeCtx({ chatId: 101, fromId: 101, updateId: 1001 })
    await handleStart(ctx)

    expect(reply).not.toHaveBeenCalled()
    expect(mockPlanMessage).not.toHaveBeenCalled()
    expect(mockRenderCurrentView).not.toHaveBeenCalled()
    expect(mockSendResultSnapshot).toHaveBeenCalledTimes(1)
    expect(mockSendResultSnapshot).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        chatId: '101',
        userId: 'user-1b',
        resultKey: 'action',
        firstName: 'Тестова',
      }),
    )
  })

  it('completed test with magic-link payload keeps payload route priority', async () => {
    mockGetStartPayload.mockReturnValue('ml_request-123')
    mockResolveLinkedUserId.mockResolvedValue('user-ml')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-ml',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'TEST_DONE',
      testStartedAt: null,
      testCompletedAt: new Date('2026-07-20T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date('2026-07-20T10:00:00Z'),
      firstName: 'Тестова',
    })
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'action',
      email_stage: 'captured',
    })

    const { ctx, reply } = makeFakeCtx({ chatId: 112, fromId: 112, updateId: 1006 })
    await handleStart(ctx)

    expect(reply).not.toHaveBeenCalled()
    expect(mockRenderCurrentView).not.toHaveBeenCalled()
    expect(generateMagicLink).toHaveBeenCalledWith('user-ml')
    expect(mockPlanMessage).toHaveBeenCalledTimes(1)
    const [, , transition, text] = mockPlanMessage.mock.calls[0]
    expect(transition).toBe('start_home_screen')
    expect(text).toContain('магічне посилання')
  })

  it('FOCUS_ACTIVE with stale intro lifecycle opens canonical Focus Home', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-2b')
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'decision',
      email_stage: 'captured',
    })
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-2b',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'TEST_NOT_STARTED',
      testStartedAt: null,
      testCompletedAt: new Date('2026-07-20T10:00:00Z'),
      offerShownAt: null,
      testResultType: 'action',
      updatedAt: new Date('2026-07-20T10:00:00Z'),
      firstName: 'Фокус',
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-2',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/2' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })

    const { ctx, reply } = makeFakeCtx({ chatId: 202, fromId: 202, updateId: 1002 })
    await handleStart(ctx)

    expect(reply).not.toHaveBeenCalled()
    expect(mockRenderCurrentView).not.toHaveBeenCalled()
    const [, , , text, options] = mockPlanMessage.mock.calls[0]
    expect(text).toContain('Твій доступ до ФОКУСУ активний до <b>15 листопада 2026')
    expect(text).toContain('Ти ще не записана.')
    const flat = JSON.stringify(options)
    expect(flat).toMatch(/ЗАПИСАТИСЯ/)
    expect(flat).toMatch(/ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ/)
    expect(flat).toMatch(/ПРОЙТИ ТЕСТ ЩЕ РАЗ/)
    expect(flat).toMatch(/КАНАЛ ФОКУСУ/)
  })

  it('new user without first_name asks for name first', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-3')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-3',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'NEW_USER',
      testStartedAt: null,
      testCompletedAt: null,
      offerShownAt: null,
      testResultType: null,
      updatedAt: new Date('2026-07-28T10:00:00Z'),
      firstName: null,
    })

    const { ctx, reply, sendMessage } = makeFakeCtx({ firstName: undefined, updateId: 1003 })
    ctx.from.first_name = undefined as never

    await handleStart(ctx)

    expect(sendMessage).toHaveBeenCalledWith(String(ctx.chat.id), 'Як тебе звати?')
    expect(reply).not.toHaveBeenCalled()
    expect(mockSetPendingName).toHaveBeenCalledWith(String(ctx.chat.id))
  })

  it('NEW_USER transitions lifecycleState to TEST_NOT_STARTED after welcome', async () => {
    mockResolveLinkedUserId.mockResolvedValue('user-5')
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-5',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'NEW_USER',
      testStartedAt: null,
      testCompletedAt: null,
      offerShownAt: null,
      testResultType: null,
      updatedAt: new Date('2026-07-28T10:00:00Z'),
      firstName: 'Тестова',
    })

    const { ctx } = makeFakeCtx({ chatId: 555, fromId: 555, updateId: 1005 })
    await handleStart(ctx)

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-5' },
        data: expect.objectContaining({ lifecycleState: 'TEST_NOT_STARTED' }),
      }),
    )
  })

  it('creates a new Telegram user only once and ignores the duplicate /start delivery for the same update', async () => {
    mockResolveLinkedUserId.mockResolvedValue(null)
    vi.mocked(resolveOrCreateUser).mockResolvedValue({
      created: true,
      user: { id: 'user-new-1' },
    } as never)
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'user-new-1',
      role: 'USER',
      activeRole: 'USER',
      lifecycleState: 'NEW_USER',
      testStartedAt: null,
      testCompletedAt: null,
      offerShownAt: null,
      testResultType: null,
      updatedAt: new Date('2026-07-31T10:00:00Z'),
      firstName: 'Нова',
    })

    const { ctx } = makeFakeCtx({ chatId: 777, fromId: 777, updateId: 1777 })

    await handleStart(ctx)
    await handleStart(ctx)

    expect(resolveOrCreateUser).toHaveBeenCalledTimes(1)
    expect(mockFindUniqueOrThrow).toHaveBeenCalledTimes(1)
    expect(mockPlanMessage).toHaveBeenCalledTimes(1)
  })
})
