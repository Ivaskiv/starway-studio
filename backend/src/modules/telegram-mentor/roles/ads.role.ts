import { prisma } from '../../../db/client.js'
import { generateTargeting } from '../../producer/service.js'
import type { RoleConfig, RoleResult } from './base.role.js'

export interface AdsRoleResult {
  primaryAudience: string
  painPoints: string[]
  hooks: string[]
  platforms: string[]
}

export const adsRoleConfig: RoleConfig = {
  systemPrompt: 'Ти ads manager. Повертаєш конкретний таргетинг і copy-вектори українською.',
  temperature: 0.3,
  maxTokens: 500,
}

export async function runAdsRole(userId: string): Promise<AdsRoleResult> {
  const product = await prisma.product.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (!product) {
    throw new Error('producer_product_not_found')
  }

  const result = await generateTargeting(product.id)

  return {
    primaryAudience: typeof result.primaryAudience === 'string' ? result.primaryAudience : '',
    painPoints: Array.isArray(result.painPoints)
      ? result.painPoints.filter((item): item is string => typeof item === 'string')
      : [],
    hooks: Array.isArray(result.hooks)
      ? result.hooks.filter((item): item is string => typeof item === 'string')
      : [],
    platforms: Array.isArray(result.platforms)
      ? result.platforms.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

export async function runAdsRoleResult(userId: string): Promise<RoleResult> {
  const result = await runAdsRole(userId)
  const painPoints = result.painPoints.length > 0 ? result.painPoints.join(', ') : '—'
  const hooks = result.hooks.length > 0 ? result.hooks.join(', ') : '—'
  const platforms = result.platforms.length > 0 ? result.platforms.join(', ') : '—'

  return {
    reply: [
      'Ads стратегія:',
      `Primary audience: ${result.primaryAudience || '—'}`,
      `Pain points: ${painPoints}`,
      `Hooks: ${hooks}`,
      `Platforms: ${platforms}`,
    ].join('\n'),
    action: 'NONE',
  }
}
