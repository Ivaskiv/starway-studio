import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Context } from 'telegraf'

import { conversationOrchestrator, planMessage } from './planDelivery.js'

function createContext(updateId = 1): Context {
  return {
    chat: { id: 12345 },
    from: { id: 777 },
    state: {},
    update: { update_id: updateId },
    reply: vi.fn(async () => ({ message_id: 42 })),
    editMessageReplyMarkup: vi.fn(function (
      this: Context,
      ...args: unknown[]
    ) {
      return (this.telegram as typeof this.telegram & {
        editMessageReplyMarkup: (...innerArgs: unknown[]) => Promise<unknown>
      }).editMessageReplyMarkup(...args)
    }),
    telegram: {
      sendMessage: vi.fn(),
      sendPhoto: vi.fn(),
      sendVoice: vi.fn(),
      sendVideo: vi.fn(),
      sendDocument: vi.fn(),
      sendChatAction: vi.fn(),
      answerCbQuery: vi.fn(),
      editMessageReplyMarkup: vi.fn(async () => true),
    },
  } as unknown as Context
}

describe('planDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delivers a normal reply for a single update without marking it as duplicate', async () => {
    const ctx = createContext(101)
    const replySpy = ctx.reply as ReturnType<typeof vi.fn>
    conversationOrchestrator.patchContext(ctx as never)

    await planMessage(ctx, 'ctx.reply', 'start_home_screen', 'Welcome back')

    expect(replySpy).toHaveBeenCalledTimes(1)
    expect(replySpy).toHaveBeenCalledWith('Welcome back', {
      parse_mode: 'HTML',
      reply_markup: undefined,
    })
  })

  it('allows a later reply in the same update after another transport action', async () => {
    const ctx = createContext(202)
    const sendChatActionSpy = ctx.telegram.sendChatAction as ReturnType<typeof vi.fn>
    const replySpy = ctx.reply as ReturnType<typeof vi.fn>
    conversationOrchestrator.patchContext(ctx as never)

    await ctx.telegram.sendChatAction(12345, 'typing')
    await planMessage(ctx, 'ctx.reply', 'start_home_screen', 'Welcome back')

    expect(sendChatActionSpy).toHaveBeenCalledTimes(1)
    expect(replySpy).toHaveBeenCalledTimes(1)
  })

  it('preserves telegram reply markup editing for callback flows after patching context', async () => {
    const ctx = createContext(303)
    const editReplyMarkupSpy = ctx.telegram.editMessageReplyMarkup as ReturnType<typeof vi.fn>
    conversationOrchestrator.patchContext(ctx as never)

    await expect(
      ctx.editMessageReplyMarkup?.({ inline_keyboard: [] }),
    ).resolves.toBe(true)

    expect(editReplyMarkupSpy).toHaveBeenCalledTimes(1)
    expect(editReplyMarkupSpy).toHaveBeenCalledWith({
      inline_keyboard: [],
    })
  })
})
