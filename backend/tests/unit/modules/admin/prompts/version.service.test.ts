import { beforeEach, describe, expect, it, vi } from 'vitest'

const invalidatePromptCache = vi.fn()
const findFirst = vi.fn()
const updateMany = vi.fn()
const create = vi.fn()
const findUnique = vi.fn()
const update = vi.fn()

const transactionClient = {
  promptVersion: { findFirst, updateMany, create, findUnique, update },
}

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
  },
}))

vi.mock('../../../ai/gateway/index.ts', () => ({
  invalidateTelegramAgentPromptCache: () => invalidatePromptCache(),
}))

import { createPromptVersion } from '../version.service.ts'

describe('createPromptVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirst.mockResolvedValue({ version: 3 })
    updateMany.mockResolvedValue({ count: 1 })
    create.mockResolvedValue({
      id: 'prompt-v4',
      name: 'sales-agent-prompt',
      version: 4,
      content: 'updated prompt',
      isActive: true,
      createdAt: new Date('2026-08-14T10:00:00Z'),
    })
    invalidatePromptCache.mockResolvedValue(undefined)
  })

  it('deactivates the previous version and creates one active version atomically before invalidating runtime cache', async () => {
    const result = await createPromptVersion({
      name: 'sales-agent-prompt',
      content: 'updated prompt',
      isActive: true,
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { name: 'sales-agent-prompt', isActive: true },
      data: { isActive: false },
    })
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'sales-agent-prompt',
        version: 4,
        content: 'updated prompt',
        isActive: true,
      },
    })
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0])
    expect(invalidatePromptCache).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ id: 'prompt-v4', version: 4, isActive: true })
  })
})
