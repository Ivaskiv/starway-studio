import { beforeEach, describe, expect, it, vi } from 'vitest'

const { replyOrEditPanelMessage } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
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

vi.mock('../../../../../src/bot/flows/contentPlanner.flow.ts', () => ({
  handleCoachContentAction: vi.fn(async () => false),
  handleCoachContentCommand: vi.fn(async () => true),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/audio.ts', () => ({
  handleCoachAudioAction: vi.fn(),
  handleCoachAudioCommand: vi.fn(),
  showCoachAudioLibraryMonth: vi.fn(),
  showCoachAudioLibrarySession: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/notifications.ts', () => ({
  handleCoachNotifyCommand: vi.fn(),
}))

const { handleCoachPaymentsCommand } = vi.hoisted(() => ({
  handleCoachPaymentsCommand: vi.fn(),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/payments.ts', () => ({
  handleCoachPaymentsCommand,
}))

vi.mock('../../../../../src/bot/handlers/coach-content/users.ts', () => ({
  handleCoachUsersCommand: vi.fn(),
}))

import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { coachContent } from '../../../../../src/bot/content/coachContent.content.ts'
import { handleCoachContentCommand } from '../../../../../src/bot/flows/contentPlanner.flow.ts'
import {
  handleCoachPanelAction,
  showCoachContentWorkspace,
} from '../../../../../src/bot/handlers/coach-content/actions.ts'

function createCtx() {
  return {
    answerCbQuery: vi.fn(async () => undefined),
    callbackQuery: { data: 'coach-content:create' },
  }
}

describe('coach content workspace actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create-content format chooser without unsupported buttons', async () => {
    const ctx = createCtx()

    const handled = await handleCoachPanelAction(ctx as never, 'coach-content:create')

    expect(handled).toBe(true)
    expect(handleCoachContentCommand).not.toHaveBeenCalled()
    expect(replyOrEditPanelMessage).toHaveBeenCalledWith(
      ctx,
      `${coachBotContent.contentWorkspace.createTitle}\n\n${coachBotContent.contentWorkspace.createSubtitle}`,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [expect.objectContaining({ text: coachContent.mode.REELS_IDEAS })],
            [expect.objectContaining({ text: coachContent.mode.FULL_CONTENT })],
            [expect.objectContaining({ text: coachBotContent.contentWorkspace.actions.back })],
          ],
        }),
      }),
    )

    const [, , extra] = replyOrEditPanelMessage.mock.calls[0]
    const buttons = JSON.stringify(extra.reply_markup.inline_keyboard)
    expect(buttons).not.toContain('ЧЕРНЕТКИ')
    expect(buttons).not.toContain('ОПУБЛІКОВАНЕ')
    expect(buttons).not.toContain('promptId')
    expect(buttons).not.toContain('provider')
    expect(buttons).not.toContain('model')
  })

  it('delegates supported generation formats into existing planner owner only after explicit selection', async () => {
    const ctx = createCtx()

    await showCoachContentWorkspace(ctx as never)
    await handleCoachPanelAction(ctx as never, 'coach-content:create:reels')
    await handleCoachPanelAction(ctx as never, 'coach-content:create:full')

    expect(handleCoachContentCommand).toHaveBeenNthCalledWith(1, ctx, 'REELS_IDEAS')
    expect(handleCoachContentCommand).toHaveBeenNthCalledWith(2, ctx, 'FULL_CONTENT')
  })

  it('routes supported payments callbacks into the existing payments owner only', async () => {
    const ctx = createCtx()

    await handleCoachPanelAction(ctx as never, 'coach-content:payments')
    await handleCoachPanelAction(ctx as never, 'coach-content:payments:history')
    await handleCoachPanelAction(ctx as never, 'coach-content:payments:issues')

    expect(handleCoachPaymentsCommand).toHaveBeenNthCalledWith(1, ctx)
    expect(handleCoachPaymentsCommand).toHaveBeenNthCalledWith(2, ctx, 'history')
    expect(handleCoachPaymentsCommand).toHaveBeenNthCalledWith(3, ctx, 'issues')
  })
})
