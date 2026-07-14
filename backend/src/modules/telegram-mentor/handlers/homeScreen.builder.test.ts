import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildHomeScreen } from './homeScreen.builder.js'
import type { StartUserSnapshot } from './start.js'
import type { StartContext } from './start.shared.js'

vi.mock('../services/productSummary.service.js', () => ({
  resolveTelegramProductSummary: vi.fn(),
}))

import { resolveTelegramProductSummary } from '../services/productSummary.service.js'

function makeSnapshot(overrides: Partial<StartUserSnapshot>): StartUserSnapshot {
  return {
    id: 'test-user-id',
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

const fakeCtx = {} as StartContext

beforeEach(() => {
  vi.mocked(resolveTelegramProductSummary).mockReset()
})

describe('buildHomeScreen — /start funnel regression', () => {
  it('NEW_USER: shows welcome and test CTA', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'NEW_USER', firstName: 'Віра' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('👋 Віра')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/тест/i)
  })

  it('TEST_DONE with result: shows result and retake options, not the buy CTA', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: 'action' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Ти вже пройшла тест')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/ab_test:show_result/)
    expect(flat).toMatch(/ab_test:restart/)
  })

  it('ZOOM_MEMBER with resolved summary: composes subscription section AND Zoom buttons together', async () => {
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)

    const snapshot = makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Підписка активна')
    expect(screen.text).toContain('Ти в Zoom-групі')
    const flat = JSON.stringify(screen.reply_markup)
    expect(flat).toMatch(/focus:next_zoom/)
    expect(flat).toMatch(/focus:progress/)
  })

  it('ZOOM_MEMBER with unresolved summary: falls back to standalone Zoom message, still shows Zoom buttons', async () => {
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue(null)

    const snapshot = makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('Ти в Zoom-групі')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/focus:next_zoom/)
  })

  it('POST_ZOOM_1: shows soft upgrade content, not the generic AI Mentor menu', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'POST_ZOOM_1' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).not.toContain('Переходимо в AI Mentor режим')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/focus:next_zoom/)
  })

  it('UPSELL: shows hard upgrade content, distinct from POST_ZOOM_1', async () => {
    const zoomSnapshot = makeSnapshot({ lifecycleState: 'POST_ZOOM_1' })
    const upsellSnapshot = makeSnapshot({ lifecycleState: 'UPSELL' })

    const zoomScreen = await buildHomeScreen(zoomSnapshot, fakeCtx)
    const upsellScreen = await buildHomeScreen(upsellSnapshot, fakeCtx)

    expect(upsellScreen.text).not.toEqual(zoomScreen.text)
  })

  it('EXPIRED: shows winback message with restore CTA, distinct from POST_ZOOM_1/UPSELL', async () => {
    const snapshot = makeSnapshot({ lifecycleState: 'EXPIRED' })
    const screen = await buildHomeScreen(snapshot, fakeCtx)

    expect(screen.text).toContain('доступ')
    expect(JSON.stringify(screen.reply_markup)).toMatch(/open_focus_payment/)
  })

  it('every known lifecycleState produces non-empty text and at least one button', async () => {
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue(null)
    const states: StartUserSnapshot['lifecycleState'][] = [
      'NEW_USER', 'TEST_NOT_STARTED', 'TEST_IN_PROGRESS', 'TEST_DONE', 'OFFER_SHOWN',
      'FOCUS_PAID', 'ZOOM_MEMBER', 'POST_ZOOM_1', 'UPSELL', 'EXPIRED',
    ]

    for (const state of states) {
      const snapshot = makeSnapshot({ lifecycleState: state, testResultType: state === 'TEST_DONE' ? 'action' : null })
      const screen = await buildHomeScreen(snapshot, fakeCtx)
      expect(screen.text.trim().length, `state ${state} produced empty text`).toBeGreaterThan(0)
      expect(screen.reply_markup.inline_keyboard.length, `state ${state} produced zero buttons`).toBeGreaterThan(0)
    }
  })
})
