import { prisma } from '../../db/client.js'
import { buildUserProfile } from './engine.js'

// повертає продукти з високим рейтингом
export async function getTopProducts(limit = 5) {

  const products = await prisma.productScore.findMany({
    orderBy: { score: 'desc' },
    take: limit,
    include: {
      product: true,
    },
  })

  return products.map(p => ({
    productId: p.productId,
    name: p.product.name,
    score: p.score,
  }))
}

function matchesName(name: string, needle: string): boolean {
  return name.toLowerCase().includes(needle.toLowerCase())
}

async function findProductByKeyword(keyword: string) {
  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: keyword,
        mode: 'insensitive',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      name: true,
    },
  })

  return products[0] ?? null
}

export async function suggestNextProduct(userId: string) {
  const profile = await buildUserProfile(userId)
  const patternDays = profile.stateHistory.filter(item => item.behaviorPattern === profile.behaviorPattern).length
  const stableDays = profile.dailyEntries.filter(entry => entry.state === 'STABILITY').length
  const trialExpired = Boolean(
    profile.subscription?.status === 'TRIAL' &&
    profile.subscription.trialEndsAt &&
    profile.subscription.trialEndsAt.getTime() <= Date.now(),
  )

  if (patternDays >= 5 && patternDays <= 21) {
    const product = await findProductByKeyword('mini')
    return product
      ? { productId: product.id, name: product.name, reason: 'pattern_5_21_days' }
      : null
  }

  if (stableDays >= 30) {
    const product = await findProductByKeyword('mentorship') ?? await findProductByKeyword('ментор')
    return product
      ? { productId: product.id, name: product.name, reason: 'stability_30_plus_days' }
      : null
  }

  if (trialExpired && profile.highEngagement) {
    const product = await prisma.product.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
      },
    })

    return product
      ? { productId: product.id, name: product.name, reason: 'trial_expired_high_engagement' }
      : null
  }

  return null
}
