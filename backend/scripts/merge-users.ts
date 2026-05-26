// FIX 2025-05-25 B: one-time user merge script
import { prisma } from '../src/db/client.js'
import { attachEmailToUser } from '../src/modules/user/identity.service.js'

const GUEST_ID = '86bd466a-879b-4c32-8891-b029816547dd'
const MAIN_ID = 'b05f177d-7429-4105-9ca9-7a31caf7cda8'

async function main() {
  const [guest, mainUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: GUEST_ID },
      select: {
        id: true,
        email: true,
        telegramUserId: true,
        settings: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: MAIN_ID },
      select: {
        id: true,
        email: true,
        telegramUserId: true,
        role: true,
        settings: true,
      },
    }),
  ])

  if (!guest || !mainUser) {
    throw new Error('One of users was not found')
  }

  console.log('[MERGE_USERS] before', {
    guestId: guest.id,
    guestEmail: guest.email,
    guestTelegramUserId: guest.telegramUserId,
    mainId: mainUser.id,
    mainEmail: mainUser.email,
    mainTelegramUserId: mainUser.telegramUserId,
    mainRole: mainUser.role,
  })

  const mergeResult = await attachEmailToUser(guest.id, mainUser.email)

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { id: GUEST_ID },
        { id: MAIN_ID },
        { telegramUserId: '630111093' },
        { email: 'viraivaskiv@gmail.com' },
      ],
    },
    select: {
      id: true,
      email: true,
      telegramUserId: true,
      role: true,
      createdAt: true,
      settings: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log('[MERGE_USERS] result', mergeResult)
  console.log('[MERGE_USERS] after_rows', JSON.stringify(rows, null, 2))
}

main()
  .catch((error) => {
    console.error('[MERGE_USERS] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

