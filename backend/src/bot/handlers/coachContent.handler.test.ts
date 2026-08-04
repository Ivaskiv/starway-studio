import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coachBotContent } from '../content/coachBot.content.js'
import { registerCoachContentHandlers } from './coachContent.handler.js'

vi.mock('../../middleware/coachOnly.middleware.js', () => ({
  coachOnly: vi.fn(async (_ctx, next) => next()),
}))

vi.mock('../flows/contentPlanner.flow.js', () => ({
  handleCoachContentAction: vi.fn(),
  handleCoachContentCommand: vi.fn(),
  handleCoachContentNote: vi.fn(),
  handleCoachContentText: vi.fn(async (_ctx, next) => next()),
  handleCoachContentZooms: vi.fn(),
}))

vi.mock('../../db/client.js', () => ({
  prisma: {},
}))

vi.mock('../../lib/telegram.js', () => ({
  sendUserTelegramMessage: vi.fn(),
}))

vi.mock('../../modules/analytics/service.js', () => ({
  getCanonicalCoachMetrics: vi.fn(),
  getFunnelStats: vi.fn(),
  getLiveActivity: vi.fn(),
  getOverviewStats: vi.fn(),
  getRetentionStats: vi.fn(),
}))

vi.mock('../../modules/zoom/cloudinary-audio-ingest.service.js', () => ({
  findCloudinaryZoomAudioById: vi.fn(),
  ingestCloudinaryZoomAudio: vi.fn(),
}))

vi.mock('../../core/runtime/runtimeOutbox.js', () => ({
  enqueueRuntimeOutboxItem: vi.fn(),
}))

import { handleCoachContentCommand } from '../flows/contentPlanner.flow.js'

type RegisteredHandler = (ctx: any) => Promise<unknown> | unknown

function createTelegramBotMock() {
  return {
    hears: vi.fn(),
    action: vi.fn(),
    on: vi.fn(),
  }
}

describe('registerCoachContentHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes the visible Контент menu button to weekly planner flow', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachContentHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test(coachBotContent.menu.content),
    )

    const handler = hearsCall?.[2] as RegisteredHandler
    const ctx = {}

    await handler(ctx)

    expect(handleCoachContentCommand).toHaveBeenCalledWith(ctx, 'WEEKLY_PLAN')
  })
})
