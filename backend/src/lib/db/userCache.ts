import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { cacheDel, cacheGet, cacheSet } from '../cache/index.js'

const USER_CACHE_TTL_SECONDS = 300

type CachedUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    firstName: true
    lastName: true
    expertId: true
    role: true
    telegramUserId: true
    telegramChatId: true
    telegramUserName: true
    telegramEnabled: true
    lastLoginAt: true
    createdAt: true
    updatedAt: true
    settings: true
    subscriptions: {
      orderBy: { createdAt: 'desc' }
      take: 1
    }
  }
}> | null

export async function getCachedUser(userId: string): Promise<CachedUser> {
  const key = `user:${userId}`
  const cached = await cacheGet<CachedUser>(key)
  if (cached !== null) return cached

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      expertId: true,
      role: true,
      telegramUserId: true,
      telegramChatId: true,
      telegramUserName: true,
      telegramEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      settings: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  await cacheSet(key, user, USER_CACHE_TTL_SECONDS)
  return user
}

export async function getCachedAuthUser(userId: string) {
  const key = `auth-user:${userId}`
  const cached = await cacheGet<{
    id: string
    role: string
    activeRole: string
    email: string | null
    expertId: string | null
  } | null>(key)
  if (cached !== null) return cached

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, activeRole: true, email: true, expertId: true },
  })

  await cacheSet(key, user, USER_CACHE_TTL_SECONDS)
  return user
}

export async function invalidateUserCache(userId: string) {
  await cacheDel(`user:${userId}`)
  await cacheDel(`auth-user:${userId}`)
  await cacheDel(`auth:full-user:${userId}`)
}
