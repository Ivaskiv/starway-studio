import {
  NotificationChannel,
  NotificationStatus,
  type NotificationType,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'

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

export class NotificationRepository {
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({
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
  }

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
  }

  async updateStatus(id: string, status: NotificationStatus, failureReason?: string | null) {
    return prisma.notification.update({
      where: { id },
      data: {
        status,
        failureReason: failureReason ?? null,
        sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      },
    })
  }

  async listForUser(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
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
