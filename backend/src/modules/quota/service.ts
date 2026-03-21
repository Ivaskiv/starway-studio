import { prisma } from '../../db/client.js'
import type { GenerationQuota, GenerationType } from '@prisma/client'

const BASE_LIMIT = 33

type PrismaClientType = typeof prisma

let quotaDb: PrismaClientType = prisma
export function setQuotaDb(client: PrismaClientType) {
  quotaDb = client
}

function getCurrentPeriodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function isSamePeriod(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
}

function calculateAvailable(quota: GenerationQuota) {
  return quota.baseLimit + quota.purchased - quota.used
}

export async function getOrCreateQuota(userId: string): Promise<GenerationQuota> {
  const now = getCurrentPeriodStart()
  const existing = await quotaDb.generationQuota.findUnique({ where: { userId } })
  if (!existing) {
    return quotaDb.generationQuota.create({
      data: {
        userId,
        periodStart: now,
        used: 0,
        purchased: 0,
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalCostUsd: 0,
        baseLimit: BASE_LIMIT,
      },
    })
  }

  if (!isSamePeriod(existing.periodStart, now)) {
    return quotaDb.generationQuota.update({
      where: { userId },
      data: {
        periodStart: now,
        used: 0,
        purchased: 0,
      },
    })
  }

  return existing
}

export async function checkQuota(userId: string): Promise<boolean> {
  const quota = await getOrCreateQuota(userId)
  return calculateAvailable(quota) > 0
}

export async function decrementQuota(params: {
  userId: string
  type: GenerationType
  costUsd: number
  tokensInput?: number
  tokensOutput?: number
  productId?: string | null
  taskPrompt?: string | null
  model?: string
}): Promise<GenerationQuota> {
  const quota = await getOrCreateQuota(params.userId)
  const available = calculateAvailable(quota)
  if (available <= 0) {
    throw new Error('quota_exhausted')
  }

  const updatedQuota = await quotaDb.generationQuota.update({
    where: { userId: params.userId },
    data: {
      used: { increment: 1 },
      totalTokensInput: { increment: params.tokensInput ?? 0 },
      totalTokensOutput: { increment: params.tokensOutput ?? 0 },
      totalCostUsd: { increment: params.costUsd },
    },
  })

  await quotaDb.generationLog.create({
    data: {
      userId: params.userId,
      productId: params.productId ?? null,
      type: params.type,
      model: params.model ?? 'gpt-4o-mini',
      tokensInput: params.tokensInput ?? 0,
      tokensOutput: params.tokensOutput ?? 0,
      costUsd: params.costUsd,
      taskPrompt: params.taskPrompt,
    },
  })

  return updatedQuota
}

export async function purchaseQuota(userId: string, amount: number, costUsd?: number): Promise<GenerationQuota> {
  const quota = await getOrCreateQuota(userId)
  return quotaDb.generationQuota.update({
    where: { userId },
    data: {
      purchased: { increment: amount },
      totalCostUsd: { increment: costUsd ?? 0 },
    },
  })
}

export async function resetMonthlyQuota(referenceDate = new Date()) {
  const periodStart = getCurrentPeriodStart(referenceDate)
  return quotaDb.generationQuota.updateMany({
    where: {
      periodStart: {
        lt: periodStart,
      },
    },
    data: {
      periodStart,
      used: 0,
      purchased: 0,
    },
  })
}

export function getAvailableQuota(quota: GenerationQuota) {
  return calculateAvailable(quota)
}
