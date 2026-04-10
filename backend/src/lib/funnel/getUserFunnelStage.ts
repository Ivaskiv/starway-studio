import type { UserFunnelStage } from '@starway/db/prisma-client'

import { cacheDel, cacheGet, cacheSet } from '../cache/index.js'
import { resolveUserLifecycle } from '../../modules/flow-control/service.js'
import { mapLifecycleToFunnelStage } from './stage.js'

const CACHE_TTL_SECONDS = 300

export async function getUserFunnelStage(userId: string): Promise<UserFunnelStage> {
  const cacheKey = `funnel:${userId}`
  const cached = await cacheGet<UserFunnelStage>(cacheKey)
  if (cached) return cached

  const lifecycle = await resolveUserLifecycle(userId)
  const stage = mapLifecycleToFunnelStage(lifecycle.state)
  await cacheSet(cacheKey, stage, CACHE_TTL_SECONDS)
  return stage
}

export async function invalidateFunnelStage(userId: string) {
  await cacheDel(`funnel:${userId}`)
}
