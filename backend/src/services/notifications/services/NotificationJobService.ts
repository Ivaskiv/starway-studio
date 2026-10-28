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

  async enqueueOnce(
    type: NotificationType,
    payload: Record<string, unknown>,
    runAt: Date,
    idempotencyKey: string,
  ): Promise<NotificationJob> {
    return notificationJobRepository.createOnce({ type, payload, runAt }, idempotencyKey)
  }

  async claimDuePending(limit?: number): Promise<NotificationJob[]> {
    return notificationJobRepository.claimDuePending(limit)
  }

  async claimDuePendingById(jobId: string): Promise<NotificationJob | null> {
    return notificationJobRepository.claimDuePendingById(jobId)
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

  async cancelZoomCommercePaymentReminder(requestId: string, keepIdempotencyKey?: string): Promise<number> {
    return notificationJobRepository.cancelZoomCommercePaymentReminder(requestId, keepIdempotencyKey)
  }
}

export const notificationJobService = new NotificationJobService()
