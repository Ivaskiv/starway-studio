import {
  type NotificationJobStatus,
  type NotificationType,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'

export interface CreateNotificationJobInput {
  type: NotificationType
  payload?: Record<string, unknown>
  runAt: Date
}

export class NotificationJobRepository {
  async create(input: CreateNotificationJobInput) {
    return prisma.notificationJob.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.JsonObject,
        runAt: input.runAt,
      },
    })
  }

  async findDuePending(limit = 100) {
    return prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: 'asc' },
      take: limit,
    })
  }

  async updateStatus(id: string, status: NotificationJobStatus, lastError?: string | null) {
    return prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        lastError: lastError ?? null,
      },
    })
  }

  async incrementAttempts(id: string, lastError?: string | null) {
    return prisma.notificationJob.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: lastError ?? null,
      },
    })
  }

  async reschedule(id: string, status: NotificationJobStatus, runAt: Date, attempts: number, lastError?: string | null) {
    return prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        runAt,
        attempts,
        lastError: lastError ?? null,
      },
    })
  }
}

export const notificationJobRepository = new NotificationJobRepository()
