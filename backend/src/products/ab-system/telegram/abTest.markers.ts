import type { Prisma } from '@starway/db/prisma-client'

import {
  buildAbTestProgressPatch,
  type AbTestProgress,
  type AbTestStageId,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import { activateProductSubscription } from '../../../modules/subscriptions/payments/paymentActivation.service.js'
import { resolveNotificationType } from '../../../services/notifications/domain/notificationPolicy.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { loadAbTestProgress, saveAbTestProgress } from './abTest.progress.js'

function readAbTestPaymentSuccessAt(settings: unknown): Date | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null
  }

  const ui = (settings as Record<string, unknown>).ui
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) {
    return null
  }

  const abTest = (ui as Record<string, unknown>).abTest
  if (!abTest || typeof abTest !== 'object' || Array.isArray(abTest)) {
    return null
  }

  const rawPaidAt = (abTest as Record<string, unknown>).payment_success_at
  if (typeof rawPaidAt !== 'string' || !rawPaidAt.trim()) {
    return null
  }

  const paidAt = new Date(rawPaidAt)
  return Number.isNaN(paidAt.getTime()) ? null : paidAt
}

function readFocusPlanIdFromOrderReference(
  orderReference: string | null | undefined,
): 'welcome_test' | '1month' | '3month' | null {
  const match = String(orderReference ?? '').trim().match(
    /^focus_(welcome_test|1month|3month)_[0-9a-f-]{36}_\d+$/i,
  )

  if (!match) return null

  return match[1] as 'welcome_test' | '1month' | '3month'
}

async function finalizeAbTestPaymentSuccess(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const applyWithClient = async (client: Prisma.TransactionClient) => {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        settings: true,
      },
    })
    const paidAt = readAbTestPaymentSuccessAt(user?.settings) ?? new Date()
    const expiresAt = new Date(paidAt.getTime())
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    const latestFocusCheckout = await client.checkoutSession.findFirst({
      where: {
        userId,
        orderReference: { startsWith: 'focus_' },
      },
      orderBy: { createdAt: 'desc' },
      select: { orderReference: true },
    })
    const planId =
      readFocusPlanIdFromOrderReference(latestFocusCheckout?.orderReference) ?? '1month'

    await activateProductSubscription({
      userId,
      productCode: 'focus',
      source: 'webhook_fallback',
      amount: 1,
      planMonths: planId === '3month' ? 3 : 1,
      catalogPlanId: planId,
      paidAtOverride: paidAt,
      expiresAtOverride: expiresAt,
      tx: client,
      autoBookGroupSessions: false,
      manualNote: 'legacy_ab_test_payment_success_sync',
    })
    await client.user.update({
      where: { id: userId },
      data: { lifecycleState: 'FOCUS_PAID' },
    })
    await client.notificationJob.deleteMany({
      where: {
        type: resolveNotificationType(NotificationEvent.AB_TEST_FOLLOWUP),
        status: 'PENDING',
        payload: {
          path: ['userId'],
          equals: userId,
        },
      },
    })
  }

  if (tx) {
    await applyWithClient(tx)
    return
  }

  await prisma.$transaction(async (innerTx) => {
    await applyWithClient(innerTx)
  })
}

export async function markAbTestPaymentSuccess(
  userId: string,
  tx?: Prisma.TransactionClient // fix with kimi 2026-05-28: optional tx for atomic post-payment orchestration
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  if (current.payment_success_at) {
    await finalizeAbTestPaymentSuccess(userId, tx)
    return
  }

  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      payment_success_at: new Date().toISOString(),
      stage: current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage,
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_PAYMENT_SUCCESS',
    state: current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage,
    payload: { stage: current.stage } satisfies Prisma.JsonObject,
  })
  await finalizeAbTestPaymentSuccess(userId, tx)
}

export async function markAbTestZoomRegistered(
  userId: string,
  sessionId: string,
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  const nextStage: AbTestStageId =
    current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      zoom_registered_at:
        current.zoom_registered_at ?? new Date().toISOString(),
      stage: nextStage,
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_ZOOM_REGISTERED',
    state: nextStage,
    payload: {
      session_id: sessionId,
      stage: nextStage,
    } satisfies Prisma.JsonObject,
  })
}

export async function markAbTestZoomAttended(
  userId: string,
  sessionId: string,
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      zoom_attended_at: current.zoom_attended_at ?? new Date().toISOString(),
      stage: 'S7_PLATFORM_INVITE',
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_ZOOM_ATTENDED',
    state: 'S7_PLATFORM_INVITE',
    payload: {
      session_id: sessionId,
      stage: 'S7_PLATFORM_INVITE',
    } satisfies Prisma.JsonObject,
  })
}

export async function markAbTestPlatformReady(userId: string): Promise<void> {
  const current = await loadAbTestProgress(userId)
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      platform_ready_at: current.platform_ready_at ?? new Date().toISOString(),
      stage: 'S8_PLATFORM_READY',
      status: 'completed',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_PLATFORM_READY',
    state: 'S8_PLATFORM_READY',
    payload: {
      stage: 'S8_PLATFORM_READY',
    } satisfies Prisma.JsonObject,
  })
}

export async function getAbTestProgress(
  userId: string,
): Promise<AbTestProgress> {
  return loadAbTestProgress(userId)
}

export async function validateAbTestRuntime(userId: string): Promise<boolean> {
  const progress = await loadAbTestProgress(userId)
  return progress.version === 1 && Boolean(progress.stage)
}
