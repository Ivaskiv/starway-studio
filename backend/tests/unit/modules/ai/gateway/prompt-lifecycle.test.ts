import { beforeEach, describe, expect, it, vi } from 'vitest'

const findActivePrompt = vi.fn()

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    promptVersion: {
      findFirst: (...args: unknown[]) => findActivePrompt(...args),
    },
  },
}))

import { TelegramAgentGateway } from '../../../../../src/modules/ai/gateway/index.js'

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
      key: 'sales' as const,
      bot: 'admin' as const,
      chatId: 'admin-prompt-test',
      message: 'Скільки коштує продукт?',
    }

    await gateway.executeTargetedAgentTest(request)
    activeContent = 'new active prompt'
    await gateway.invalidatePromptCache()
    await gateway.executeTargetedAgentTest(request)

    expect(receivedPrompts).toEqual(['old active prompt', 'new active prompt'])
    expect(findActivePrompt).toHaveBeenCalledTimes(4)
  })

  it('uses draft prompt override only for the scoped draft test and keeps the active version unchanged for normal runtime execution', async () => {
    let activeContent = 'active prompt version'
    findActivePrompt.mockImplementation(async () => ({ content: activeContent, version: 4 }))
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

    await gateway.executeDraftAgentTest({
      key: 'sales',
      bot: 'admin',
      chatId: 'admin-draft-test',
      promptContent: 'draft prompt override',
      message: 'Скільки коштує продукт?',
    })

    await gateway.executeTargetedAgentTest({
      key: 'sales',
      bot: 'admin',
      chatId: 'admin-draft-test',
      message: 'Скільки коштує продукт?',
    })

    expect(activeContent).toBe('active prompt version')
    expect(receivedPrompts).toEqual(['draft prompt override', 'active prompt version'])
  })
})
