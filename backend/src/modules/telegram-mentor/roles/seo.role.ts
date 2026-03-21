import { prisma } from '../../../db/client.js'
import { generateSEO } from '../../producer/service.js'
import type { RoleConfig, RoleResult } from './base.role.js'

export interface SeoRoleResult {
  title: string
  description: string
  keywords: string[]
  h1: string
}

export const seoRoleConfig: RoleConfig = {
  systemPrompt: 'Ти SEO strategist. Повертаєш конкретні SEO рекомендації українською.',
  temperature: 0.3,
  maxTokens: 500,
}

export async function runSeoRole(userId: string): Promise<SeoRoleResult> {
  const product = await prisma.product.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (!product) {
    throw new Error('producer_product_not_found')
  }

  const result = await generateSEO({
    productId: product.id,
    pageType: 'product',
  })

  return {
    title: typeof result.title === 'string' ? result.title : '',
    description: typeof result.description === 'string' ? result.description : '',
    keywords: Array.isArray(result.keywords)
      ? result.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
      : [],
    h1: typeof result.h1 === 'string' ? result.h1 : '',
  }
}

export async function runSeoRoleResult(userId: string): Promise<RoleResult> {
  const result = await runSeoRole(userId)
  const keywords = result.keywords.length > 0 ? result.keywords.join(', ') : '—'

  return {
    reply: [
      'SEO план:',
      `Title: ${result.title || '—'}`,
      `Description: ${result.description || '—'}`,
      `H1: ${result.h1 || '—'}`,
      `Keywords: ${keywords}`,
    ].join('\n'),
    action: 'NONE',
  }
}
