import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coachBotContent } from '../../../content/coachBot.content.ts'
import { registerCoachContentHandlers } from '../index.js'

vi.mock('../../../middleware/coachOnly.middleware.ts', () => ({
  coachOnly: vi.fn(async (_ctx, next) => next()),
}))

vi.mock('../../../flows/contentPlanner.flow.ts', () => ({
  handleCoachContentAction: vi.fn(),
  handleCoachContentCommand: vi.fn(),
  handleCoachContentNote: vi.fn(),
  handleCoachContentText: vi.fn(async (_ctx, next) => next()),
  handleCoachContentZooms: vi.fn(),
}))

vi.mock('../../../db/client.ts', () => ({
  prisma: {},
}))

vi.mock('../../../lib/telegram.ts', () => ({
  sendUserTelegramMessage: vi.fn(),
}))

vi.mock('../../../modules/analytics/service.ts', () => ({
  getCanonicalCoachMetrics: vi.fn(),
  getFunnelStats: vi.fn(),
  getLiveActivity: vi.fn(),
  getOverviewStats: vi.fn(),
  getRetentionStats: vi.fn(),
}))

vi.mock('../../../modules/zoom/audio/cloudinary-audio-ingest.service.ts', () => ({
  findCloudinaryZoomAudioById: vi.fn(),
  ingestCloudinaryZoomAudio: vi.fn(),
}))

vi.mock('../../../core/runtime/outbox.ts', () => ({
  enqueueRuntimeOutboxItem: vi.fn(),
}))

import { handleCoachContentCommand } from '../../../flows/contentPlanner.flow.ts'

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
