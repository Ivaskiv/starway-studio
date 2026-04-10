import {
  NotificationChannel,
  NotificationStatus,
  type Notification,
  type NotificationType,
} from '@starway/db/prisma-client'

import {
  notificationRepository,
  type ListNotificationsForUserOptions,
} from '../repositories/NotificationRepository.js'

export interface CreateNotificationRecordInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  templateKey?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  sentAt?: Date | null
}

export class NotificationRecordService {
  async create(input: CreateNotificationRecordInput): Promise<Notification> {
    return notificationRepository.create(input)
  }

  async markAsRead(id: string): Promise<Notification> {
    return notificationRepository.markAsRead(id)
  }

  async markSent(id: string): Promise<Notification> {
    return notificationRepository.updateStatus(id, NotificationStatus.SENT)
  }

  async markFailed(id: string, error?: string | null): Promise<Notification> {
    return notificationRepository.updateStatus(id, NotificationStatus.FAILED, error)
  }

  async listForUser(userId: string, options?: ListNotificationsForUserOptions): Promise<Notification[]> {
    return notificationRepository.listForUser(userId, options)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(userId)
  }

  async deleteForUser(id: string, userId: string): Promise<Notification> {
    return notificationRepository.deleteForUser(id, userId)
  }
}

export const notificationRecordService = new NotificationRecordService()
