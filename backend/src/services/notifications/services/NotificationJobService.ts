import { type NotificationJob, type NotificationType } from '@starway/db/prisma-client'

import { notificationJobRepository } from '../repositories/NotificationJobRepository.js'

export class NotificationJobService {
  async enqueue(type: NotificationType, payload: Record<string, unknown>, runAt: Date): Promise<NotificationJob> {
    return notificationJobRepository.create({
      type,
      payload,
      runAt,
    })
  }

  async getDuePending(limit?: number): Promise<NotificationJob[]> {
    return notificationJobRepository.findDuePending(limit)
  }

  async markProcessing(id: string): Promise<NotificationJob> {
    return notificationJobRepository.updateStatus(id, 'PROCESSING')
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
}

export const notificationJobService = new NotificationJobService()
