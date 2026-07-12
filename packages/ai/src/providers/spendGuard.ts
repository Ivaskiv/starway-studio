import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type AiSpendLedgerClient = {
  upsert(args: {
    where: { jobKey_periodStart: { jobKey: string; periodStart: Date } }
    create: { jobKey: string; periodStart: Date; spentUsd: number; callCount: number; dailyCapUsd: number }
    update: Record<string, never>
  }): Promise<{ spentUsd: number }>
  update(args: {
    where: { jobKey_periodStart: { jobKey: string; periodStart: Date } }
    data: { spentUsd: { increment: number }; callCount: { increment: number } }
  }): Promise<unknown>
}

function getPrisma(): { aiSpendLedger: AiSpendLedgerClient } {
  return require('../../../../backend/src/db/client.js').prisma as { aiSpendLedger: AiSpendLedgerClient }
}

function startOfUtcDay(date = new Date()): Date {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

export class AiBudgetExceededError extends Error {
  constructor(jobKey: string, spentUsd: number, capUsd: number) {
    super(`AI budget exceeded for job "${jobKey}": spent $${spentUsd.toFixed(2)} of $${capUsd.toFixed(2)} daily cap`)
    this.name = 'AiBudgetExceededError'
  }
}

export async function assertWithinDailyAiBudget(
  jobKey: string,
  estimatedCostUsd: number,
  dailyCapUsd: number,
): Promise<void> {
  const periodStart = startOfUtcDay()
  const ledger = await getPrisma().aiSpendLedger.upsert({
    where: { jobKey_periodStart: { jobKey, periodStart } },
    create: { jobKey, periodStart, spentUsd: 0, callCount: 0, dailyCapUsd },
    update: {},
  })

  if (ledger.spentUsd + estimatedCostUsd > dailyCapUsd) {
    throw new AiBudgetExceededError(jobKey, ledger.spentUsd, dailyCapUsd)
  }
}

export async function recordAiSpend(jobKey: string, actualCostUsd: number): Promise<void> {
  const periodStart = startOfUtcDay()
  await getPrisma().aiSpendLedger.update({
    where: { jobKey_periodStart: { jobKey, periodStart } },
    data: { spentUsd: { increment: actualCostUsd }, callCount: { increment: 1 } },
  })
}
