import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db/client.js', () => ({
  prisma: {
  },
}))

vi.mock('@/modules/subscriptions/payments/business.checkout.js', () => ({
  buildAbsystemAiUpgradeCheckoutUrl: vi.fn((userId: string) => `https://checkout.example/${userId}/absystem`),
  buildEcosystemPaymentCheckoutSession: vi.fn(async (_product: string, plan: string) => ({
    checkoutUrl: `https://checkout.example/${plan}`,
  })),
}))

vi.mock('@/modules/subscriptions/payments/focus.access.js', () => ({
  getUserAccessState: vi.fn(),
}))

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingZoomBookingView: vi.fn(),
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: vi.fn(async () => 'https://t.me/focus-channel'),
}))

vi.mock('../../../config/webapp.js', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

import { getUserAccessState } from '@/modules/subscriptions/payments/focus.access.js'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'
import { buildFocusActionButtons, zoomSection, postZoomAbsystemCtaMessage } from './abTest.start.js'

describe('Focus home CTA matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(getUserAccessState).mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-11-15T00:00:00Z'),
    })
  })

  it('ACTIVE + NOT_BOOKED + UPCOMING_SESSION -> shows only "Обрати Zoom"', async () => {
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-1',
      scheduledAt: new Date('2026-07-28T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/1' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const buttons = await buildFocusActionButtons('user-1')

    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.[0]).toMatchObject({
      text: 'ЗАПИСАТИСЯ',
      web_app: {
        url: expect.stringContaining('https://miniapp.example/miniapp/zoom-calendar?intent=booking'),
      },
    })
  })

  it('ACTIVE + BOOKED + OUTSIDE_JOIN_WINDOW -> shows view booking CTA', async () => {
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-2',
      scheduledAt: new Date('2026-07-27T18:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/2' },
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const buttons = await buildFocusActionButtons('user-2')

    expect(buttons[0]?.[0]).toMatchObject({
      text: 'ПЕРЕГЛЯНУТИ ЗАПИС',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar' },
    })
  })

  it('ACTIVE + BOOKED + JOIN_WINDOW -> shows join CTA', async () => {
    vi.setSystemTime(new Date('2026-07-27T18:56:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-3',
      scheduledAt: new Date('2026-07-27T19:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/join' },
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const buttons = await buildFocusActionButtons('user-3')

    expect(buttons).toEqual([
      [{ text: 'ПРИЄДНАТИСЯ', url: 'https://zoom.example/join' }],
    ])
  })

  it('ACTIVE + NO_UPCOMING_SESSION -> does not show fake zoom CTA', async () => {
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue(null)

    const buttons = await buildFocusActionButtons('user-4')

    expect(buttons).toEqual([])
  })

  it('EXPIRED -> shows renewal CTAs', async () => {
    vi.mocked(getUserAccessState).mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-07-20T00:00:00Z'),
    })

    const buttons = await buildFocusActionButtons('user-5')

    expect(buttons[0]?.[0]?.text).toBe('ПРОДОВЖИТИ ПІДПИСКУ НА 1 МІСЯЦЬ')
    expect(buttons[1]?.[0]?.text).toBe('ПРОДОВЖИТИ ПІДПИСКУ НА 3 МІСЯЦІ')
  })

  it('focus copy uses only Focus language and state-specific CTA without emoji', async () => {
    vi.setSystemTime(new Date('2026-07-28T14:45:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-6',
      scheduledAt: new Date('2026-07-28T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/6' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const payload = await zoomSection('user-6')
    const buttonTexts = payload.buttons.flat().map((button) => button.text)

    expect(payload.text).toContain('Твій доступ до ФОКУСУ активний до')
    expect(payload.text).toContain('Найближча Zoom-практика — <b>сьогодні о 19:00</b>')
    expect(payload.text).not.toContain('Starway')
    expect(payload.text).not.toContain('ABSystem')
    expect(payload.text).not.toContain('Практикум')
    expect(payload.text).not.toContain('робочому просторі')
    expect(buttonTexts).toEqual(['ЗАПИСАТИСЯ', 'ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ', 'ПРОЙТИ ТЕСТ ЩЕ РАЗ', 'КАНАЛ ФОКУСУ'])
    expect(buttonTexts.join(' ')).not.toContain('кімнату')
  })

  it('formats tomorrow label in Europe/Kyiv', async () => {
    vi.setSystemTime(new Date('2026-08-03T14:45:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-tomorrow',
      scheduledAt: new Date('2026-08-04T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/tomorrow' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const payload = await zoomSection('user-tomorrow')

    expect(payload.text).toContain('Найближча Zoom-практика — <b>завтра о 19:00</b>')
  })

  it('formats later dates as absolute Kyiv dates', async () => {
    vi.setSystemTime(new Date('2026-08-03T14:45:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-later',
      scheduledAt: new Date('2026-08-06T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/later' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const payload = await zoomSection('user-later')

    expect(payload.text).toContain('Найближча Zoom-практика — <b>6 серпня о 19:00</b>')
  })

  it('keeps today/tomorrow detection across year boundary in Europe/Kyiv', async () => {
    vi.setSystemTime(new Date('2026-12-31T20:30:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-year-boundary',
      scheduledAt: new Date('2027-01-01T07:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/year-boundary' },
      isMyBooking: false,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const payload = await zoomSection('user-year-boundary')

    expect(payload.text).toContain('Найближча Zoom-практика — <b>завтра о 09:00</b>')
  })

  it('BOOKED state copy is Focus-specific', async () => {
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-booked',
      scheduledAt: new Date('2026-07-27T18:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/booked' },
      isMyBooking: true,
      myQuestion: {
        text: 'Як пройти через страх дзвінка?',
        position: 1,
      },
      attendeesCount: 3,
    } as never)

    const payload = await zoomSection('user-booked')

    expect(payload.text).toContain('Ти вже записана.')
    expect(payload.text).toContain('Твоя точка фокусу:')
    expect(payload.text).toContain('Як пройти через страх дзвінка?')
    expect(payload.text).toContain('Питання №1 у черзі')
    expect(payload.text).not.toContain('Starway')
    expect(payload.text).not.toContain('ABSystem')
    expect(payload.buttons).toEqual([
      [{ text: 'ПЕРЕГЛЯНУТИ ЗАПИС', web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar' } }],
      [{ text: 'ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ', callback_data: expect.any(String) }],
      [{ text: 'ПРОЙТИ ТЕСТ ЩЕ РАЗ', callback_data: 'ab_test:restart' }],
      [{ text: 'КАНАЛ ФОКУСУ', url: 'https://t.me/focus-channel' }],
    ])
  })

  it('JOIN_WINDOW state copy is Focus-specific', async () => {
    vi.setSystemTime(new Date('2026-07-27T18:56:00Z'))
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue({
      id: 'zoom-join',
      scheduledAt: new Date('2026-07-27T19:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/live' },
      isMyBooking: true,
      myQuestion: null,
      attendeesCount: 0,
    } as never)

    const payload = await zoomSection('user-live')

    expect(payload.text).toContain('Ти вже записана.')
    expect(payload.text).toContain('Найближча Zoom-практика')
    expect(payload.buttons).toHaveLength(4)
  })

  it('NO_SESSION state copy has no fake CTA', async () => {
    vi.mocked(getUpcomingZoomBookingView).mockResolvedValue(null)

    const payload = await zoomSection('user-no-session')

    expect(payload.text).toContain('Найближчу Zoom-практику ще не додано.')
    expect(payload.buttons).toHaveLength(3)
  })

  it('focus ai remains an explicit separate ABSystem upsell action', () => {
    const payload = postZoomAbsystemCtaMessage('user-7')

    expect(JSON.stringify(payload.reply_markup)).toContain('focus:ai')
  })

  it('POST_ZOOM_1 copy stays Focus-only and does not include ABSystem CTA', async () => {
    const { postZoom1Message } = await import('./abTest.start.js')

    const payload = postZoom1Message('user-8')
    const flat = JSON.stringify(payload.reply_markup)

    expect(payload.text).toContain('Практика завершилась')
    expect(payload.text).toContain('Zoom')
    expect(payload.text).not.toContain('ABSystem')
    expect(flat).toMatch(/post_zoom:leave_insight/)
    expect(flat).toMatch(/focus:next_zoom/)
    expect(flat).not.toMatch(/post_zoom:absystem_cta/)
  })
})
