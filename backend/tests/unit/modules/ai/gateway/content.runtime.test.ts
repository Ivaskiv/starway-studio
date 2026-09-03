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

describe('TelegramAgentGateway content registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes the canonical content agent with the active content prompt owner', async () => {
    findActivePrompt.mockResolvedValue({
      content: 'ACTIVE CONTENT PROMPT',
      version: 11,
    })
    const receivedPrompts: string[] = []
    const gateway = new TelegramAgentGateway({
      aiProvider: {
        execute: vi.fn(async ({ prompt }) => {
          receivedPrompts.push(prompt.content)
          return {
            content: 'Готовий контент-план.',
            metadata: {
              provider: 'anthropic',
              model: 'claude-sonnet-4-5',
            },
          }
        }),
      },
    })

    const result = await gateway.executeTargetedAgentTest({
      key: 'content',
      bot: 'coach',
      chatId: 'coach-chat-1',
      message: 'Підготуй 3 Reels і 1 CTA.',
    })

    expect(result.agentId).toBe('content_agent')
    expect(result.artifact.payload).toMatchObject({
      response: 'Готовий контент-план.',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
    })
    expect(receivedPrompts).toEqual(['ACTIVE CONTENT PROMPT'])
    expect(findActivePrompt).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        name: 'content-agent-prompt',
        isActive: true,
      }),
    }))
  })
})
