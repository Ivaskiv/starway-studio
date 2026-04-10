import {
  NotificationChannel,
  NotificationStatus,
  type NotificationType,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { cacheDel, cacheDelPattern, cacheGet, cacheSet } from '../../../lib/cache/index.js'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  templateKey?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  sentAt?: Date | null
  readAt?: Date | null
}

export interface ListNotificationsForUserOptions {
  limit?: number
  unreadOnly?: boolean
  channels?: NotificationChannel[]
}

export class NotificationRepository {
  private listCacheKey(userId: string) {
    return `notifications:${userId}:list`
  }

  private unreadCacheKey(userId: string) {
    return `notifications:${userId}:unread`
  }

  private async invalidateUserCache(userId: string) {
    await Promise.all([
      cacheDel(this.listCacheKey(userId)),
      cacheDel(this.unreadCacheKey(userId)),
      cacheDelPattern(`notifications:${userId}:`),
    ])
  }

  async create(input: CreateNotificationInput) {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.JsonObject,
        payload: (input.data ?? {}) as Prisma.JsonObject,
        channel: input.channel ?? NotificationChannel.TELEGRAM,
        status: input.status ?? NotificationStatus.PENDING,
        sentAt: input.sentAt ?? null,
        readAt: input.readAt ?? null,
        templateKey: input.templateKey ?? input.type,
      },
    })
    await this.invalidateUserCache(input.userId)
    return created
  }

  async markAsRead(id: string) {
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
    await this.invalidateUserCache(updated.userId)
    return updated
  }

  async updateStatus(id: string, status: NotificationStatus, failureReason?: string | null) {
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status,
        failureReason: failureReason ?? null,
        sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      },
    })
    await this.invalidateUserCache(updated.userId)
    return updated
  }

  async listForUser(userId: string, options: ListNotificationsForUserOptions = {}) {
    const limit = options.limit ?? 50
    const unreadOnly = options.unreadOnly ?? false
    const channels = options.channels?.length ? options.channels : undefined
    const cacheKey = unreadOnly ? this.unreadCacheKey(userId) : this.listCacheKey(userId)
    const cached = await cacheGet<Awaited<ReturnType<typeof prisma.notification.findMany>>>(cacheKey)
    if (cached && !channels) {
      return cached.slice(0, limit)
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
        ...(channels ? { channel: { in: channels } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    if (!channels) {
      await cacheSet(cacheKey, notifications, 60)
    }
    return notifications
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })
    await this.invalidateUserCache(userId)
  }

  async deleteForUser(id: string, userId: string) {
    const deleted = await prisma.notification.delete({
      where: { id, userId },
    })
    await this.invalidateUserCache(userId)
    return deleted
  }

  async findByTypeForDay(userId: string, type: NotificationType, dayStart: Date, dayEnd: Date) {
    return prisma.notification.findFirst({
      where: {
        userId,
        type,
        createdAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const notificationRepository = new NotificationRepository()
