import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { buildFallbackResearch,shouldUseFallbackResearch } from './fallback.js'
import { generateResearch,RESEARCH_CONFIGS } from './generator.js'
import type { CachedEnvelope,CampaignRecord,FormulaRecord,HookRecord,ResearchPlatform,ResearchType,TrendRecord } from './types.js'

export type MarketResearchPayload = {
  hooks: CachedEnvelope<{ hooks: HookRecord[] }> | null
  ads: CachedEnvelope<{ campaigns: CampaignRecord[] }> | null
  formulas: CachedEnvelope<{ formulas: FormulaRecord[] }> | null
  reelsTrends: CachedEnvelope<{ trends: TrendRecord[] }> | null
}

let activeRefreshPromise: Promise<{ success: boolean; updated: number; errors: string[] }> | null = null
let marketResearchTableAvailable: boolean | null = null

async function ensureMarketResearchTableAvailable() {
  if (marketResearchTableAvailable !== null) return marketResearchTableAvailable

  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'MarketResearchCache'
    ) AS "exists"
  `

  marketResearchTableAvailable = rows[0]?.exists === true
  return marketResearchTableAvailable
}

function getValidUntil(days = 30) {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next
}

function toCachedEnvelope<TData>(record: { data: unknown; generatedAt: Date; model?: string | null }): CachedEnvelope<TData> {
  const isFallback = Boolean(record.model?.startsWith('fallback:'))
  return {
    data: record.data as TData,
    generatedAt: record.generatedAt.toISOString(),
    isStale: Date.now() - record.generatedAt.getTime() > 25 * 24 * 60 * 60 * 1000,
    isFallback,
    source: isFallback ? 'fallback' : 'openai',
  }
}

export async function refreshMarketResearch() {
  if (!(await ensureMarketResearchTableAvailable())) {
    return {
      success: false,
      updated: 0,
      errors: ['market_research_cache_table_missing'],
    }
  }

  if (activeRefreshPromise) return activeRefreshPromise

  activeRefreshPromise = (async () => {
    const errors: string[] = []
    let updated = 0
    const validUntil = getValidUntil(30)

    for (const config of RESEARCH_CONFIGS) {
      try {
        let data: unknown
        let model = 'gpt-4o-mini'

        try {
          data = await generateResearch(config)
        } catch (error) {
          if (!shouldUseFallbackResearch(error)) {
            throw error
          }
          data = buildFallbackResearch(config)
          model = 'fallback:gpt-4o-mini'
          errors.push(
            `${config.type}/${config.platform}: fallback_used_due_to_${error instanceof Error ? error.message : 'unknown_error'}`,
          )
        }

        await prisma.marketResearchCache.updateMany({
          where: {
            type: config.type,
            platform: config.platform,
            niche: 'coaching_personal_dev',
          },
          data: {
            validUntil: new Date(0),
          },
        })

        await prisma.marketResearchCache.create({
          data: {
            type: config.type,
            platform: config.platform,
            niche: 'coaching_personal_dev',
            data: data as Prisma.InputJsonValue,
            generatedAt: new Date(),
            validUntil,
            promptUsed: config.prompt.slice(0, 1000),
            model,
          },
        })

        updated += 1
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        errors.push(
          `${config.type}/${config.platform}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors,
    }
  })()

  try {
    return await activeRefreshPromise
  } finally {
    activeRefreshPromise = null
  }
}

export async function getResearchData<TData>(type: ResearchType, platform: ResearchPlatform = 'instagram') {
  if (!(await ensureMarketResearchTableAvailable())) {
    return null
  }

  const record = await prisma.marketResearchCache.findFirst({
    where: {
      type,
      platform,
      validUntil: { gt: new Date() },
    },
    orderBy: {
      generatedAt: 'desc',
    },
  })

  return record ? toCachedEnvelope<TData>(record) : null
}

async function ensureResearchSeeded() {
  if (!(await ensureMarketResearchTableAvailable())) return

  const count = await prisma.marketResearchCache.count({
    where: {
      validUntil: { gt: new Date() },
    },
  })

  if (count > 0) return
  await refreshMarketResearch()
}

export async function getAllResearchData(): Promise<MarketResearchPayload> {
  await ensureResearchSeeded()

  const [hooks, ads, formulas, reelsTrends] = await Promise.all([
    getResearchData<{ hooks: HookRecord[] }>('hooks', 'instagram'),
    getResearchData<{ campaigns: CampaignRecord[] }>('ads', 'instagram'),
    getResearchData<{ formulas: FormulaRecord[] }>('formulas', 'instagram'),
    getResearchData<{ trends: TrendRecord[] }>('reels_trends', 'instagram'),
  ])

  return { hooks, ads, formulas, reelsTrends }
}

export { storeWeeklySocialProofArtifacts } from './social-proof.service.js'
export type { WeeklySocialProofInput,WeeklySocialProofTranscript } from './social-proof.service.js'
