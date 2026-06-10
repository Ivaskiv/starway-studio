import { randomBytes } from 'crypto'
import { prisma } from '../../../db/client.js'
import { trackEvent } from '../../events/service.js'
import { reconcileTelegramIdentityUsers } from '../../user/identity.service.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserCreationSource } from '../../user/userCreation.service.js'

export async function findLinkedUserId(params: {
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
}) {
  const { chatId, telegramUserId, telegramUserName } = params

  const existingLink = await prisma.telegramLink.findFirst({
    where: { chatId, isActive: true },
    select: { userId: true },
  })

  const foundByTelegramIdentity = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        ...(telegramUserName ? [{ telegramUserName }] : []),
        { telegramChatId: chatId },
      ],
    },
    select: { id: true },
  })

  if (existingLink?.userId && foundByTelegramIdentity?.id && existingLink.userId !== foundByTelegramIdentity.id) {
    const reconciled = await reconcileTelegramIdentityUsers({
      linkedUserId: existingLink.userId,
      identityUserId: foundByTelegramIdentity.id,
      reason: 'link_identity_mismatch',
    })
    console.info('[USER_DEDUP]', {
      chatId,
      telegramUserId,
      linkedUserId: existingLink.userId,
      identityUserId: foundByTelegramIdentity.id,
      reconciledUserId: reconciled.userId,
      merged: reconciled.merged,
      source: 'link+identity_reconciled',
    })
    return reconciled.userId
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[telegram/linking] resolve user', {
      chatId,
      telegramUserId,
      telegramUserName,
      linkedUserId: existingLink?.userId ?? null,
      identityUserId: foundByTelegramIdentity?.id ?? null,
      source: existingLink?.userId
        ? existingLink.userId === foundByTelegramIdentity?.id
          ? 'link+identity'
          : 'link'
        : foundByTelegramIdentity?.id
          ? 'identity'
          : 'none',
    })
  }

  if (existingLink?.userId) {
    return existingLink.userId
  }

  if (foundByTelegramIdentity?.id) {
    return foundByTelegramIdentity.id
  }

  const fallbackResolved = await resolveOrCreateUser(
    {
      telegramId: chatId,
      chatId,
      telegramUserName: telegramUserName ?? undefined,
    },
    {
      source: UserCreationSource.TELEGRAM_START,
    },
  ).catch(() => null)

  if (fallbackResolved) {
    console.info('[telegram/linking] fallback resolved user', {
      chatId,
      telegramUserId,
      telegramUserName,
      linkedUserId: fallbackResolved.user.id,
      source: fallbackResolved.created ? 'created' : 'resolved',
    })
    return fallbackResolved.user.id
  }

  return null
}

export async function upsertTelegramBinding(params: {
  userId: string
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
  firstName: string | null
}) {
  const { userId, chatId, telegramUserId, telegramUserName, firstName } = params
  const code = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const [existingLink, existingUser] = await Promise.all([
    prisma.telegramLink.findFirst({
      where: { userId, chatId },
      select: { id: true, isActive: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramLinkedAt: true,
        telegramEnabled: true,
      },
    }),
  ])

  await prisma.telegramLink.deleteMany({
    where: {
      userId,
      NOT: { chatId },
    },
  })

  await prisma.telegramLink.upsert({
    where: { chatId },
    update: {
      userId,
      chatId,
      username: telegramUserName,
      firstName,
      isActive: true,
      code,
      expiresAt,
    },
    create: {
      userId,
      chatId,
      username: telegramUserName,
      firstName,
      isActive: true,
      code,
      expiresAt,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramEnabled: true,
      telegramChatId: chatId,
      telegramUserId,
      telegramUserName,
      telegramLinkedAt: existingUser?.telegramLinkedAt ?? new Date(),
    },
  })

  await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      telegramEnabled: true,
    },
    update: {
      telegramEnabled: true,
    },
  }).catch(() => undefined)

  const isNewConnection = !existingUser?.telegramLinkedAt || existingLink?.isActive === false
  if (!isNewConnection) {
    return
  }

  await trackEvent({
    userId,
    type: 'telegram_connected',
    source: 'telegram',
    state: 'linked',
    payload: {
      chatId,
      telegramUserId,
      wasEnabledBefore: existingUser?.telegramEnabled ?? true,
    },
  }).catch(() => undefined)

}
