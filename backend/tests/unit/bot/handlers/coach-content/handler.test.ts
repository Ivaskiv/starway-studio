import { beforeEach, describe, expect, it, vi } from 'vitest'

import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { registerCoachContentHandlers } from '../../../../../src/bot/handlers/coach-content/index.ts'

vi.mock('../../../../../src/middleware/coachOnly.middleware.ts', () => ({
  coachOnly: vi.fn(async (_ctx, next) => next()),
}))

vi.mock('../../../../../src/bot/flows/contentPlanner.flow.ts', () => ({
  handleCoachContentAction: vi.fn(),
  handleCoachContentCommand: vi.fn(),
  handleCoachContentNote: vi.fn(),
  handleCoachContentText: vi.fn(async (_ctx, next) => next()),
  handleCoachContentZooms: vi.fn(),
}))

const { replyOrEditPanelMessage } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
}))

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {},
}))

vi.mock('../../../../../src/lib/telegram.ts', () => ({
  sendUserTelegramMessage: vi.fn(),
}))

vi.mock('../../../../../src/modules/analytics/service.ts', () => ({
  getCanonicalCoachMetrics: vi.fn(),
  getFunnelStats: vi.fn(),
  getLiveActivity: vi.fn(),
  getOverviewStats: vi.fn(),
  getRetentionStats: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.ts', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/bot/handlers/coach-content/shared.ts')
  >('../../../../../src/bot/handlers/coach-content/shared.ts')

  return {
    ...actual,
    replyOrEditPanelMessage,
    resolveCoachAccess: vi.fn(async () => ({
      id: 'coach-user-id',
      role: 'EXPERT',
      expertId: 'expert-1',
    })),
  }
})

vi.mock('../../../../../src/modules/zoom/audio/cloudinary-audio-ingest.service.ts', () => ({
  findCloudinaryZoomAudioById: vi.fn(),
  ingestCloudinaryZoomAudio: vi.fn(),
}))

vi.mock('../../../../../src/core/runtime/outbox.ts', () => ({
  enqueueRuntimeOutboxItem: vi.fn(),
}))

import { handleCoachContentCommand } from '../../../../../src/bot/flows/contentPlanner.flow.ts'

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

  it('routes the visible Контент menu button to coach content workspace entry', async () => {
    const telegramBot = createTelegramBotMock()
    registerCoachContentHandlers(telegramBot as never)

    const hearsCall = telegramBot.hears.mock.calls.find(([matcher]) =>
      matcher instanceof RegExp && matcher.test(coachBotContent.menu.content),
    )

    const handler = hearsCall?.[2] as RegisteredHandler
    const ctx = { callbackQuery: undefined }

    await handler(ctx)

    expect(handleCoachContentCommand).not.toHaveBeenCalled()
    expect(replyOrEditPanelMessage).toHaveBeenCalledWith(
      ctx,
      `${coachBotContent.contentWorkspace.title}\n\n${coachBotContent.contentWorkspace.subtitle}`,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [expect.objectContaining({ text: coachBotContent.contentWorkspace.actions.plan })],
            [expect.objectContaining({ text: coachBotContent.contentWorkspace.actions.create })],
          ],
        }),
      }),
    )

    const [, , extra] = replyOrEditPanelMessage.mock.calls[0]
    const buttons = JSON.stringify(extra.reply_markup.inline_keyboard)
    expect(buttons).not.toContain('ЧЕРНЕТКИ')
    expect(buttons).not.toContain('ОПУБЛІКОВАНЕ')
  })
})
