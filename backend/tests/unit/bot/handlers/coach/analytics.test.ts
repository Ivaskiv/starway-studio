import { beforeEach, describe, expect, it, vi } from 'vitest'

const { replyOrEditPanelMessage } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
}))

vi.mock('../../../../../src/services/scheduler/daily/coach/data.ts', () => ({
  loadDailyCoachBriefingData: vi.fn(),
}))

vi.mock('../../../../../src/modules/analytics/service.ts', () => ({
  getCanonicalCoachMetrics: vi.fn(),
  getAIInsights: vi.fn(),
  getFounderAnalytics: vi.fn(),
  getBehavioralAnalytics: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.ts', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/bot/handlers/coach-content/shared.ts')
  >('../../../../../src/bot/handlers/coach-content/shared.ts')

  return {
    ...actual,
    replyOrEditPanelMessage,
  }
})

import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import {
  getAIInsights,
  getBehavioralAnalytics,
  getCanonicalCoachMetrics,
  getFounderAnalytics,
} from '../../../../../src/modules/analytics/service.ts'
import { loadDailyCoachBriefingData } from '../../../../../src/services/scheduler/daily/coach/data.ts'
import { analyticsHandler } from '../../../../../src/bot/handlers/coach/analytics.ts'

function createCtx() {
  return {
    chat: { id: 42, type: 'private' },
    reply: vi.fn(async () => undefined),
  }
}

describe('coach analytics presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders coach analytics via canonical formatter without debug labels or AI owners', async () => {
    vi.mocked(loadDailyCoachBriefingData).mockResolvedValue({
      newUsers: 4,
      testsCompleted: 7,
      focusPaidUsers: 3,
      monthRevenue: [{ currency: 'EUR', count: 5, sumCents: 123450 }],
    } as never)

    const ctx = createCtx()

    await analyticsHandler(ctx as never)

    expect(replyOrEditPanelMessage).toHaveBeenCalledTimes(1)
    expect(ctx.reply).not.toHaveBeenCalled()

    const [, text, extra] = replyOrEditPanelMessage.mock.calls[0]
    expect(extra).toBeUndefined()

    expect(text).toContain(coachBotContent.analytics.title)
    expect(text).toContain(coachBotContent.analytics.today)
    expect(text).toContain('Нові учасники: 4')
    expect(text).toContain('Завершили тест: 7')
    expect(text).toContain('Приєдналися до ФОКУСУ: 3')
    expect(text).toContain('Тест → ФОКУС: 43%')
    expect(text).toContain('1234.50 EUR')

    expect(text).not.toContain('Analytics')
    expect(text).not.toContain('Revenue')
    expect(text).not.toContain('MRR')
    expect(text).not.toContain('📊')
    expect(text).not.toContain('💰')
    expect(text).not.toContain('🚀')
    expect(text).not.toContain('ВОРОНКА')
    expect(text).not.toContain('ПРОДУКТИ')
    expect(text).not.toContain('ПОВНА АНАЛІТИКА')
    expect(text).not.toContain('Активні у Zoom:')

    expect(loadDailyCoachBriefingData).toHaveBeenCalledTimes(1)
    expect(getCanonicalCoachMetrics).not.toHaveBeenCalled()
    expect(getAIInsights).not.toHaveBeenCalled()
    expect(getFounderAnalytics).not.toHaveBeenCalled()
    expect(getBehavioralAnalytics).not.toHaveBeenCalled()
  })

  it('renders no-data state through canonical formatter', async () => {
    vi.mocked(loadDailyCoachBriefingData).mockResolvedValue({
      newUsers: 0,
      testsCompleted: 0,
      focusPaidUsers: 0,
      monthRevenue: [],
    } as never)

    const ctx = createCtx()

    await analyticsHandler(ctx as never)

    const [, text] = replyOrEditPanelMessage.mock.calls[0]
    expect(text).toBe(`${coachBotContent.analytics.title}\n\n${coachBotContent.analytics.noData}`)
  })
})
