import { prisma } from '../src/db/client.ts'

const HOPE_EMAIL = 'parfum.kiev.ua@gmail.com'
const OLD_OWNER_EXPERT_ID = '583f6a6e-c41a-4f53-8ef3-fcb08d7b5560'

async function main() {
  const hope = await prisma.user.findFirst({
    where: { email: HOPE_EMAIL },
    select: { id: true, email: true, role: true, expertId: true },
  })

  if (!hope?.expertId) {
    throw new Error(`Hope user missing expertId: ${HOPE_EMAIL}`)
  }

  const candidateIds = (
    await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: 'USER',
        expertId: OLD_OWNER_EXPERT_ID,
      },
      select: { id: true, email: true },
    })
  ).map((row) => row.id)

  const sampleBefore = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, email: true, expertId: true },
    take: 15,
  })

  if (candidateIds.length > 0) {
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id: { in: candidateIds } },
        data: { expertId: hope.expertId },
      }),
      prisma.subscription.updateMany({
        where: { userId: { in: candidateIds } },
        data: { expertId: hope.expertId },
      }),
      prisma.paymentLog.updateMany({
        where: { userId: { in: candidateIds } },
        data: { expertId: hope.expertId },
      }),
      prisma.purchaseHistory.updateMany({
        where: { userId: { in: candidateIds } },
        data: { expertId: hope.expertId },
      }),
    ])
  }

  const ownerUsersCount = await prisma.user.count({
    where: {
      deletedAt: null,
      role: 'USER',
      expertId: hope.expertId,
    },
  })

  const teach = await prisma.user.findFirst({
    where: { email: 'teachinform3@gmail.com' },
    select: {
      id: true,
      email: true,
      expertId: true,
      trialEndsAt: true,
      _count: {
        select: {
          dailyEntries: true,
          streaks: true,
          funnelLeads: true,
        },
      },
    },
  })

  console.log(JSON.stringify({
    hope,
    movedUsers: candidateIds.length,
    ownerUsersCount,
    sampleBefore,
    teachinform3: teach,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
