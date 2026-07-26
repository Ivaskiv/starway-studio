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
    telegram: {
      sendMessage: vi.fn(),
      sendPhoto: vi.fn(),
      sendVoice: vi.fn(),
      sendVideo: vi.fn(),
      sendDocument: vi.fn(),
      sendChatAction: vi.fn(),
      answerCbQuery: vi.fn(),
    },
  } as unknown as Context
}

describe('planDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delivers a normal reply for a single update without marking it as duplicate', async () => {
    const ctx = createContext(101)
    conversationOrchestrator.patchContext(ctx as never)

    await planMessage(ctx, 'ctx.reply', 'start_home_screen', 'Welcome back')

    expect(ctx.reply).toHaveBeenCalledTimes(1)
  })

  it('allows a later reply in the same update after another transport action', async () => {
    const ctx = createContext(202)
    conversationOrchestrator.patchContext(ctx as never)

    await ctx.telegram.sendChatAction(12345, 'typing')
    await planMessage(ctx, 'ctx.reply', 'start_home_screen', 'Welcome back')

    expect(ctx.telegram.sendChatAction).toHaveBeenCalledTimes(1)
    expect(ctx.reply).toHaveBeenCalledTimes(1)
  })
})
