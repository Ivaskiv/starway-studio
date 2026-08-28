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

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
  },
}))

vi.mock('../../../../../src/modules/ai/gateway/index.js', () => ({
  invalidateTelegramAgentPromptCache: () => invalidatePromptCache(),
}))

import { activatePromptVersion, createPromptVersion } from '../../../../../src/modules/admin/prompts/version.service.js'

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

  it('creates a new inactive immutable version without changing the current active version or invalidating runtime cache', async () => {
    create.mockResolvedValueOnce({
      id: 'prompt-v4-inactive',
      name: 'sales-agent-prompt',
      version: 4,
      content: 'draft prompt',
      isActive: false,
      createdAt: new Date('2026-08-14T11:00:00Z'),
    })

    const result = await createPromptVersion({
      name: 'sales-agent-prompt',
      content: 'draft prompt',
      isActive: false,
    })

    expect(updateMany).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'sales-agent-prompt',
        version: 4,
        content: 'draft prompt',
        isActive: false,
      },
    })
    expect(invalidatePromptCache).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: 'prompt-v4-inactive', version: 4, isActive: false })
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

  it('reactivates a previous immutable version for rollback without rewriting content', async () => {
    findUnique.mockResolvedValue({
      id: 'prompt-v2',
      name: 'sales-agent-prompt',
      version: 2,
      content: 'older prompt',
      isActive: false,
    })
    update.mockResolvedValue({
      id: 'prompt-v2',
      name: 'sales-agent-prompt',
      version: 2,
      content: 'older prompt',
      isActive: true,
    })

    const result = await activatePromptVersion('prompt-v2')

    expect(updateMany).toHaveBeenCalledWith({
      where: { name: 'sales-agent-prompt', isActive: true },
      data: { isActive: false },
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'prompt-v2' },
      data: { isActive: true },
    })
    expect(result).toMatchObject({ id: 'prompt-v2', version: 2, isActive: true })
  })
})
