import { beforeEach, describe, expect, it, vi } from 'vitest'

const findActivePrompt = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    promptVersion: {
      findFirst: (...args: unknown[]) => findActivePrompt(...args),
    },
  },
}))

import { TelegramAgentGateway } from '../index.ts'

describe('TelegramAgentGateway prompt lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the newly active DB prompt on the next execution after canonical cache invalidation', async () => {
    let activeContent = 'old active prompt'
    findActivePrompt.mockImplementation(async () => ({ content: activeContent }))
    const receivedPrompts: string[] = []
    const gateway = new TelegramAgentGateway({
      aiProvider: {
        execute: vi.fn(async ({ prompt }) => {
          receivedPrompts.push(prompt.content)
          return {
            content: 'pricing',
            metadata: { provider: 'test', model: 'test-model' },
          }
        }),
      },
    })
    const request = {
      key: 'telegram_intelligence' as const,
      bot: 'admin' as const,
      chatId: 'admin-prompt-test',
      message: 'Скільки коштує продукт?',
    }

    await gateway.executeTargetedAgentTest(request)
    activeContent = 'new active prompt'
    await gateway.invalidatePromptCache()
    await gateway.executeTargetedAgentTest(request)

    expect(receivedPrompts).toEqual(['old active prompt', 'new active prompt'])
    expect(findActivePrompt).toHaveBeenCalledTimes(2)
  })
})
