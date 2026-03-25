import {
  NotificationChannel,
  NotificationStatus,
  type Notification,
  type NotificationType,
} from '@starway/db/prisma-client'

import { notificationRepository } from '../repositories/NotificationRepository.js'

export interface CreateNotificationRecordInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  templateKey?: string
  channel?: NotificationChannel
  status?: NotificationStatus
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

  async listForUser(userId: string, limit?: number): Promise<Notification[]> {
    return notificationRepository.listForUser(userId, limit)
  }
}

export const notificationRecordService = new NotificationRecordService()
