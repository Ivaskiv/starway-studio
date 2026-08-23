import { randomBytes } from 'crypto'
import { prisma } from '../../../../db/client.js'
import { trackEvent } from '../../../events/service.js'
import { getUserAccessState } from '../../../subscriptions/payments/focus-access.js'
import { reconcileTelegramIdentityUsers } from '../../../user/identity/service.js'

type IdentityCandidate = {
  id: string
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  telegramLinkedAt: Date | null
  createdAt: Date
}

function scoreIdentityCandidate(
  candidate: IdentityCandidate,
  params: { chatId: string; telegramUserId: string; telegramUserName: string | null },
  hasCanonicalFocusAccess: boolean,
): number {
  let score = 0

  if (candidate.telegramChatId === params.chatId) score += 16
  if (candidate.telegramUserId === params.telegramUserId) score += 12
  if (params.telegramUserName && candidate.telegramUserName === params.telegramUserName) score += 6
  if (candidate.telegramLinkedAt) score += 3
  if (hasCanonicalFocusAccess) score += 40

  return score
}

async function chooseBestIdentityCandidate(
  candidates: IdentityCandidate[],
  params: { chatId: string; telegramUserId: string; telegramUserName: string | null },
): Promise<IdentityCandidate | null> {
  if (candidates.length === 0) return null

  const canonicalAccessByUserId = new Map(
    await Promise.all(candidates.map(async (candidate) => [
      candidate.id,
      await getUserAccessState(candidate.id)
        .then((accessState) => accessState.hasFocus)
        .catch(() => false),
    ] as const)),
  )

  return [...candidates].sort((left, right) => {
    const scoreDiff =
      scoreIdentityCandidate(right, params, canonicalAccessByUserId.get(right.id) === true)
      - scoreIdentityCandidate(left, params, canonicalAccessByUserId.get(left.id) === true)
    if (scoreDiff !== 0) return scoreDiff

    const leftHasFocus = canonicalAccessByUserId.get(left.id) === true
    const rightHasFocus = canonicalAccessByUserId.get(right.id) === true
    if (leftHasFocus !== rightHasFocus) {
      return Number(rightHasFocus) - Number(leftHasFocus)
    }

    const linkedAtDiff = (right.telegramLinkedAt?.getTime() ?? 0) - (left.telegramLinkedAt?.getTime() ?? 0)
    if (linkedAtDiff !== 0) return linkedAtDiff

    return right.createdAt.getTime() - left.createdAt.getTime()
  })[0] ?? null
}

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

  const identityCandidates = await prisma.user.findMany({
    where: {
      OR: [
        { telegramUserId },
        ...(telegramUserName ? [{ telegramUserName }] : []),
        { telegramChatId: chatId },
      ],
    },
    select: {
      id: true,
      telegramUserId: true,
      telegramUserName: true,
      telegramChatId: true,
      telegramLinkedAt: true,
      createdAt: true,
    },
  })
  const foundByTelegramIdentity = await chooseBestIdentityCandidate(identityCandidates, params)

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
      identityCandidateIds: identityCandidates.map((candidate) => candidate.id),
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
      // Always sync firstName from Telegram so interpolation works
      ...(firstName ? { firstName } : {}),
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
