import { prisma } from '../../db/client.js'

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