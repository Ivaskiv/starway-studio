import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type AiSpendLedgerClient = {
  upsert(args: {
    where: { jobKey_periodStart: { jobKey: string; periodStart: Date } }
    create: { jobKey: string; periodStart: Date; spentUsd: number; callCount: number; dailyCapUsd: number }
    update: Record<string, never>
  }): Promise<unknown>
  update(args: {
    where: { jobKey_periodStart: { jobKey: string; periodStart: Date } }
    data: { spentUsd: { increment: number } }
  }): Promise<unknown>
}

type SpendGuardPrisma = {
  aiSpendLedger: AiSpendLedgerClient
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>
}

function getPrisma(): SpendGuardPrisma {
  return require('../../../../backend/src/db/client.js').prisma as SpendGuardPrisma
}

function startOfUtcDay(date = new Date()): Date {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

export class AiBudgetExceededError extends Error {
  constructor(jobKey: string, capUsd: number) {
    super(`AI budget exceeded for job "${jobKey}": daily cap is $${capUsd.toFixed(2)}`)
    this.name = 'AiBudgetExceededError'
  }
}

// Atomic: ensures the row exists, then attempts the reservation in one conditional
// UPDATE. No separate "read spentUsd, compare, then write" — that gap is exactly
// where two concurrent calls could both pass and both overspend.
export async function assertWithinDailyAiBudget(
  jobKey: string,
  estimatedCostUsd: number,
  dailyCapUsd: number,
): Promise<void> {
  const periodStart = startOfUtcDay()
  const prisma = getPrisma()

  await prisma.aiSpendLedger.upsert({
    where: { jobKey_periodStart: { jobKey, periodStart } },
    create: { jobKey, periodStart, spentUsd: 0, callCount: 0, dailyCapUsd },
    update: {},
  })

  const result = await prisma.$executeRaw`
    UPDATE "ai_spend_ledger"
    SET "spentUsd" = "spentUsd" + ${estimatedCostUsd},
        "callCount" = "callCount" + 1,
        "updatedAt" = now()
    WHERE "jobKey" = ${jobKey}
      AND "periodStart" = ${periodStart}
      AND "spentUsd" + ${estimatedCostUsd} <= "dailyCapUsd"
  `

  if (result === 0) {
    throw new AiBudgetExceededError(jobKey, dailyCapUsd)
  }
}

// Reconciles the estimate reserved in assertWithinDailyAiBudget with the actual
// measured cost after the call completes. Safe to skip on failure — worst case
// the ledger is slightly conservative (holds the estimate) until next period reset.
export async function reconcileAiSpend(
  jobKey: string,
  estimatedCostUsd: number,
  actualCostUsd: number,
): Promise<void> {
  const periodStart = startOfUtcDay()
  const delta = actualCostUsd - estimatedCostUsd
  if (delta === 0) return

  const prisma = getPrisma()
  await prisma.aiSpendLedger.update({
    where: { jobKey_periodStart: { jobKey, periodStart } },
    data: { spentUsd: { increment: delta } },
  })
}
