import { type NotificationJob, type NotificationType } from '@starway/db/prisma-client'

import { notificationJobRepository } from '../repositories/NotificationJobRepository.js'

export class NotificationJobService {
  async isQueueAvailable(): Promise<boolean> {
    return notificationJobRepository.isAvailable()
  }

  async enqueue(type: NotificationType, payload: Record<string, unknown>, runAt: Date): Promise<NotificationJob> {
    return notificationJobRepository.create({
      type,
      payload,
      runAt,
    })
  }

  async claimDuePending(limit?: number): Promise<NotificationJob[]> {
    return notificationJobRepository.claimDuePending(limit)
  }

  async markDone(id: string): Promise<NotificationJob> {
    return notificationJobRepository.updateStatus(id, 'DONE')
  }

  async markFailed(id: string, error?: string | null): Promise<NotificationJob> {
    await notificationJobRepository.incrementAttempts(id, error)
    return notificationJobRepository.updateStatus(id, 'FAILED', error)
  }

  async rescheduleRetry(id: string, attempts: number, runAt: Date, error?: string | null): Promise<NotificationJob> {
    return notificationJobRepository.reschedule(id, 'PENDING', runAt, attempts, error)
  }

  async cancelByUserAndTypes(userId: string, types: NotificationType[]): Promise<number> {
    const result = await notificationJobRepository.cancelByUserAndTypes(userId, types)
    return result.count
  }
}

export const notificationJobService = new NotificationJobService()
