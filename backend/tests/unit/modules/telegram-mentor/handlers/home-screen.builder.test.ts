import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Context, Telegram } from 'telegraf'
import type { Update, UserFromGetMe } from 'telegraf/types'

const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockGetUserAccessState = vi.fn()
const mockGetUpcomingZoom = vi.fn()
const mockGetUpcomingZoomBookingView = vi.fn()
const mockGetOrCreateFocusInviteLink = vi.fn()
const mockLoadAbTestProgress = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
    },
  },
}))

vi.mock('@/modules/subscriptions/payments/focus-access.js', () => ({
  getUserAccessState: (...args: unknown[]) => mockGetUserAccessState(...args),
}))

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingZoom: (...args: unknown[]) => mockGetUpcomingZoom(...args),
  getUpcomingZoomBookingView: (...args: unknown[]) => mockGetUpcomingZoomBookingView(...args),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: (...args: unknown[]) => mockGetOrCreateFocusInviteLink(...args),
}))

vi.mock('@/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
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

vi.mock('@/modules/subscriptions/payments/business/checkout.js', () => ({
  buildAbsystemAiUpgradeCheckoutUrl: vi.fn((userId: string) =>
    `https://example.com/checkout/${userId}?product=absystem_ai&plan=1month_upgrade`),
  buildEcosystemPaymentCheckoutSession: vi.fn(async (_product: string, plan: string) => ({
    checkoutUrl: `https://example.com/checkout/${plan}`,
  })),
}))

import { buildHomeScreen } from '@/modules/telegram-mentor/handlers/homeScreen.builder.js'
import type { StartUserSnapshot } from '@/modules/telegram-mentor/handlers/start.js'
import type { StartContext } from '@/modules/telegram-mentor/handlers/start.shared.js'

function makeSnapshot(overrides: Partial<StartUserSnapshot>): StartUserSnapshot {
  return {
    id: 'test-user-id',
    role: 'USER',
    activeRole: 'USER',
    lifecycleState: 'NEW_USER',
    testStartedAt: null,
    testCompletedAt: null,
    offerShownAt: null,
    testResultType: null,
    updatedAt: new Date(),
    firstName: null,
    ...overrides,
  }
}

function makeStartContext(): StartContext {
  const update: Update = {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: {
        id: 1,
        type: 'private',
        first_name: 'Test',
      },
      from: {
        id: 1,
        is_bot: false,
        first_name: 'Test',
      },
      text: '/start',
    },
  }

  const botInfo: UserFromGetMe = {
    id: 1,
    is_bot: true,
    first_name: 'test_starway_bot',
    username: 'test_starway_bot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  }

  return new Context<Update>(update, new Telegram('test-token'), botInfo)
}

const fakeCtx = makeStartContext()

beforeEach(() => {
  vi.clearAllMocks()
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
  mockLoadAbTestProgress.mockResolvedValue(null)
})

describe('buildHomeScreen — /start funnel regression', () => {
  it('NEW_USER: shows welcome and test CTA', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'NEW_USER', firstName: 'Віра' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Віра')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/тест/i)
  })

  it('TEST_DONE with completed result renders conversational returning home', async () => {
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'goal',
    })
    const snapshot = makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: 'action' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Рада бачити тебе знову.')
    expect(screen.text).toContain('Минулого разу твій тест показав <b>ЦІЛЬ</b>:')
    expect(screen.text).toContain('Ти хочеш змін, але не розумієш, з чого почати.')
    expect(screen.text).toContain('Ти вже побачила свій результат, але до Zoom-практики ще не переходила.')
    expect(screen.text).toContain('Зараз активного доступу до Zoom-практик немає.')
    expect(screen.text).toContain('Найближча групова Zoom-практика ще не запланована.')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/ОБРАТИ ФОРМАТ У ФОКУСІ/)
    expect(flat).toMatch(/ПРО ПРОГРАМУ/)
    expect(flat).not.toMatch(/ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ/)
    expect(flat).toMatch(/show_inside_GOAL/)
    expect(flat).toMatch(/open_focus_payment/)
  })

  it('OFFER_SHOWN keeps offer CTA separate from TEST_DONE', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'OFFER_SHOWN', testResultType: 'action' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('У тебе вже є <b>результат</b> тесту')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/open_focus_payment/)
    expect(flat).toMatch(/ab_test:show_result/)
  })

  it('FOCUS_PAID: renders canonical Focus home with 3 CTA', async () => {
    mockGetUserAccessState.mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-1',
      scheduledAt: new Date('2026-08-03T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/1' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })

    const snapshot = makeSnapshot({ lifecycleState: 'FOCUS_PAID' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Твій доступ до ФОКУСУ активний до')
    expect(screen.text).toContain('Ти ще не записана.')
    expect(screen.reply_markup.inline_keyboard).toHaveLength(4)
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/ЗАПИСАТИСЯ/)
    expect(flat).toMatch(/ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ/)
    expect(flat).toMatch(/ПРОЙТИ ТЕСТ ЩЕ РАЗ/)
    expect(flat).toMatch(/КАНАЛ ФОКУСУ/)
  })

  it('FOCUS_PAID with PREMIUM trial access keeps trial semantics instead of active Focus copy', async () => {
    mockLoadAbTestProgress.mockResolvedValue({
      status: 'completed',
      result_key: 'state',
    })
    mockGetUserAccessState.mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-30T12:00:00Z'),
    })
    mockGetUpcomingZoomBookingView.mockResolvedValue({
      id: 'zoom-trial-home',
      scheduledAt: new Date('2026-08-27T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/trial-home' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    })

    const snapshot = makeSnapshot({ lifecycleState: 'FOCUS_PAID' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Минулого разу твій тест показав <b>СТАН</b>:')
    expect(screen.text).toContain('Зараз ти живеш більше на автоматі.')
    expect(screen.text).toContain('Ти вже перейшла від результату до Zoom-практики і зараз можеш обрати найближчу зустріч.')
    expect(screen.text).toContain('Зараз у тебе активний пробний доступ до Zoom до 30 серпня 2026 р.')
    expect(screen.text).toContain('Найближча групова Zoom-практика — 27 серпня о 19:00 за Києвом.')
    expect(screen.text).toContain('Ти ще не записувалась на неї.')
    expect(screen.reply_markup.inline_keyboard).toEqual([
      [{ text: 'ОБРАТИ ZOOM-ПРАКТИКУ', web_app: { url: expect.stringContaining('/miniapp/zoom-calendar?intent=booking') } }],
      [{ text: 'ПРО ПРОГРАМУ', callback_data: 'show_inside_STATE' }],
    ])
  })

  it('ZOOM_MEMBER with unresolved summary: renders booked Focus home', async () => {
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
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'attendee-1' })

    const snapshot = makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Ти вже записана.')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/КАНАЛ ФОКУСУ/)
  })

  it('POST_ZOOM_1: stays Focus-only and does not mix in ABSystem copy', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'POST_ZOOM_1' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).not.toContain('Переходимо в AI Mentor режим')
    expect(screen.text).toContain('Практика завершилась')
    expect(screen.text).toContain('Zoom')
    expect(screen.text).not.toContain('ABSystem')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/focus:next_zoom/)
    expect(flat).not.toMatch(/post_zoom:absystem_cta/)
  })

  it('UPSELL: keeps Focus-only CTA instead of mixed ABSystem upgrade copy', async () => {
    const zoomSnapshot = makeSnapshot({ lifecycleState: 'POST_ZOOM_1' })
    const upsellSnapshot = makeSnapshot({ lifecycleState: 'UPSELL' })

    const zoomScreen = await buildHomeScreen(zoomSnapshot, fakeCtx)
    const upsellScreen = await buildHomeScreen(upsellSnapshot, fakeCtx)

    expect(upsellScreen.text).not.toEqual(zoomScreen.text)
    expect(upsellScreen.text).toContain('ФОКУС')
    expect(upsellScreen.text).not.toContain('ABSystem')
    expect(JSON.stringify(upsellScreen.reply_markup)).toMatch(/focus:next_zoom/)
  })

  it('EXPIRED: shows Focus renewal copy and restore CTA, distinct from POST_ZOOM_1/UPSELL', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'EXPIRED' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Твій доступ до ФОКУСУ завершився')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/open_focus_payment/)
    expect(flat).toMatch(/ПРОДОВЖИТИ ПІДПИСКУ/)
  })

  it('every known lifecycleState produces non-empty text and at least one button', async () => {
    const states: StartUserSnapshot['lifecycleState'][] = [
      'NEW_USER',
      'TEST_NOT_STARTED',
      'TEST_IN_PROGRESS',
      'TEST_DONE',
      'OFFER_SHOWN',
      'FOCUS_PAID',
      'ZOOM_MEMBER',
      'POST_ZOOM_1',
      'UPSELL',
      'EXPIRED',
    ]

    for (const state of states) {
      if (state === 'FOCUS_PAID' || state === 'ZOOM_MEMBER') {
        mockGetUserAccessState.mockResolvedValue({
          state: 'FOCUS_ACTIVE',
          isActive: true,
          hasFocus: true,
          expiresAt: new Date('2026-11-15T00:00:00Z'),
        })
        mockGetUpcomingZoomBookingView.mockResolvedValue({
          id: 'zoom-loop',
          scheduledAt: new Date('2026-08-03T16:00:00Z'),
          requests: { zoomLink: 'https://zoom.example/loop' },
          isMyBooking: state === 'ZOOM_MEMBER',
          myQuestion: null,
          attendeesCount: 0,
        })
      } else {
        mockGetUserAccessState.mockResolvedValue({
          state: 'NO_ACCESS',
          isActive: false,
          hasFocus: false,
          expiresAt: null,
        })
        mockGetUpcomingZoom.mockResolvedValue(null)
      }

      mockZoomSessionAttendeeFindUnique.mockResolvedValue(
        state === 'ZOOM_MEMBER' ? { id: 'attendee-loop' } : null,
      )

      const snapshot = makeSnapshot({
        lifecycleState: state,
        testResultType: state === 'TEST_DONE' ? 'action' : null,
      })
      const screen = await buildHomeScreen(snapshot, fakeCtx)
      expect(screen.text.trim().length, `state ${state} produced empty text`).toBeGreaterThan(0)
      expect(
        screen.reply_markup.inline_keyboard.length,
        `state ${state} produced zero buttons`,
      ).toBeGreaterThan(0)
    }
  })
})
