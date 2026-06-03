import type { Prisma, Role } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { mergeUsersById } from './identity.service.js'
import { UserCreationService, type UserCreationSource } from './userCreation.service.js'

export interface ResolveIdentity {
  telegramId?: string
  chatId?: string
  email?: string
  telegramUserName?: string
}

export interface ResolveResult {
  user: { id: string; email: string; role: string }
  created: boolean
  linked: boolean
  conflict: boolean
}

type ResolveOptions = {
  source: UserCreationSource
  expertId?: string | null
  requestId?: string | null
  name?: string | null
  passwordHash?: string | null
  role?: Role
  createData?: Partial<Prisma.UserUncheckedCreateInput>
}

type ResolveCandidate = {
  id: string
  email: string
  role: string
  telegramUserId: string | null
  telegramChatId: string | null
  telegramUserName: string | null
  telegramLinkedAt: Date | null
  createdAt: Date
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = String(email ?? '').trim().toLowerCase()
  return normalized || null
}

function normalizeTelegramValue(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.endsWith('@placeholder.starway.app') || email.startsWith('telegram-guest-') || email.startsWith('tg.')
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = normalizeTelegramValue(value)
    if (normalized) return normalized
  }
  return null
}

async function logConflict(input: {
  candidateIds: string[]
  telegramId: string | null
  chatId: string | null
  email: string | null
  telegramUserName: string | null
}) {
  const winnerId = input.candidateIds[0]
  if (!winnerId) return

  await prisma.contentItem.create({
    data: {
      userId: winnerId,
      type: 'ops_alert',
      topic: `identity-conflict:${Date.now()}`,
      content: JSON.stringify({
        candidateIds: input.candidateIds,
        telegramId: input.telegramId,
        chatId: input.chatId,
        email: input.email,
        telegramUserName: input.telegramUserName,
        timestamp: new Date().toISOString(),
      }),
      platform: 'ops',
      status: 'draft',
    },
  }).catch(() => undefined)
}

export async function resolveOrCreateUser(
  identity: ResolveIdentity,
  options: ResolveOptions,
): Promise<ResolveResult> {
  const telegramId = normalizeTelegramValue(identity.telegramId)
  const chatId = normalizeTelegramValue(identity.chatId)
  const email = normalizeEmail(identity.email)
  const telegramUserName = normalizeTelegramValue(identity.telegramUserName)

  const candidates = new Map<string, ResolveCandidate>()

  if (telegramId) {
    const byTelegram = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId: telegramId },
          { telegramChatId: telegramId },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUserName: true,
        telegramLinkedAt: true,
        createdAt: true,
      },
    })
    if (byTelegram) candidates.set(byTelegram.id, byTelegram)
  }

  if (chatId) {
    const linked = await prisma.telegramLink.findFirst({
      where: { chatId, isActive: true },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            telegramUserId: true,
            telegramChatId: true,
            telegramUserName: true,
            telegramLinkedAt: true,
            createdAt: true,
          },
        },
      },
    })
    if (linked?.user) candidates.set(linked.user.id, linked.user)
  }

  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUserName: true,
        telegramLinkedAt: true,
        createdAt: true,
      },
    })
    if (byEmail) candidates.set(byEmail.id, byEmail)
  }

  if (telegramUserName) {
    const byUsername = await prisma.user.findMany({
      where: { telegramUserName },
      take: 2,
      select: {
        id: true,
        email: true,
        role: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUserName: true,
        telegramLinkedAt: true,
        createdAt: true,
      },
    })
    for (const candidate of byUsername) {
      candidates.set(candidate.id, candidate)
    }
  }

  if (candidates.size > 1) {
    const sortedCandidates = [...candidates.values()].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    const winner = sortedCandidates[0]

    const mergeReasons = email ? 'email_attach' : 'telegram_identity'
    let mergedAny = false
    for (const source of sortedCandidates.slice(1)) {
      try {
        const merged = await mergeUsersById(source.id, winner.id, {
          normalizedEmail: email ?? undefined,
          reason: mergeReasons,
        })
        mergedAny = mergedAny || merged.merged
      } catch (error) {
        await logConflict({
          candidateIds: Array.from(candidates.keys()),
          telegramId,
          chatId,
          email,
          telegramUserName,
        })
        return {
          user: winner,
          created: false,
          linked: mergedAny,
          conflict: true,
        }
      }
    }

    return {
      user: winner ?? { id: Array.from(candidates.keys())[0] ?? '', email: email ?? '', role: 'USER', telegramUserId: null, telegramChatId: null, telegramUserName: null, telegramLinkedAt: null, createdAt: new Date(0) },
      created: false,
      linked: mergedAny,
      conflict: false,
    }
  }

  if (candidates.size === 1) {
    const found = candidates.values().next().value as {
      id: string
      email: string
      role: string
      telegramUserId: string | null
      telegramChatId: string | null
      telegramUserName: string | null
      telegramLinkedAt: Date | null
    }

    const updates: Prisma.UserUpdateInput = {}
    let linked = false

    if (telegramId && found.telegramUserId && found.telegramUserId !== telegramId) {
      await logConflict({
        candidateIds: [found.id],
        telegramId,
        chatId,
        email,
        telegramUserName,
      })
      return {
        user: found,
        created: false,
        linked: false,
        conflict: true,
      }
    }

    if (chatId && found.telegramChatId && found.telegramChatId !== chatId) {
      await logConflict({
        candidateIds: [found.id],
        telegramId,
        chatId,
        email,
        telegramUserName,
      })
      return {
        user: found,
        created: false,
        linked: false,
        conflict: true,
      }
    }

    if (telegramUserName && found.telegramUserName && found.telegramUserName !== telegramUserName) {
      await logConflict({
        candidateIds: [found.id],
        telegramId,
        chatId,
        email,
        telegramUserName,
      })
      return {
        user: found,
        created: false,
        linked: false,
        conflict: true,
      }
    }

    if (email && email !== found.email && isPlaceholderEmail(found.email)) {
      const emailOwner = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }).catch(() => null)

      if (emailOwner && emailOwner.id !== found.id) {
        await logConflict({
          candidateIds: [found.id, emailOwner.id],
          telegramId,
          chatId,
          email,
          telegramUserName,
        })
        return {
          user: found,
          created: false,
          linked: false,
          conflict: true,
        }
      }

      updates.email = email
      linked = true
    }

    const nextTelegramUserId = telegramId && !found.telegramUserId ? telegramId : null
    const nextTelegramChatId = firstNonEmpty(chatId, telegramId)
    const nextTelegramUserName = telegramUserName && !found.telegramUserName ? telegramUserName : null

    if (nextTelegramUserId) {
      updates.telegramUserId = nextTelegramUserId
      linked = true
    }

    if (nextTelegramChatId && !found.telegramChatId) {
      updates.telegramChatId = nextTelegramChatId
      linked = true
    }

    if (nextTelegramUserName) {
      updates.telegramUserName = nextTelegramUserName
      linked = true
    }

    if ((nextTelegramUserId || nextTelegramChatId) && !found.telegramLinkedAt) {
      updates.telegramLinkedAt = new Date()
      linked = true
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: found.id },
        data: updates,
      }).catch(() => undefined)
    }

    return {
      user: found,
      created: false,
      linked,
      conflict: false,
    }
  }

  if (!email) {
    throw new Error('EMAIL_REQUIRED_FOR_USER_CREATION')
  }

  const created = await UserCreationService.createUser({
    source: options.source,
    requestId: options.requestId ?? null,
    data: {
      ...(options.createData ?? {}),
      email,
      firstName: options.name ?? options.createData?.firstName ?? null,
      passwordHash: options.passwordHash ?? options.createData?.passwordHash ?? null,
      role: options.role ?? options.createData?.role ?? 'USER',
      expertId: options.expertId ?? options.createData?.expertId ?? null,
      telegramUserId: telegramId ?? options.createData?.telegramUserId ?? null,
      telegramChatId: chatId ?? telegramId ?? options.createData?.telegramChatId ?? null,
      telegramUserName: telegramUserName ?? options.createData?.telegramUserName ?? null,
    },
  })

  const newUser = await prisma.user.findUnique({
    where: { id: created.id },
    select: { id: true, email: true, role: true },
  })

  return {
    user: newUser ?? { id: created.id, email, role: String(options.role ?? 'USER') },
    created: true,
    linked: false,
    conflict: false,
  }
}
