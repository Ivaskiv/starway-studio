import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  claimAbTestCallbackInteraction,
  deactivateCallbackMarkup,
  isAbTestConversionCallback,
  shouldDedupeAbTestCallback,
} from './abTest.callback.js'

function createCtx(action = 'show_inside_STATE', messageId = 99) {
  return {
    chat: { id: 42 },
    from: { id: 42 },
    callbackQuery: {
      id: 'cb-1',
      data: action,
      message: {
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: 'ПРО ПРОГРАМУ', callback_data: action }]],
        },
      },
    },
    editMessageReplyMarkup: vi.fn(async () => undefined),
  } as never
}

describe('abTest callback dedupe and markup behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'))
  })

  it('keeps inline button text unchanged after callback press', async () => {
    const ctx = createCtx()

    await deactivateCallbackMarkup(ctx)

    expect(ctx.editMessageReplyMarkup).not.toHaveBeenCalled()
  })

  it('dedupes the same non-conversion callback on the same message', async () => {
    const ctx = createCtx('show_inside_STATE', 77)

    const first = await claimAbTestCallbackInteraction(ctx, 'user-1', 'show_inside_STATE')
    const second = await claimAbTestCallbackInteraction(ctx, 'user-1', 'show_inside_STATE')

    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('does not dedupe conversion callbacks', async () => {
    const ctx = createCtx('open_focus_payment', 77)

    expect(isAbTestConversionCallback('open_focus_payment')).toBe(true)
    expect(shouldDedupeAbTestCallback('open_focus_payment')).toBe(false)
    expect(await claimAbTestCallbackInteraction(ctx, 'user-1', 'open_focus_payment')).toBe(true)
    expect(await claimAbTestCallbackInteraction(ctx, 'user-1', 'open_focus_payment')).toBe(true)
  })
})
