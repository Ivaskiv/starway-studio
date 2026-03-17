import { prisma } from '../../db/client.js'

// визначає наступну дію користувача
export async function computeAssistantState(userId: string) {

  const [wheel, morning, evening, products] = await Promise.all([
    prisma.wheelAssessment.findFirst({ where: { userId } }),
    prisma.dailyEntry.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.dailyEntry.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where: { ownerId: userId } }),
  ])

  return {
    wheelCompleted: !!wheel,
    morningCompleted: !!morning,
    eveningCompleted: !!evening,
    hasProduct: products > 0,
  }
}
