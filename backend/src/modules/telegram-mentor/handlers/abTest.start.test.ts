import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db/client.js', () => ({
  prisma: {
    zoomSessionAttendee: {
      findUnique: vi.fn(),
    },
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
  getUpcomingZoom: vi.fn(),
}))

vi.mock('../../../config/webapp.js', () => ({
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

import { prisma } from '@/db/client.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus.access.js'
import { getUpcomingZoom } from '@/modules/zoom/service.js'
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
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-1',
      scheduledAt: new Date('2026-07-28T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/1' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue(null as never)

    const buttons = await buildFocusActionButtons('user-1')

    expect(buttons).toEqual([
      [{ text: 'Записатися', web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?intent=booking' } }],
    ])
  })

  it('ACTIVE + BOOKED + OUTSIDE_JOIN_WINDOW -> shows view booking CTA', async () => {
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'))
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-2',
      scheduledAt: new Date('2026-07-27T18:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/2' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue({ id: 'attendee-1' } as never)

    const buttons = await buildFocusActionButtons('user-2')

    expect(buttons[0]?.[0]).toMatchObject({
      text: 'Переглянути запис',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar' },
    })
  })

  it('ACTIVE + BOOKED + JOIN_WINDOW -> shows join CTA', async () => {
    vi.setSystemTime(new Date('2026-07-27T18:56:00Z'))
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-3',
      scheduledAt: new Date('2026-07-27T19:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/join' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue({ id: 'attendee-2' } as never)

    const buttons = await buildFocusActionButtons('user-3')

    expect(buttons).toEqual([
      [{ text: 'Приєднатися', url: 'https://zoom.example/join' }],
    ])
  })

  it('ACTIVE + NO_UPCOMING_SESSION -> does not show fake zoom CTA', async () => {
    vi.mocked(getUpcomingZoom).mockResolvedValue(null)

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

    expect(buttons[0]?.[0]?.text).toBe('Продовжити підписку на 1 місяць')
    expect(buttons[1]?.[0]?.text).toBe('Продовжити підписку на 3 місяці')
  })

  it('focus copy uses only Focus language and state-specific CTA without emoji', async () => {
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-6',
      scheduledAt: new Date('2026-07-28T16:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/6' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue(null as never)

    const payload = await zoomSection('user-6')
    const buttonTexts = payload.buttons.flat().map((button) => button.text)

    expect(payload.text).toContain('Zoom-практику ФОКУСУ')
    expect(payload.text).not.toContain('Starway')
    expect(payload.text).not.toContain('ABSystem')
    expect(payload.text).not.toContain('Практикум')
    expect(payload.text).not.toContain('робочому просторі')
    expect(buttonTexts).toEqual(['Обрати Zoom'])
    expect(buttonTexts.join(' ')).not.toContain('кімнату')
    expect(buttonTexts.every((text) => !/[\p{Extended_Pictographic}]/u.test(text))).toBe(true)
  })

  it('BOOKED state copy is Focus-specific', async () => {
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'))
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-booked',
      scheduledAt: new Date('2026-07-27T18:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/booked' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue({ id: 'attendee-booked' } as never)

    const payload = await zoomSection('user-booked')

    expect(payload.text).toContain('Ти записана на Zoom-практику ФОКУСУ.')
    expect(payload.text).not.toContain('Starway')
    expect(payload.text).not.toContain('ABSystem')
    expect(payload.buttons).toEqual([
      [{ text: 'Переглянути запис', web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar' } }],
    ])
  })

  it('JOIN_WINDOW state copy is Focus-specific', async () => {
    vi.setSystemTime(new Date('2026-07-27T18:56:00Z'))
    vi.mocked(getUpcomingZoom).mockResolvedValue({
      id: 'zoom-join',
      scheduledAt: new Date('2026-07-27T19:00:00Z'),
      requests: { zoomLink: 'https://zoom.example/live' },
    } as never)
    vi.mocked(prisma.zoomSessionAttendee.findUnique).mockResolvedValue({ id: 'attendee-live' } as never)

    const payload = await zoomSection('user-live')

    expect(payload.text).toBe('Zoom-практика ФОКУСУ починається зараз.')
    expect(payload.buttons).toEqual([
      [{ text: 'Приєднатися', url: 'https://zoom.example/live' }],
    ])
  })

  it('NO_SESSION state copy has no fake CTA', async () => {
    vi.mocked(getUpcomingZoom).mockResolvedValue(null)

    const payload = await zoomSection('user-no-session')

    expect(payload.text).toBe('Наступну Zoom-практику ще не додано.')
    expect(payload.buttons).toEqual([])
  })

  it('focus ai remains an explicit separate ABSystem upsell action', () => {
    const payload = postZoomAbsystemCtaMessage('user-7')

    expect(JSON.stringify(payload.reply_markup)).toContain('focus:ai')
  })
})
