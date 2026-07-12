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
    id: 'golden-user-id',
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

beforeEach(() => {
  vi.mocked(resolveTelegramProductSummary).mockReset()
  vi.mocked(resolveTelegramProductSummary).mockResolvedValue(null)
})

describe('Golden Master — /start screens per lifecycleState', () => {
  it('NEW_USER', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'NEW_USER' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('TEST_NOT_STARTED', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_NOT_STARTED' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('TEST_IN_PROGRESS (recent)', async () => {
    const screen = await buildHomeScreen(
      makeSnapshot({ lifecycleState: 'TEST_IN_PROGRESS', updatedAt: new Date() }),
      fakeCtx,
    )
    expect(screen).toMatchSnapshot()
  })

  it('TEST_IN_PROGRESS (stale, >168h)', async () => {
    const staleDate = new Date(Date.now() - 200 * 3_600_000)
    const screen = await buildHomeScreen(
      makeSnapshot({ lifecycleState: 'TEST_IN_PROGRESS', updatedAt: staleDate }),
      fakeCtx,
    )
    expect(screen).toMatchSnapshot()
  })

  it('TEST_DONE without result (edge case)', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: null }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('TEST_DONE with result', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'TEST_DONE', testResultType: 'action' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('OFFER_SHOWN', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'OFFER_SHOWN' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('FOCUS_PAID — fallback (summary unresolved)', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'FOCUS_PAID' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('FOCUS_PAID — with resolved summary', async () => {
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'FOCUS_PAID' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('ZOOM_MEMBER — fallback (summary unresolved)', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('ZOOM_MEMBER — with resolved summary (composed with Zoom section)', async () => {
    vi.mocked(resolveTelegramProductSummary).mockResolvedValue({
      lines: ['ФОКУС', 'Підписка активна до 01.08.2026'],
      reply_markup: { inline_keyboard: [[{ text: 'Мій прогрес', callback_data: 'focus:progress' }]] },
    } as never)
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'ZOOM_MEMBER' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('POST_ZOOM_1', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'POST_ZOOM_1' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('UPSELL', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'UPSELL' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('EXPIRED', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'EXPIRED' }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })

  it('NEW_USER without firstName — no header line', async () => {
    const screen = await buildHomeScreen(makeSnapshot({ lifecycleState: 'NEW_USER', firstName: null }), fakeCtx)
    expect(screen).toMatchSnapshot()
  })
})
