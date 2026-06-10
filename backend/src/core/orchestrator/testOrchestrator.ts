import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../services/notifications/NotificationService.js'
import { prisma } from '../../db/client.js'

import type { Prisma } from '@starway/db/prisma-client'

export class TestOrchestrator {
  async recordTestStart(userId: string, startedAt = new Date()): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lifecycleState: 'TEST_IN_PROGRESS',
        testStartedAt: startedAt,
      },
    })
  }

  async onTestCompleted(
    userId: string,
    resultType: string | null,
    email?: string | null,
    options: { startedAt?: Date | null } = {},
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lifecycleState: 'TEST_DONE',
        testStartedAt: options.startedAt ?? undefined,
        testCompletedAt: new Date(),
        testResultType: resultType ?? undefined,
        email: email ?? undefined,
        funnelStage: 'LEAD',
      },
    })
  }

  async scheduleDojimFollowups(
    userId: string,
    payload: Prisma.JsonObject = {},
  ): Promise<number> {
    const result = await notificationService.scheduleDojimSeries(userId, {
      ...payload,
      lifecycle_stage: 'S3_TEST_RESULT',
    } as Prisma.JsonObject)

    return result.jobsCount
  }

  async canSendAdvertising(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lifecycleState: true,
      },
    })

    if (!user || user.lifecycleState !== 'TEST_DONE') {
      return false
    }

    const pendingJobs = await prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        payload: true,
      },
      take: 1000,
    }).catch(() => [])
    const blockedJob = pendingJobs.find((job) => {
      const payload = job.payload as Prisma.JsonObject | null
      if (!payload || Array.isArray(payload)) return false
      const jobUserId = typeof payload.userId === 'string' ? payload.userId : null
      const event = typeof payload.event === 'string' ? payload.event : null
      return jobUserId === userId && event === NotificationEvent.AB_TEST_FOLLOWUP
    })

    return !blockedJob
  }

  async onDojimSequenceComplete(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lifecycleState: 'OFFER_SHOWN',
        offerShownAt: new Date(),
      },
    })
  }
}

export const testOrchestrator = new TestOrchestrator()
