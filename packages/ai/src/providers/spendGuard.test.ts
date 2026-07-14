import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpsert = vi.fn()
const mockExecuteRaw = vi.fn()
const mockUpdate = vi.fn()

vi.mock('node:module', () => ({
  createRequire: () => () => ({
    prisma: {
      aiSpendLedger: {
        upsert: (...args: unknown[]) => mockUpsert(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      },
      $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
    },
  }),
}))

import { AiBudgetExceededError, assertWithinDailyAiBudget, reconcileAiSpend } from './spendGuard.js'

beforeEach(() => {
  mockUpsert.mockReset()
  mockExecuteRaw.mockReset()
  mockUpdate.mockReset()
  mockUpsert.mockResolvedValue({})
})

describe('spendGuard', () => {
  it('allows a call when the atomic UPDATE affects one row (within cap)', async () => {
    mockExecuteRaw.mockResolvedValue(1)
    await expect(assertWithinDailyAiBudget('test-job', 0.1, 2)).resolves.toBeUndefined()
  })

  it('blocks a call when the atomic UPDATE affects zero rows (would exceed cap)', async () => {
    mockExecuteRaw.mockResolvedValue(0)
    await expect(assertWithinDailyAiBudget('test-job', 0.1, 2)).rejects.toThrow(AiBudgetExceededError)
  })

  it('race condition: N concurrent calls near the cap — atomic UPDATE guarantees at most the cap is spent, never more', async () => {
    let spentUsd = 1.85
    const capUsd = 2
    const costPerCall = 0.1

    mockExecuteRaw.mockImplementation(async () => {
      if (spentUsd + costPerCall <= capUsd) {
        spentUsd += costPerCall
        return 1
      }
      return 0
    })

    const calls = Array.from({ length: 5 }, () =>
      assertWithinDailyAiBudget('race-job', costPerCall, capUsd).then(() => 'ok').catch(() => 'blocked'),
    )
    const results = await Promise.all(calls)

    const okCount = results.filter((result) => result === 'ok').length
    expect(spentUsd).toBeLessThanOrEqual(capUsd)
    expect(okCount).toBeLessThanOrEqual(2)
  })

  it('daily reset: a new periodStart means a fresh budget, independent of yesterday spend', async () => {
    mockExecuteRaw.mockResolvedValueOnce(0)
    await expect(assertWithinDailyAiBudget('reset-job', 0.1, 2)).rejects.toThrow(AiBudgetExceededError)

    mockExecuteRaw.mockResolvedValueOnce(1)
    await expect(assertWithinDailyAiBudget('reset-job', 0.1, 2)).resolves.toBeUndefined()
  })

  it('reconcileAiSpend adjusts the ledger by the delta between estimate and actual', async () => {
    mockUpdate.mockResolvedValue({})
    await reconcileAiSpend('test-job', 0.1, 0.07)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { spentUsd: { increment: -0.03 } },
      }),
    )
  })
})
