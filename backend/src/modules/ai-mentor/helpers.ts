import { prisma } from '../../db/client.js'
import type { UserAIMentor } from '../../db/generated/prisma/index.js'

export async function ensureMentor(userId: string): Promise<UserAIMentor> {
  const existing = await prisma.userAIMentor.findFirst({ where: { userId } })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })
  if (!user?.expertId) throw new Error('User missing expertId')

  let mentor = await prisma.aIMentor.findFirst({
    where: { expertId: user.expertId },
    orderBy: { createdAt: 'desc' },
  })
  if (!mentor) {
    mentor = await prisma.aIMentor.create({
      data: {
        expertId: user.expertId,
        slug: `mentor-${userId}`,
        name: 'AI Mentor',
        generatorConfig: {},
        runtimeConfig: {},
      },
    })
  }

  return prisma.userAIMentor.create({
    data: {
      userId,
      aiMentorId: mentor.id,
      currentStep: 'ENTRY',
      context: {},
      state: {},
      meta: {},
    },
  })
}
