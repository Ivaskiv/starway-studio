import { describe, expect, it, vi } from 'vitest'

import { launchBot } from '../../../src/lib/telegram.ts'

describe('launchBot', () => {
  it('returns after starting polling without waiting for the polling loop to finish', async () => {
    let resolvePollingLoop: (() => void) | null = null
    const pollingLoop = new Promise<void>((resolve) => {
      resolvePollingLoop = resolve
    })
    const launch = vi.fn(() => pollingLoop)
    const targetBot = {
      telegram: {
        deleteWebhook: vi.fn(async () => undefined),
      },
      launch,
    } as never

    await expect(launchBot(targetBot, 'Coach')).resolves.toBeUndefined()

    expect(targetBot.telegram.deleteWebhook).toHaveBeenCalledWith({
      drop_pending_updates: false,
    })
    expect(launch).toHaveBeenCalledWith({
      dropPendingUpdates: false,
    })

    resolvePollingLoop?.()
    await pollingLoop
  })
})
