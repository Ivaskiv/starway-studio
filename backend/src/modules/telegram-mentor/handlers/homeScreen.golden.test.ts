import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockGetUpcomingZoom = vi.fn()
const mockGetUpcomingZoomBookingView = vi.fn()
const mockGetOrCreateFocusInviteLink = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    },
  },
}))

import { buildHomeScreen } from './homeScreen.builder.js'
import type { StartUserSnapshot } from './start.js'
import type { StartContext } from './start.shared.js'

vi.mock('../services/productSummary.service.js', () => ({
  resolveTelegramProductSummary: vi.fn(),
}))

vi.mock('@/modules/subscriptions/payments/business.checkout.js', () => ({
  buildAbsystemAiUpgradeCheckoutUrl: vi.fn((userId: string) =>
    `https://example.com/checkout/${userId}?product=absystem_ai&plan=1month_upgrade`),
  buildEcosystemPaymentCheckoutSession: vi.fn(async (_product: string, plan: string) => ({
    checkoutUrl: `https://example.com/checkout/${plan}`,
  })),
}))

vi.mock('@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js', () => ({
  TelegramConversationRenderer: class {
    async render() {
      return true
    }

    async renderOutbound() {
      return true
    }
  },
}))

vi.mock('@/modules/subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingZoom: (...args: unknown[]) => mockGetUpcomingZoom(...args),
  getUpcomingZoomBookingView: (...args: unknown[]) => mockGetUpcomingZoomBookingView(...args),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: (...args: unknown[]) => mockGetOrCreateFocusInviteLink(...args),
}))

import { resolveTelegramProductSummary } from '../services/productSummary.service.js'

function makeSnapshot(overrides: Partial<StartUserSnapshot>): StartUserSnapshot {
  return {
    id: 'golden-user-id',
    role: 'USER',
    activeRole: 'USER',
    lifecycleState: 'NEW_USER',
    testStartedAt: null,
    testCompletedAt: null,
    offerShownAt: null,
    testResultType: null,
    updatedAt: new Date('2026-07-12T10:00:00Z'),
    firstName: 'Тестова',
    ...overrides,
  }
}

const fakeCtx = {} as StartContext

function normalizeScreenForSnapshot(screen: Awaited<ReturnType<typeof buildHomeScreen>>) {
  return JSON.parse(
    JSON.stringify(screen).replace(
      /miniapp\/zoom-calendar\?intent=booking&v=\d+/g,
      'miniapp/zoom-calendar?intent=booking&v=<normalized>',
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(resolveTelegramProductSummary).mockReset()
  vi.mocked(resolveTelegramProductSummary).mockResolvedValue(null)
  mockGetUserAccessState.mockResolvedValue({
    state: 'NO_ACCESS',
    isActive: false,
    hasFocus: false,
    expiresAt: null,
  })
  mockGetUpcomingZoom.mockResolvedValue(null)
  mockGetUpcomingZoomBookingView.mockResolvedValue(null)
  mockGetOrCreateFocusInviteLink.mockResolvedValue('https://t.me/focus-channel')
  mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)
})

describe('Golden Master — /start screens per lifecycleState', () => {
  it('NEW_USER', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'NEW_USER' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('TEST_NOT_STARTED', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_NOT_STARTED' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('TEST_IN_PROGRESS (recent)', async () => {
    const screen = await buildHomeScreen(
      makeSnapshot({ lifecycleState: 'TEST_IN_PROGRESS', updatedAt: new Date('2026-08-10T10:00:00Z') }),
      fakeCtx,
    )
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('TEST_IN_PROGRESS (stale, >168h)', async () => {
    const staleDate = new Date('2026-07-19T10:00:00Z')
    const screen = await buildHomeScreen(
      makeSnapshot({ lifecycleState: 'TEST_IN_PROGRESS', updatedAt: staleDate }),
      fakeCtx,
    )
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('TEST_DONE without result (edge case)', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: null }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('TEST_DONE + NO_ACCESS', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: 'action' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('OFFER_SHOWN + NO_ACCESS', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'OFFER_SHOWN', testResultType: 'action' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('FOCUS_PAID — fallback (summary unresolved)', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-focus-fallback',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/fallback' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'FOCUS_PAID' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('FOCUS_PAID — with resolved summary', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-focus-summary',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/summary' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'FOCUS_PAID' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('ZOOM_MEMBER — fallback (summary unresolved)', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-member-fallback',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/member-fallback' },
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'attendee-fallback' })
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('ZOOM_MEMBER — with resolved summary (composed with Zoom section)', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-member-summary',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/member-summary' },
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'attendee-summary' })
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('POST_ZOOM_1', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'POST_ZOOM_1' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('UPSELL', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'UPSELL' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('EXPIRED', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'EXPIRED' }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })

  it('NEW_USER without firstName — no header line', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'NEW_USER', firstName: null }), fakeCtx)
    expect(normalizeScreenForSnapshot(screen)).toMatchSnapshot()
  })
})
