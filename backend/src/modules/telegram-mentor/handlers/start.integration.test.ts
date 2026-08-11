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

vi.mock('../../../db/client.js', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
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
  planMessage: (...args: unknown[]) => mockPlanMessage(...args),
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

vi.mock('../../subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
  hasActiveFocusSubscription: (...args: unknown[]) => mockHasActiveFocusSubscription(...args),
}))

vi.mock('../../zoom/service.js', () => ({
  getUpcomingZoom: (...args: unknown[]) => mockGetUpcomingZoom(...args),
  getUpcomingZoomBookingView: (...args: unknown[]) => mockGetUpcomingZoomBookingView(...args),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: (...args: unknown[]) => mockGetOrCreateFocusInviteLink(...args),
}))

vi.mock('@/products/ab-system/telegram/abTest.progress.js', () => ({
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
}))

vi.mock('@/products/ab-system/telegram/abTest.views.js', () => ({
  renderCurrentView: (...args: unknown[]) => mockRenderCurrentView(...args),
}))

import { handleStart } from './start.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { generateMagicLink } from '../../deeplinks/service.js'

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

  return { ctx: ctx as never, reply, sendMessage }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPlanMessage.mockResolvedValue({ message_id: 1 })
  mockRenderCurrentView.mockResolvedValue(undefined)
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
  it('TEST_DONE + NO_ACCESS delegates to canonical AB result owner', async () => {
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
    expect(mockRenderCurrentView).toHaveBeenCalledTimes(1)
    expect(mockRenderCurrentView).toHaveBeenCalledWith(
      ctx,
      'user-1',
      expect.objectContaining({
        status: 'completed',
        result_key: 'action',
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
    expect(mockRenderCurrentView).toHaveBeenCalledTimes(1)
    expect(mockRenderCurrentView).toHaveBeenCalledWith(
      ctx,
      'user-1b',
      expect.objectContaining({
        status: 'completed',
        result_key: 'action',
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
